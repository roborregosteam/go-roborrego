"use client";

import { useState } from "react";

import { api } from "~/trpc/react";

export function AdminReviewTab({ semesterId }: { semesterId: string | null }) {
  const utils = api.useUtils();

  const { data: pending, isLoading } = api.workPlan.getPendingCompletions.useQuery({
    semesterId: semesterId ?? undefined,
  });

  const reviewCompletion = api.workPlan.reviewCompletion.useMutation({
    onSuccess: () => utils.workPlan.getPendingCompletions.invalidate(),
  });

  // Per-row admin note state
  const [notes, setNotes] = useState<Record<string, string>>({});

  function setNote(id: string, value: string) {
    setNotes((prev) => ({ ...prev, [id]: value }));
  }

  if (isLoading) return <p className="text-sm text-gray-400">Loading submissions…</p>;

  if (!pending?.length) {
    return (
      <div className="text-center py-16 text-gray-400">
        <p className="text-4xl mb-3">✅</p>
        <p className="text-sm font-medium">No pending submissions</p>
        <p className="text-xs mt-1">All caught up!</p>
      </div>
    );
  }

  return (
    <div>
      <p className="text-sm text-gray-500 mb-4">
        {pending.length} submission{pending.length !== 1 ? "s" : ""} awaiting review
      </p>

      <div className="space-y-4">
        {pending.map((completion) => (
          <div
            key={completion.id}
            className="bg-white rounded-xl border border-gray-200 shadow-sm p-5"
          >
            {/* Member + activity header */}
            <div className="flex items-start justify-between gap-4 mb-3">
              <div className="flex items-center gap-3">
                {completion.user.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={completion.user.image}
                    alt={completion.user.name ?? ""}
                    className="w-9 h-9 rounded-full flex-shrink-0"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-blue-600 text-sm font-semibold">
                      {completion.user.name?.charAt(0) ?? "?"}
                    </span>
                  </div>
                )}
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    {completion.user.name}
                  </p>
                  <p className="text-xs text-gray-400">{completion.user.email}</p>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-semibold text-gray-800">
                  {completion.activity.name}
                </p>
                <p className="text-xs text-blue-600 font-medium">
                  {completion.activity.points} pts
                </p>
              </div>
            </div>

            {/* Submission note */}
            <div className="bg-gray-50 rounded-lg px-4 py-3 text-sm text-gray-700 mb-3 border border-gray-100">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                Member&apos;s note
              </p>
              {completion.note}
            </div>

            {/* Submitted date */}
            <p className="text-xs text-gray-400 mb-3">
              Submitted {new Date(completion.createdAt).toLocaleDateString()}
            </p>

            {/* Admin note + actions */}
            <div className="space-y-2">
              <input
                type="text"
                value={notes[completion.id] ?? ""}
                onChange={(e) => setNote(completion.id, e.target.value)}
                placeholder="Optional feedback note (shown to member if rejected)"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex gap-2">
                <button
                  onClick={() =>
                    reviewCompletion.mutate({
                      id: completion.id,
                      status: "APPROVED",
                      adminNote: notes[completion.id] || undefined,
                    })
                  }
                  disabled={reviewCompletion.isPending}
                  className="flex-1 text-sm py-2 rounded-lg bg-green-600 text-white font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
                >
                  Approve
                </button>
                <button
                  onClick={() =>
                    reviewCompletion.mutate({
                      id: completion.id,
                      status: "REJECTED",
                      adminNote: notes[completion.id] || undefined,
                    })
                  }
                  disabled={reviewCompletion.isPending}
                  className="flex-1 text-sm py-2 rounded-lg border border-red-200 text-red-600 font-medium hover:bg-red-50 disabled:opacity-50 transition-colors"
                >
                  Reject
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
