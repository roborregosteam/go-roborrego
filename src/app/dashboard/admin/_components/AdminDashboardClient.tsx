"use client";

import { useState } from "react";
import Link from "next/link";
import { api, type RouterOutputs } from "~/trpc/react";

type Overview = RouterOutputs["admin"]["getOverview"];

export function AdminDashboardClient() {
  const { data, isPending } = api.admin.getOverview.useQuery();
  const utils = api.useUtils();

  const reviewCompletion = api.workPlan.reviewCompletion.useMutation({
    onSuccess: () => void utils.admin.getOverview.invalidate(),
  });

  if (isPending) {
    return <p className="text-sm text-gray-400">Loading…</p>;
  }

  if (!data) return null;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Platform overview and pending actions</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Active Members"
          value={data.members.active}
          sub={`${data.members.newThisMonth} joined this month`}
          href="/dashboard/admin/members"
          color="blue"
        />
        <StatCard
          label="Pending Reviews"
          value={data.pendingCompletions}
          sub="Work plan completions"
          href="/dashboard/workplan"
          color={data.pendingCompletions > 0 ? "amber" : "green"}
          urgent={data.pendingCompletions > 0}
        />
        <StatCard
          label="Active Projects"
          value={data.activeProjects}
          sub="Across all sub-teams"
          href="/dashboard/projects"
          color="indigo"
        />
        <StatCard
          label="Upcoming Meetings"
          value={data.upcomingMeetings.length}
          sub="Next 7 days"
          href="/dashboard/attendance"
          color="purple"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending completions quick-review */}
        <Section
          title="Pending Completions"
          count={data.pendingCompletions}
          linkHref="/dashboard/workplan"
          linkLabel="View all"
          empty={data.recentPendingCompletions.length === 0}
          emptyText="No pending reviews."
        >
          <div className="divide-y divide-gray-100">
            {data.recentPendingCompletions.map((c) => (
              <PendingCompletionRow
                key={c.id}
                completion={c}
                onApprove={() => reviewCompletion.mutate({ id: c.id, status: "APPROVED" })}
                onReject={() => reviewCompletion.mutate({ id: c.id, status: "REJECTED" })}
                isSaving={reviewCompletion.isPending}
              />
            ))}
            {data.pendingCompletions > 5 && (
              <p className="px-4 py-2 text-xs text-gray-400">
                +{data.pendingCompletions - 5} more —{" "}
                <Link href="/dashboard/workplan" className="text-blue-600 hover:underline">
                  review all
                </Link>
              </p>
            )}
          </div>
        </Section>

        {/* Upcoming meetings */}
        <Section
          title="Upcoming Meetings"
          count={data.upcomingMeetings.length}
          linkHref="/dashboard/attendance"
          linkLabel="Manage"
          empty={data.upcomingMeetings.length === 0}
          emptyText="No meetings in the next 7 days."
        >
          <div className="divide-y divide-gray-100">
            {data.upcomingMeetings.map((m) => (
              <div key={m.id} className="px-4 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{m.title}</p>
                  <p className="text-xs text-gray-400">
                    {new Date(m.startTime).toLocaleDateString(undefined, {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })}{" "}
                    ·{" "}
                    {new Date(m.startTime).toLocaleTimeString(undefined, {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}{" "}
                    · {m.duration} min
                  </p>
                </div>
                <span className="text-xs text-gray-400 shrink-0">
                  {m._count.attendances} checked in
                </span>
              </div>
            ))}
          </div>
        </Section>

        {/* Roster health */}
        <Section
          title="Roster Health"
          linkHref="/dashboard/admin/members"
          linkLabel="Manage roster"
          empty={false}
        >
          <div className="px-4 py-3 space-y-3">
            <RosterBar label="Active" value={data.members.active} color="bg-green-500" total={data.members.active + data.members.inactive + data.members.alumni} />
            <RosterBar label="Inactive" value={data.members.inactive} color="bg-gray-300" total={data.members.active + data.members.inactive + data.members.alumni} />
            <RosterBar label="Alumni" value={data.members.alumni} color="bg-purple-300" total={data.members.active + data.members.inactive + data.members.alumni} />

            {data.members.neverLoggedIn > 0 && (
              <div className="pt-2 mt-2 border-t border-gray-100 flex items-center justify-between">
                <p className="text-xs text-amber-600 font-medium">
                  {data.members.neverLoggedIn} active member{data.members.neverLoggedIn !== 1 ? "s" : ""} never logged in
                </p>
                <Link
                  href="/dashboard/admin/members?status=ACTIVE"
                  className="text-xs text-blue-600 hover:underline"
                >
                  View
                </Link>
              </div>
            )}
          </div>
        </Section>

        {/* Quick links */}
        <Section title="Quick Links" empty={false}>
          <div className="px-4 py-3 grid grid-cols-2 gap-2">
            {[
              { label: "Roster", href: "/dashboard/admin/members", desc: "Manage members" },
              { label: "Attendance", href: "/dashboard/attendance", desc: "Meetings & check-ins" },
              { label: "Work Plan", href: "/dashboard/workplan", desc: "Review completions" },
              { label: "Projects", href: "/dashboard/projects", desc: "All active projects" },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-lg border border-gray-200 px-3 py-2.5 hover:border-blue-200 hover:bg-blue-50 transition-colors"
              >
                <p className="text-sm font-medium text-gray-900">{link.label}</p>
                <p className="text-xs text-gray-400">{link.desc}</p>
              </Link>
            ))}
          </div>
        </Section>

        {/* Web export */}
        <WebExportPanel />
      </div>
    </div>
  );
}

