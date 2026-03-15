"use client";

import { useState } from "react";

import { api, type RouterOutputs } from "~/trpc/react";

// Window in which self-check-in is allowed: 30 min before start to end of meeting
const CHECK_IN_OPEN_BEFORE_MS = 30 * 60 * 1000;

type Meeting = RouterOutputs["attendance"]["getMeetings"][0];

export function MeetingsTab({ isMember }: { isMember: boolean }) {
  const { data: meetings, isPending } = api.attendance.getMeetings.useQuery();

  if (isPending) return <p className="text-sm text-gray-400">Loading...</p>;
  if (!meetings?.length)
    return <p className="text-sm text-gray-400">No meetings yet.</p>;

  return (
    <div className="space-y-3">
      {meetings.map((meeting) => (
        <MeetingCard key={meeting.id} meeting={meeting} isMember={isMember} />
      ))}
    </div>
  );
}

function MeetingCard({
  meeting,
  isMember,
}: {
  meeting: Meeting;
  isMember: boolean;
}) {
  const [showFeedback, setShowFeedback] = useState(false);
  const utils = api.useUtils();

  const checkIn = api.attendance.selfCheckIn.useMutation({
    onSuccess: () => void utils.attendance.getMeetings.invalidate(),
  });

  const submitFeedback = api.attendance.submitFeedback.useMutation({
    onSuccess: () => {
      void utils.attendance.getMeetings.invalidate();
      setShowFeedback(false);
    },
  });

  const [rating, setRating] = useState<number | null>(
    meeting.myFeedback?.rating ?? null,
  );
  const [comment, setComment] = useState(meeting.myFeedback?.comment ?? "");
  const [isAnonymous, setIsAnonymous] = useState(
    meeting.myFeedback?.isAnonymous ?? false,
  );

  const now = new Date();
  const start = new Date(meeting.startTime);
  const end = new Date(start.getTime() + meeting.duration * 60 * 1000);
  const openAt = new Date(start.getTime() - CHECK_IN_OPEN_BEFORE_MS);
  const isOpen = now >= openAt && now <= end;
  const isPast = now > end;
  const isCheckedIn = !!meeting.myAttendance;
  const hasFeedback = !!meeting.myFeedback;

  function handleFeedbackSubmit(e: React.FormEvent) {
    e.preventDefault();
    submitFeedback.mutate({
      meetingId: meeting.id,
      rating: rating ?? undefined,
      comment: comment.trim() || undefined,
      isAnonymous,
    });
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Main row */}
      <div className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-gray-900">{meeting.title}</span>
            {isCheckedIn && (
              <span
                className={`text-xs px-2 py-0.5 rounded border ${
                  meeting.myAttendance?.isLate
                    ? "bg-yellow-50 text-yellow-700 border-yellow-200"
                    : "bg-green-50 text-green-700 border-green-200"
                }`}
              >
                {meeting.myAttendance?.isLate ? "Late" : "Present"}
              </span>
            )}
            {hasFeedback && (
              <span className="text-xs px-2 py-0.5 rounded border bg-purple-50 text-purple-700 border-purple-200">
                Feedback sent
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-0.5">
            {start.toLocaleDateString(undefined, {
              weekday: "short",
              month: "short",
              day: "numeric",
            })}{" "}
            ·{" "}
            {start.toLocaleTimeString(undefined, {
              hour: "2-digit",
              minute: "2-digit",
            })}{" "}
            ({meeting.duration} min) · {meeting._count.attendances} checked in
          </p>
          {meeting.description && (
            <p className="text-xs text-gray-400 mt-0.5 truncate">
              {meeting.description}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {/* Check-in action */}
          {isCheckedIn ? (
            <span className="text-xs text-gray-400">✓ Checked in</span>
          ) : isOpen && isMember ? (
            <button
              onClick={() => checkIn.mutate({ meetingId: meeting.id })}
              disabled={checkIn.isPending}
              className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {checkIn.isPending ? "Checking in…" : "Check In"}
            </button>
          ) : isPast ? (
            <span className="text-xs text-gray-400">Closed</span>
          ) : (
            <span className="text-xs text-gray-400">
              Opens{" "}
              {openAt.toLocaleTimeString(undefined, {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          )}

          {/* Feedback button — only for past meetings */}
          {isPast && (
            <button
              onClick={() => setShowFeedback((v) => !v)}
              className="px-3 py-1.5 text-xs rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
            >
              {hasFeedback ? "Edit Feedback" : "Leave Feedback"}
            </button>
          )}
        </div>
      </div>

      {/* Feedback form */}
      {showFeedback && (
        <form
          onSubmit={handleFeedbackSubmit}
          className="border-t border-gray-100 px-4 py-4 bg-gray-50 space-y-3"
        >
          <p className="text-xs font-medium text-gray-600">
            {hasFeedback ? "Update your feedback" : "Share your feedback"}{" "}
            <span className="font-normal text-gray-400">
              (rating and comment are optional)
            </span>
          </p>

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
            {rating && (
              <span className="text-xs text-gray-400 ml-1">{rating}/5</span>
            )}
          </div>

          {/* Comment */}
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Any comments about this meeting? (optional)"
            rows={3}
            maxLength={1000}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />

          {/* Anonymous toggle */}
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isAnonymous}
              onChange={(e) => setIsAnonymous(e.target.checked)}
              className="rounded border-gray-300"
            />
            <span className="text-sm text-gray-700">Submit anonymously</span>
            <span className="text-xs text-gray-400">
              (admins won&apos;t see your name)
            </span>
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
  );
}
