"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { api } from "~/trpc/react";
import { CompletionBadge } from "../_components/WorkPlanClient";

export function MemberProgressClient({ memberId }: { memberId: string }) {
  const { data: member } = api.member.getById.useQuery({ id: memberId });
  const { data: semesters } = api.workPlan.getSemesters.useQuery();
  const { data: activeSemester } = api.workPlan.getActiveSemester.useQuery();

  const [semesterId, setSemesterId] = useState<string | null>(null);

  useEffect(() => {
    if (activeSemester && semesterId === null) setSemesterId(activeSemester.id);
  }, [activeSemester, semesterId]);

  const { data: summary } = api.workPlan.getMemberSummary.useQuery(
    { semesterId: semesterId!, userId: memberId },
    { enabled: !!semesterId },
  );

  const { data: activities, isLoading: activitiesLoading } =
    api.workPlan.getMemberActivities.useQuery(
      { semesterId: semesterId!, userId: memberId },
      { enabled: !!semesterId },
    );

  const mandatory = activities?.filter((a) => a.isMandatory) ?? [];
  const optional = activities?.filter((a) => !a.isMandatory) ?? [];

  return (
    <div className="max-w-3xl">
      {/* Back + header */}
      <div className="mb-6">
        <Link
          href="/dashboard/admin/members"
          className="text-xs text-gray-400 hover:text-gray-600 mb-2 inline-block"
        >
          ← Roster
        </Link>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            {member?.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={member.image} alt="" className="w-10 h-10 rounded-full" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <span className="text-blue-600 font-bold">
                  {member?.name?.charAt(0) ?? "?"}
                </span>
              </div>
            )}
            <div>
              <h1 className="text-xl font-bold text-gray-900">{member?.name ?? "…"}</h1>
              <p className="text-sm text-gray-400">{member?.email}</p>
            </div>
          </div>

          {/* Semester selector */}
          {semesters && semesters.length > 0 && (
            <select
              value={semesterId ?? ""}
              onChange={(e) => setSemesterId(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {semesters.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}{s.isActive ? " (active)" : ""}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <StatCard label="Points Earned" value={summary.approvedPoints} />
          <StatCard
            label="Tentative Points"
            value={summary.tentativePoints}
            note="from interests"
          />
          <StatCard label="Interested In" value={summary.interestedCount} />
          <StatCard
            label="Mandatory"
            value={`${summary.mandatoryCompleted} / ${summary.mandatoryTotal}`}
            highlight={summary.mandatoryCompleted < summary.mandatoryTotal}
          />
        </div>
      )}

      {/* Activities */}
      {!semesterId ? (
        <p className="text-sm text-gray-400">No active semester.</p>
      ) : activitiesLoading ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : !activities?.length ? (
        <p className="text-sm text-gray-400">No activities for this semester.</p>
      ) : (
        <div className="space-y-6">
          {mandatory.length > 0 && (
            <ActivitySection title="Mandatory" activities={mandatory} />
          )}
          {optional.length > 0 && (
            <ActivitySection
              title={mandatory.length > 0 ? "Optional" : "All Activities"}
              activities={optional}
            />
          )}
        </div>
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

function ActivitySection({
  title,
  activities,
}: {
  title: string;
  activities: Activity[];
}) {
  return (
    <div>
      <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
        {title}
      </h2>
      <div className="space-y-3">
        {activities.map((a) => (
          <ActivityRow key={a.id} activity={a} />
        ))}
      </div>
    </div>
  );
}

function ActivityRow({ activity }: { activity: Activity }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={`bg-white rounded-xl border p-4 shadow-sm ${
        activity.isMandatory ? "border-amber-200" : "border-gray-200"
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Status indicator */}
        <div className="mt-0.5 shrink-0">
          {activity.completion?.status === "APPROVED" ? (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-green-100 text-green-600 text-xs font-bold">✓</span>
          ) : activity.completion?.status === "PENDING" ? (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-yellow-100 text-yellow-600 text-xs">…</span>
          ) : activity.completion?.status === "REJECTED" ? (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-100 text-red-600 text-xs font-bold">✕</span>
          ) : activity.isInterested ? (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-50 text-blue-500 text-xs">★</span>
          ) : (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-100 text-gray-300 text-xs">○</span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-0.5">
            <h3 className="font-semibold text-gray-900 text-sm">{activity.name}</h3>
            <span className="text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-medium">
              {activity.points} pts
            </span>
            {activity.completion && (
              <CompletionBadge status={activity.completion.status} />
            )}
            {!activity.completion && activity.isInterested && (
              <span className="text-xs bg-blue-50 text-blue-600 border border-blue-200 px-1.5 py-0.5 rounded">
                Interested
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500">{activity.description}</p>
          {activity.estimatedDate && (
            <p className="text-xs text-gray-400 mt-0.5">
              Est. {new Date(activity.estimatedDate).toLocaleDateString()}
            </p>
          )}
        </div>

        {/* Expand toggle — only if there's a submission to show */}
        {activity.completion && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-gray-400 hover:text-gray-600 shrink-0"
          >
            {expanded ? "Hide" : "Details"}
          </button>
        )}
      </div>

      {/* Expanded submission detail */}
      {expanded && activity.completion && (
        <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
          <div>
            <p className="text-xs font-medium text-gray-500 mb-1">Submission note</p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{activity.completion.note}</p>
          </div>
          {activity.completion.adminNote && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">Admin feedback</p>
              <p className="text-sm text-gray-700">{activity.completion.adminNote}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  note,
  highlight,
}: {
  label: string;
  value: string | number;
  note?: string;
  highlight?: boolean;
}) {
  return (
    <div className={`rounded-xl border p-4 shadow-sm ${highlight ? "bg-amber-50 border-amber-200" : "bg-white border-gray-200"}`}>
      <p className="text-xs text-gray-500 font-medium mb-1">{label}</p>
      <p className={`text-2xl font-bold ${highlight ? "text-amber-700" : "text-gray-900"}`}>
        {value}
      </p>
      {note && <p className="text-xs text-gray-400 mt-0.5">{note}</p>}
    </div>
  );
}