function WebExportPanel() {
  const [result, setResult] = useState<{ prUrl?: string; prNumber?: number; memberCount?: number; imagesUploaded?: number; newIdAssignments?: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const exportMutation = api.admin.exportToWebRepo.useMutation({
    onSuccess: (data) => {
      if (!data.dryRun) setResult(data);
    },
    onError: (e) => setError(e.message),
  });

  const dryRunMutation = api.admin.exportToWebRepo.useMutation({
    onSuccess: (data) => {
      if (data.dryRun) {
        const preview = data as { dryRun: true; memberCount: number; newIdAssignments: number };
        setResult({ memberCount: preview.memberCount, newIdAssignments: preview.newIdAssignments });
      }
    },
    onError: (e) => setError(e.message),
  });

  const isBusy = exportMutation.isPending || dryRunMutation.isPending;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden lg:col-span-2">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <h2 className="text-sm font-semibold text-gray-900">Export Members to Website</h2>
        <span className="text-xs text-gray-400">roborregos-web</span>
      </div>
      <div className="px-4 py-4 space-y-3">
        <p className="text-xs text-gray-500">
          Creates a pull request on <span className="font-mono">RoBorregos/roborregos-web</span> with
          updated <span className="font-mono">members.json</span> and member images.
          Members marked &ldquo;Exclude from export&rdquo; are skipped. Web IDs are auto-assigned if missing.
        </p>

        {error && (
          <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
        )}

        {result?.prUrl && (
          <div className="text-xs bg-green-50 border border-green-200 rounded-lg px-3 py-2 space-y-1">
            <p className="font-medium text-green-800">PR created successfully</p>
            <p className="text-green-700">
              {result.memberCount} members · {result.imagesUploaded} images · {result.newIdAssignments} new IDs assigned
            </p>
            <a href={result.prUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline font-mono">
              PR #{result.prNumber}
            </a>
          </div>
        )}

        {result && !result.prUrl && (
          <div className="text-xs bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
            <p className="font-medium text-blue-800">Dry run complete</p>
            <p className="text-blue-700">{result.memberCount} members to export · {result.newIdAssignments} would get new IDs</p>
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={() => { setError(null); setResult(null); dryRunMutation.mutate({ dryRun: true }); }}
            disabled={isBusy}
            className="px-3 py-1.5 text-xs border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            {dryRunMutation.isPending ? "Running…" : "Dry Run"}
          </button>
          <button
            onClick={() => { setError(null); setResult(null); exportMutation.mutate({ dryRun: false }); }}
            disabled={isBusy}
            className="px-3 py-1.5 text-xs bg-[#1a2744] text-white rounded-lg hover:bg-[#243660] disabled:opacity-50 transition-colors"
          >
            {exportMutation.isPending ? "Creating PR…" : "Create PR"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  href,
  color,
  urgent,
}: {
  label: string;
  value: number;
  sub: string;
  href: string;
  color: "blue" | "amber" | "green" | "indigo" | "purple";
  urgent?: boolean;
}) {
  const colors = {
    blue: "bg-blue-50 text-blue-700",
    amber: "bg-amber-50 text-amber-700",
    green: "bg-green-50 text-green-700",
    indigo: "bg-indigo-50 text-indigo-700",
    purple: "bg-purple-50 text-purple-700",
  };

  return (
    <Link
      href={href}
      className={`relative rounded-xl border p-5 shadow-sm hover:shadow-md transition-all ${
        urgent ? "border-amber-200 bg-amber-50" : "border-gray-200 bg-white"
      }`}
    >
      {urgent && (
        <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-amber-400" />
      )}
      <p className={`text-3xl font-bold ${colors[color]}`}>{value}</p>
      <p className="text-sm font-medium text-gray-900 mt-1">{label}</p>
      <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
    </Link>
  );
}

function Section({
  title,
  count,
  linkHref,
  linkLabel,
  empty,
  emptyText,
  children,
}: {
  title: string;
  count?: number;
  linkHref?: string;
  linkLabel?: string;
  empty: boolean;
  emptyText?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
          {count !== undefined && count > 0 && (
            <span className="text-xs bg-amber-100 text-amber-700 font-medium px-1.5 py-0.5 rounded-full">
              {count}
            </span>
          )}
        </div>
        {linkHref && linkLabel && (
          <Link href={linkHref} className="text-xs text-blue-600 hover:underline">
            {linkLabel}
          </Link>
        )}
      </div>
      {empty ? (
        <p className="px-4 py-6 text-sm text-gray-400 text-center">{emptyText}</p>
      ) : (
        children
      )}
    </div>
  );
}

function PendingCompletionRow({
  completion,
  onApprove,
  onReject,
  isSaving,
}: {
  completion: Overview["recentPendingCompletions"][0];
  onApprove: () => void;
  onReject: () => void;
  isSaving: boolean;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      {completion.user.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={completion.user.image} alt="" className="w-7 h-7 rounded-full shrink-0" />
      ) : (
        <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
          <span className="text-blue-600 text-xs font-semibold">
            {completion.user.name?.charAt(0) ?? "?"}
          </span>
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-900 truncate">
          <span className="font-medium">{completion.user.name}</span>
          {" · "}
          <span className="text-gray-500">{completion.activity.name}</span>
        </p>
        <p className="text-xs text-gray-400">{completion.activity.points} pts</p>
      </div>
      <div className="flex gap-1 shrink-0">
        <button
          onClick={onApprove}
          disabled={isSaving}
          className="text-xs px-2 py-1 bg-green-50 text-green-700 border border-green-200 rounded hover:bg-green-100 disabled:opacity-50 transition-colors"
        >
          Approve
        </button>
        <button
          onClick={onReject}
          disabled={isSaving}
          className="text-xs px-2 py-1 bg-red-50 text-red-600 border border-red-200 rounded hover:bg-red-100 disabled:opacity-50 transition-colors"
        >
          Reject
        </button>
      </div>
    </div>
  );
}

function RosterBar({
  label,
  value,
  total,
  color,
}: {
  label: string;
  value: number;
  total: number;
  color: string;
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-600">{label}</span>
        <span className="text-gray-400">
          {value} ({pct}%)
        </span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
