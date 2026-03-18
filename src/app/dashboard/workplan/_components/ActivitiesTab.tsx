"use client";

import { useState } from "react";

import { api } from "~/trpc/react";
import { CompletionBadge } from "./WorkPlanClient";

export function ActivitiesTab({
  semesterId,
  userId,
}: {
  semesterId: string;
  userId: string;
}) {
  const utils = api.useUtils();
  const { data: activities, isLoading } = api.workPlan.getActivities.useQuery({ semesterId });

  const expressInterest = api.workPlan.expressInterest.useMutation({
    onSuccess: () => utils.workPlan.getActivities.invalidate(),
  });
  const removeInterest = api.workPlan.removeInterest.useMutation({
    onSuccess: () => utils.workPlan.getActivities.invalidate(),
  });

  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [submitError, setSubmitError] = useState("");

  // Filters
  const [search, setSearch] = useState("");
  const [onlyInterested, setOnlyInterested] = useState(false);

  // Collapsible sections
  const [mandatoryOpen, setMandatoryOpen] = useState(true);
  const [optionalOpen, setOptionalOpen] = useState(true);

  const submitCompletion = api.workPlan.submitCompletion.useMutation({
    onSuccess: () => {
      setSubmittingId(null);
      setNote("");
      setSubmitError("");
      void utils.workPlan.getActivities.invalidate();
      void utils.workPlan.getMySummary.invalidate();
    },
    onError: (err) => setSubmitError(err.message),
  });

  if (isLoading) return <p className="text-sm text-gray-400">Loading activities…</p>;

  if (!activities?.length)
    return <p className="text-sm text-gray-400">No activities for this semester yet.</p>;

  const filtered = activities.filter((a) => {
    if (search && !a.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (onlyInterested && !a.isInterested) return false;
    return true;
  });

  const mandatory = filtered.filter((a) => a.isMandatory);
  const optional = filtered.filter((a) => !a.isMandatory);

  const sharedProps = {
    submittingId,
    note,
    submitError,
    onInterestToggle: (id: string, isInterested: boolean) =>
      isInterested ? removeInterest.mutate({ activityId: id }) : expressInterest.mutate({ activityId: id }),
    onOpenSubmit: (id: string) => { setSubmittingId(id); setNote(""); setSubmitError(""); },
    onCancelSubmit: () => { setSubmittingId(null); setNote(""); setSubmitError(""); },
    onNoteChange: setNote,
    onSubmit: (activityId: string) => { if (!note.trim()) return; submitCompletion.mutate({ activityId, note }); },
    isSubmitting: submitCompletion.isPending,
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search activities…"
          className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={() => setOnlyInterested((v) => !v)}
          className={`shrink-0 rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
            onlyInterested
              ? "border-blue-300 bg-blue-50 text-blue-700"
              : "border-gray-200 text-gray-600 hover:bg-gray-50"
          }`}
        >
          {onlyInterested ? "Interested ✓" : "All activities"}
        </button>
      </div>

      {filtered.length === 0 && (
        <p className="text-sm text-gray-400">No activities match your filters.</p>
      )}

      {mandatory.length > 0 && (
        <CollapsibleSection
          title="Mandatory"
          count={mandatory.length}
          open={mandatoryOpen}
          onToggle={() => setMandatoryOpen((v) => !v)}
        >
          <ActivityList activities={mandatory} userId={userId} {...sharedProps} />
        </CollapsibleSection>
      )}

      {optional.length > 0 && (
        <CollapsibleSection
          title={mandatory.length > 0 ? "Optional" : "All Activities"}
          count={optional.length}
          open={optionalOpen}
          onToggle={() => setOptionalOpen((v) => !v)}
        >
          <ActivityList activities={optional} userId={userId} {...sharedProps} />
        </CollapsibleSection>
      )}
    </div>
  );
}

type Activity = {
  id: string;
  name: string;
  description: string;
  points: number;
  isMandatory: boolean;
  estimatedDate: Date | null;
  adminMessage: string | null;
  isInterested: boolean;
  completion: {
    status: string;
    note: string;
    adminNote: string | null;
  } | null;
};

function CollapsibleSection({
  title,
  count,
  open,
  onToggle,
  children,
}: {
  title: string;
  count: number;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div>
      <button
        onClick={onToggle}
        className="flex w-full items-center gap-2 mb-3 group"
      >
        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
          {title}
        </span>
        <span className="text-xs text-gray-300 font-medium">({count})</span>
        <span className="ml-auto text-gray-400 group-hover:text-gray-600 transition-colors text-xs">
          {open ? "▲" : "▼"}
        </span>
      </button>
      {open && children}
    </div>
  );
}

function ActivityList({
  activities,
  submittingId,
  note,
  submitError,
  onInterestToggle,
  onOpenSubmit,
  onCancelSubmit,
  onNoteChange,
  onSubmit,
  isSubmitting,
}: {
  activities: Activity[];
  userId: string;
  submittingId: string | null;
  note: string;
  submitError: string;
  onInterestToggle: (id: string, isInterested: boolean) => void;
  onOpenSubmit: (id: string) => void;
  onCancelSubmit: () => void;
  onNoteChange: (v: string) => void;
  onSubmit: (id: string) => void;
  isSubmitting: boolean;
}) {
  return (
    <div className="space-y-3">
      {activities.map((activity) => (
        <div
          key={activity.id}
          className={`bg-white rounded-xl border p-5 shadow-sm ${
            activity.isMandatory ? "border-amber-200" : "border-gray-200"
          }`}
        >
          <div className="flex items-start gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h3 className="font-semibold text-gray-900 text-sm">{activity.name}</h3>
                <span className="text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-medium">
                  {activity.points} pts
                </span>
                {activity.completion && (
                  <CompletionBadge status={activity.completion.status} />
                )}
              </div>
              <p className="text-gray-500 text-sm">{activity.description}</p>
              {activity.adminMessage && (
                <p className="mt-1.5 text-xs text-blue-600 bg-blue-50 border border-blue-100 rounded px-2 py-1">
                  📋 {activity.adminMessage}
                </p>
              )}
              {activity.estimatedDate && (
                <p className="mt-1 text-xs text-gray-400">
                  Est. {new Date(activity.estimatedDate).toLocaleDateString()}
                </p>
              )}
              {activity.completion?.status === "REJECTED" && activity.completion.adminNote && (
                <p className="mt-1.5 text-xs text-red-600 bg-red-50 border border-red-100 rounded px-2 py-1">
                  Feedback: {activity.completion.adminNote}
                </p>
              )}
            </div>

            {activity.completion?.status !== "APPROVED" && (
              <div className="flex flex-col gap-2 shrink-0">
                {!activity.completion && !activity.isMandatory && (
                  <button
                    onClick={() => onInterestToggle(activity.id, activity.isInterested)}
                    className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                      activity.isInterested
                        ? "border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100"
                        : "border-gray-200 text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {activity.isInterested ? "Interested ✓" : "Show Interest"}
                  </button>
                )}
                {(!activity.completion || activity.completion.status === "REJECTED") && (
                  <button
                    onClick={() => onOpenSubmit(activity.id)}
                    className="text-xs px-3 py-1.5 rounded-lg bg-[#1a2744] text-white hover:bg-[#243660] transition-colors"
                  >
                    {activity.completion?.status === "REJECTED" ? "Resubmit" : "Submit"}
                  </button>
                )}
              </div>
            )}
          </div>

          {submittingId === activity.id && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Describe your participation
              </label>
              <textarea
                value={note}
                onChange={(e) => onNoteChange(e.target.value)}
                rows={3}
                autoFocus
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                placeholder="What did you do? Include any relevant links or details…"
              />
              {submitError && (
                <p className="text-xs text-red-600 mt-1">{submitError}</p>
              )}
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => onSubmit(activity.id)}
                  disabled={isSubmitting || !note.trim()}
                  className="text-xs px-3 py-1.5 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
                >
                  {isSubmitting ? "Submitting…" : "Submit for Review"}
                </button>
                <button
                  onClick={onCancelSubmit}
                  className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
