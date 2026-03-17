"use client";

import { useEffect, useRef, useState } from "react";

import { api, type RouterOutputs } from "~/trpc/react";

type Meeting = RouterOutputs["attendance"]["getMeetings"][0];

const CHECK_IN_OPEN_BEFORE_MS = 30 * 60 * 1000;

export function MeetingDetailModal({
  meeting,
  isMember,
  onClose,
}: {
  meeting: Meeting;
  isMember: boolean;
  onClose: () => void;
}) {
  const utils = api.useUtils();

  // ── Computed time state ──
  const now = new Date();
  const start = new Date(meeting.startTime);
  const end = new Date(start.getTime() + meeting.duration * 60 * 1000);
  const openAt = new Date(start.getTime() - CHECK_IN_OPEN_BEFORE_MS);
  const isOpen = now >= openAt && now <= end;
  const isPast = now > end;
  const isCheckedIn = !!meeting.myAttendance;
  const hasFeedback = !!meeting.myFeedback;

  // ── Check-in state ──
  const [code, setCode] = useState("");
  const [checkInError, setCheckInError] = useState("");

  const checkInByToken = api.attendance.checkInByToken.useMutation({
    onSuccess: () => {
      void utils.attendance.getMeetings.invalidate();
      setCode("");
      setCheckInError("");
    },
    onError: (e) => setCheckInError(e.message),
  });

  const selfCheckIn = api.attendance.selfCheckIn.useMutation({
    onSuccess: () => void utils.attendance.getMeetings.invalidate(),
    onError: (e) => setCheckInError(e.message),
  });

  // ── Notes state ──
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState(meeting.notes ?? "");
  const [notesSaved, setNotesSaved] = useState(false);

  const updateMeeting = api.attendance.updateMeeting.useMutation({
    onSuccess: () => void utils.attendance.getMeetings.invalidate(),
  });

  const updateNotes = api.attendance.updateNotes.useMutation({
    onSuccess: (updated) => {
      void utils.attendance.getMeetings.invalidate();
      setNotesValue(updated.notes ?? "");
      setEditingNotes(false);
      setNotesSaved(true);
      setTimeout(() => setNotesSaved(false), 2000);
    },
  });

  // ── Feedback state ──
  const [showFeedback, setShowFeedback] = useState(false);
  const [rating, setRating] = useState<number | null>(meeting.myFeedback?.rating ?? null);
  const [comment, setComment] = useState(meeting.myFeedback?.comment ?? "");
  const [isAnonymous, setIsAnonymous] = useState(meeting.myFeedback?.isAnonymous ?? false);

  const submitFeedback = api.attendance.submitFeedback.useMutation({
    onSuccess: () => {
      void utils.attendance.getMeetings.invalidate();
      setShowFeedback(false);
    },
  });

  // ── Close on Escape ──
  const backdropRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => { if (e.target === backdropRef.current) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between p-6 pb-4">
          <div className="flex-1 min-w-0 pr-4">
            <h2 className="text-lg font-bold text-gray-900">{meeting.title}</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {start.toLocaleDateString(undefined, {
                weekday: "long", month: "long", day: "numeric", year: "numeric",
              })}{" "}
              ·{" "}
              {start.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
              {" – "}
              {end.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
              {" "}({meeting.duration} min)
            </p>
            {meeting.project && (
              <span className="inline-block mt-1.5 text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded">
                {meeting.project.name}
              </span>
            )}
            {meeting.description && (
              <p className="text-sm text-gray-600 mt-2">{meeting.description}</p>
            )}
            {meeting.teamsJoinUrl && (
              <a
                href={meeting.teamsJoinUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-block mt-2 text-xs px-3 py-1.5 bg-[#6264a7] text-white rounded-lg hover:bg-[#4f5196] transition-colors"
              >
                Join Teams Meeting
              </a>
            )}
          </div>
          <button
            onClick={onClose}
            className="shrink-0 text-gray-400 hover:text-gray-600 text-xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="px-6 pb-6 space-y-5">
          {/* ── Attendance badge ── */}
          {isCheckedIn && (
            <div className={`inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border ${
              meeting.myAttendance?.isLate
                ? "bg-yellow-50 text-yellow-700 border-yellow-200"
                : "bg-green-50 text-green-700 border-green-200"
            }`}>
              ✓ {meeting.myAttendance?.isLate ? "Checked in (late)" : "Checked in"}
              {meeting.myAttendance?.checkInTime && (
                <span className="text-xs opacity-70">
                  {" "}at{" "}
                  {new Date(meeting.myAttendance.checkInTime).toLocaleTimeString(undefined, {
                    hour: "2-digit", minute: "2-digit",
                  })}
                </span>
              )}
            </div>
          )}

          {/* ── Check-in section ── */}
          {!isCheckedIn && isOpen && (
            <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 space-y-3">
              <p className="text-sm font-medium text-gray-700">Check in to this meeting</p>

              {/* Code input */}
              <div className="flex gap-2">
                <input
                  value={code}
                  onChange={(e) => { setCode(e.target.value); setCheckInError(""); }}
                  placeholder="Enter check-in code"
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={() => checkInByToken.mutate({ token: code.trim() })}
                  disabled={!code.trim() || checkInByToken.isPending}
                  className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {checkInByToken.isPending ? "…" : "Check In"}
                </button>
              </div>

              {/* Quick self-check-in for members */}
              {isMember && (
                <button
                  onClick={() => selfCheckIn.mutate({ meetingId: meeting.id })}
                  disabled={selfCheckIn.isPending}
                  className="text-xs text-gray-500 hover:text-blue-600 underline disabled:opacity-50"
                >
                  {selfCheckIn.isPending ? "Checking in…" : "Quick check-in (no code)"}
                </button>
              )}

              {checkInError && (
                <p className="text-xs text-red-500">{checkInError}</p>
              )}
            </div>
          )}

          {!isCheckedIn && !isOpen && !isPast && (
            <p className="text-sm text-gray-400">
              Check-in opens at{" "}
              {openAt.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
            </p>
          )}

          {/* ── Notes section ── */}
          {(meeting.notes ?? meeting.canEditNotes) && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-gray-700">Notes</h3>
                {meeting.canEditNotes && !editingNotes && (
                  <button
                    onClick={() => { setNotesValue(meeting.notes ?? ""); setEditingNotes(true); }}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    {meeting.notes ? "Edit" : "Add notes"}
                  </button>
                )}
                {notesSaved && (
                  <span className="text-xs text-green-600">Saved ✓</span>
                )}
              </div>

              {editingNotes ? (
                <div className="space-y-2">
                  <textarea
                    value={notesValue}
                    onChange={(e) => setNotesValue(e.target.value)}
                    rows={5}
                    placeholder="Meeting notes…"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() =>
                        updateNotes.mutate({ id: meeting.id, notes: notesValue || null })
                      }
                      disabled={updateNotes.isPending}
                      className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                      {updateNotes.isPending ? "Saving…" : "Save"}
                    </button>
                    <button
                      onClick={() => setEditingNotes(false)}
                      className="px-3 py-1.5 text-xs text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : meeting.notes ? (
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{meeting.notes}</p>
              ) : (
                <p className="text-sm text-gray-400 italic">No notes yet.</p>
              )}

              {/* Attendees-can-edit toggle — managers only */}
              {meeting.canManage && (
                <label className="flex items-center gap-2 mt-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={meeting.notesAllowAttendees}
                    onChange={(e) =>
                      updateMeeting.mutate({
                        id: meeting.id,
                        notesAllowAttendees: e.target.checked,
                      })
                    }
                    disabled={updateMeeting.isPending}
                    className="rounded border-gray-300"
                  />
                  <span className="text-xs text-gray-500">Allow attendees to edit notes</span>
                </label>
              )}
            </div>
          )}

          {/* ── Feedback section ── */}
          {isPast && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-gray-700">Feedback</h3>
                {hasFeedback && !showFeedback && (
                  <span className="text-xs px-2 py-0.5 rounded border bg-purple-50 text-purple-700 border-purple-200">
                    Submitted
                  </span>
                )}
              </div>

              {!showFeedback ? (
                <button
                  onClick={() => setShowFeedback(true)}
                  className="text-xs text-blue-600 hover:underline"
                >
                  {hasFeedback ? "Edit feedback" : "Leave feedback"}
                </button>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    submitFeedback.mutate({
                      meetingId: meeting.id,
                      rating: rating ?? undefined,
                      comment: comment.trim() || undefined,
                      isAnonymous,
                    });
                  }}
                  className="space-y-3"
                >
                  {/* Star rating */}
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(rating === star ? null : star)}
                        className={`text-xl transition-colors ${
                          rating !== null && star <= rating
                            ? "text-yellow-400"
                            : "text-gray-300 hover:text-yellow-300"
                        }`}
                      >
                        ★
                      </button>
                    ))}
                    {rating && <span className="text-xs text-gray-400 ml-1">{rating}/5</span>}
                  </div>

                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Any comments? (optional)"
                    rows={3}
                    maxLength={1000}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />

                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isAnonymous}
                      onChange={(e) => setIsAnonymous(e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm text-gray-700">Submit anonymously</span>
                  </label>

                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={submitFeedback.isPending || (!rating && !comment.trim())}
                      className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                      {submitFeedback.isPending ? "Saving…" : "Submit"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowFeedback(false)}
                      className="px-4 py-1.5 text-sm text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
