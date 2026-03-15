"use client";

import { useState } from "react";

import { api } from "~/trpc/react";

export function AdminReviewTab({ semesterId }: { semesterId: string | null }) {
  const utils = api.useUtils();

  const { data: pending, isLoading } =
    api.workPlan.getPendingCompletions.useQuery({
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

  if (isLoading)
    return <p className="text-sm text-gray-400">Loading submissions…</p>;

  if (!pending?.length) {
    return (
      <div className="py-16 text-center text-gray-400">
        <p className="mb-3 text-4xl">✅</p>
        <p className="text-sm font-medium">No pending submissions</p>
        <p className="mt-1 text-xs">All caught up!</p>
      </div>
    );
  }

  return (
    <div>
      <p className="mb-4 text-sm text-gray-500">
        {pending.length} submission{pending.length !== 1 ? "s" : ""} awaiting
        review
      </p>

      <div className="space-y-4">
        {pending.map((completion) => (
          <div
            key={completion.id}
            className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
          >
            {/* Member + activity header */}
            <div className="mb-3 flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                {completion.user.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={completion.user.image}
                    alt={completion.user.name ?? ""}
                    className="h-9 w-9 flex-shrink-0 rounded-full"
                  />
                ) : (
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-blue-100">
                    <span className="text-sm font-semibold text-blue-600">
                      {completion.user.name?.charAt(0) ?? "?"}
                    </span>
                  </div>
                )}
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    {completion.user.name}
                  </p>
                  <p className="text-xs text-gray-400">
                    {completion.user.email}
                  </p>
                </div>
              </div>
              <div className="flex-shrink-0 text-right">
                <p className="text-sm font-semibold text-gray-800">
                  {completion.activity.name}
                </p>
                <p className="text-xs font-medium text-blue-600">
                  {completion.activity.points} pts
                </p>
              </div>
            </div>

            {/* Submission note */}
            <div className="mb-3 rounded-lg border border-gray-100 bg-gray-50 px-4 py-3 text-sm text-gray-700">
              <p className="mb-1 text-xs font-semibold tracking-wider text-gray-400 uppercase">
                Member&apos;s note
              </p>
              {completion.note}
            </div>

            {/* Submitted date */}
            <p className="mb-3 text-xs text-gray-400">
              Submitted {new Date(completion.createdAt).toLocaleDateString()}
            </p>

            {/* Admin note + actions */}
            <div className="space-y-2">
              <input
                type="text"
                value={notes[completion.id] ?? ""}
                onChange={(e) => setNote(completion.id, e.target.value)}
                placeholder="Optional feedback note (shown to member if rejected)"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              <div className="flex gap-2">
                <button
                  onClick={() =>
                    reviewCompletion.mutate({
                      id: completion.id,
                      status: "APPROVED",
                      adminNote: notes[completion.id],
                    })
                  }
                  disabled={reviewCompletion.isPending}
                  className="flex-1 rounded-lg bg-green-600 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-50"
                >
                  Approve
                </button>
                <button
                  onClick={() =>
                    reviewCompletion.mutate({
                      id: completion.id,
                      status: "REJECTED",
                      adminNote: notes[completion.id],
                    })
                  }
                  disabled={reviewCompletion.isPending}
                  className="flex-1 rounded-lg border border-red-200 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
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
