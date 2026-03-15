"use client";

import { useState } from "react";

import { api, type RouterOutputs } from "~/trpc/react";

type PendingEdit = RouterOutputs["admin"]["getPendingProfileEdits"][0];

const PROFILE_FIELDS = [
  { key: "name", label: "Name" },
  { key: "phone", label: "Phone" },
  { key: "bio", label: "Bio" },
  { key: "subTeam", label: "Sub-team" },
  { key: "githubUsername", label: "GitHub" },
  { key: "linkedinUrl", label: "LinkedIn" },
  { key: "graduationDate", label: "Graduation Date" },
] as const;

type FieldKey = (typeof PROFILE_FIELDS)[number]["key"];

export function ProfileApprovalsClient() {
  const { data: edits, isPending } = api.admin.getPendingProfileEdits.useQuery();
  const utils = api.useUtils();

  const review = api.admin.reviewProfileEdit.useMutation({
    onSuccess: () => void utils.admin.getPendingProfileEdits.invalidate(),
  });

  if (isPending) return <p className="text-sm text-gray-400">Loading…</p>;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Profile Approvals</h1>
        <p className="text-sm text-gray-500 mt-1">
          {edits?.length
            ? `${edits.length} pending request${edits.length !== 1 ? "s" : ""}`
            : "No pending requests"}
        </p>
      </div>

      {!edits?.length ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg font-medium">All caught up</p>
          <p className="text-sm mt-1">No profile changes awaiting approval.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {edits.map((edit) => (
            <EditCard
              key={edit.id}
              edit={edit}
              onReview={(decision, reviewNote) =>
                review.mutate({ editId: edit.id, decision, reviewNote })
              }
              isSaving={review.isPending}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function EditCard({
  edit,
  onReview,
  isSaving,
}: {
  edit: PendingEdit;
  onReview: (decision: "APPROVED" | "REJECTED", note?: string) => void;
  isSaving: boolean;
}) {
  const [note, setNote] = useState("");

  // Only show rows where a change was actually proposed
  const changedFields = PROFILE_FIELDS.filter(
    (f) => edit[f.key as FieldKey] !== null,
  );

  function formatValue(key: FieldKey, value: unknown) {
    if (value === null || value === undefined) return <span className="text-gray-300 italic">unchanged</span>;
    if (key === "graduationDate") return new Date(value as string).toLocaleDateString();
    return String(value);
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
        {edit.user.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={edit.user.image} alt="" className="w-9 h-9 rounded-full shrink-0" />
        ) : (
          <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
            <span className="text-blue-600 font-semibold text-sm">
              {edit.user.name?.charAt(0) ?? "?"}
            </span>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-900 truncate">
            {edit.user.name ?? edit.user.email}
          </p>
          <p className="text-xs text-gray-400 truncate">{edit.user.email}</p>
        </div>
        <p className="text-xs text-gray-400 shrink-0">
          {new Date(edit.submittedAt).toLocaleString()}
        </p>
      </div>

      {/* Diff table */}
      <div className="px-5 py-4">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide pb-2 w-28">
                Field
              </th>
              <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide pb-2">
                Current (approved)
              </th>
              <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide pb-2 pl-4">
                Proposed
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {changedFields.map((f) => {
              const current = edit.user[f.key as keyof typeof edit.user];
              const proposed = edit[f.key as FieldKey];
              const changed = String(current ?? "") !== String(proposed ?? "");
              return (
                <tr key={f.key}>
                  <td className="py-2 pr-4 text-xs text-gray-500 font-medium align-top">
                    {f.label}
                  </td>
                  <td className="py-2 pr-4 text-gray-500 align-top break-all">
                    {formatValue(f.key, current)}
                  </td>
                  <td className={`py-2 pl-4 align-top break-all ${changed ? "text-blue-700 font-medium" : "text-gray-500"}`}>
                    {formatValue(f.key, proposed)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Actions */}
      <div className="px-5 py-4 border-t border-gray-100 bg-gray-50 flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Optional note to member…"
          className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <div className="flex gap-2 shrink-0">
          <button
            onClick={() => onReview("APPROVED", note || undefined)}
            disabled={isSaving}
            className="px-4 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            Approve
          </button>
          <button
            onClick={() => onReview("REJECTED", note || undefined)}
            disabled={isSaving}
            className="px-4 py-1.5 border border-red-200 text-red-600 text-sm rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors"
          >
            Reject
          </button>
        </div>
      </div>
    </div>
  );
}
