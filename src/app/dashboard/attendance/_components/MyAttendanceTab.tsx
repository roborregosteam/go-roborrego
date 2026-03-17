"use client";

import { useState } from "react";

import { api, type RouterOutputs } from "~/trpc/react";

type Record = RouterOutputs["attendance"]["getMyAttendance"][0];

export function MyAttendanceTab() {
  const utils = api.useUtils();
  const { data: records, isPending } = api.attendance.getMyAttendance.useQuery();

  if (isPending) return <p className="text-sm text-gray-400">Loading...</p>;
  if (!records?.length)
    return (
      <p className="text-sm text-gray-400">No attendance records yet.</p>
    );

  const attended = records.length;
  const late = records.filter((r) => r.isLate).length;

  return (
    <div>
      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
        <StatCard label="Meetings Attended" value={attended} />
        <StatCard label="On Time" value={attended - late} />
        <StatCard label="Late Check-ins" value={late} />
      </div>

      {/* List */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto shadow-sm">
        <table className="w-full text-sm min-w-[560px]">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 text-left">
              <th className="px-4 py-3 font-medium text-gray-600">Meeting</th>
              <th className="px-4 py-3 font-medium text-gray-600">Date</th>
              <th className="px-4 py-3 font-medium text-gray-600">Status</th>
              <th className="px-4 py-3 font-medium text-gray-600">Method</th>
              <th className="px-4 py-3 font-medium text-gray-600">Feedback</th>
            </tr>
          </thead>
          <tbody>
            {records.map((r) => (
              <AttendanceRow
                key={r.id}
                record={r}
                onFeedbackSaved={() => void utils.attendance.getMyAttendance.invalidate()}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AttendanceRow({
  record: r,
  onFeedbackSaved,
}: {
  record: Record;
  onFeedbackSaved: () => void;
}) {
  const now = new Date();
  const end = new Date(new Date(r.meeting.startTime).getTime() + r.meeting.duration * 60 * 1000);
  const isPast = now > end;

  const existing = r.meeting.feedbacks[0] ?? null;
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState<number | null>(existing?.rating ?? null);
  const [comment, setComment] = useState(existing?.comment ?? "");
  const [isAnonymous, setIsAnonymous] = useState(existing?.isAnonymous ?? false);

  const submitFeedback = api.attendance.submitFeedback.useMutation({
    onSuccess: () => {
      onFeedbackSaved();
      setOpen(false);
    },
  });

  return (
    <>
      <tr className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
        <td className="px-4 py-3 text-gray-900 font-medium">{r.meeting.title}</td>
        <td className="px-4 py-3 text-gray-500">
          {new Date(r.meeting.startTime).toLocaleDateString(undefined, {
            weekday: "short",
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </td>
        <td className="px-4 py-3">
          <span
            className={`text-xs px-2 py-0.5 rounded border ${
              r.isLate
                ? "bg-yellow-50 text-yellow-700 border-yellow-200"
                : "bg-green-50 text-green-700 border-green-200"
            }`}
          >
            {r.isLate ? "Late" : "On time"}
          </span>
        </td>
        <td className="px-4 py-3 text-gray-400 capitalize">
          {r.method === "QR_CODE" ? "QR code" : r.method === "MANUAL" ? "Manual" : "Self"}
        </td>
        <td className="px-4 py-3">
          {isPast ? (
            existing && !open ? (
              <div className="flex items-center gap-2">
                <span className="text-xs px-2 py-0.5 rounded border bg-purple-50 text-purple-700 border-purple-200">
                  Submitted
                </span>
                <button
                  onClick={() => setOpen(true)}
                  className="text-xs text-blue-600 hover:underline"
                >
                  Edit
                </button>
              </div>
            ) : (
              <button
                onClick={() => setOpen((o) => !o)}
                className="text-xs text-blue-600 hover:underline"
              >
                {open ? "Cancel" : "Leave feedback"}
              </button>
            )
          ) : (
            <span className="text-xs text-gray-300">—</span>
          )}
        </td>
      </tr>

      {/* Inline feedback form */}
      {open && (
        <tr className="border-b border-gray-100 bg-gray-50">
          <td colSpan={5} className="px-4 py-4">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                submitFeedback.mutate({
                  meetingId: r.meeting.id,
                  rating: rating ?? undefined,
                  comment: comment.trim() || undefined,
                  isAnonymous,
                });
              }}
              className="space-y-3 max-w-md"
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
                rows={2}
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
                  onClick={() => setOpen(false)}
                  className="px-4 py-1.5 text-sm text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </td>
        </tr>
      )}
    </>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
      <p className="text-xs text-gray-500 font-medium mb-1">{label}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}
