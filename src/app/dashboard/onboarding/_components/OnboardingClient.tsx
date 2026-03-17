"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";

type TaskKey = "profileComplete" | "githubConnected" | "teamAccessGranted" | "joinedProject" | "attendedMeeting";

const TASKS: {
  key: TaskKey;
  title: string;
  description: string;
  actionLabel: string;
  actionHref: string;
  viewerOnly?: boolean;
}[] = [
  {
    key: "profileComplete",
    title: "Complete your profile",
    description: "Add your bio, phone number, and sub-team so the rest of the team knows who you are.",
    actionLabel: "Edit Profile",
    actionHref: "/dashboard/profile/edit",
  },
  {
    key: "githubConnected",
    title: "Add your GitHub username",
    description: "Link your GitHub account so project managers can grant you repository access.",
    actionLabel: "Edit Profile",
    actionHref: "/dashboard/profile/edit",
  },
  {
    key: "teamAccessGranted",
    title: "Request full member access",
    description: "Ask an admin to upgrade your account to Member so you can check in to meetings and join projects.",
    actionLabel: "Request Access",
    actionHref: "/dashboard/support",
    viewerOnly: true,
  },
  {
    key: "joinedProject",
    title: "Join a project",
    description: "Explore the active projects and ask a project manager to add you to one.",
    actionLabel: "View Projects",
    actionHref: "/dashboard/projects",
  },
  {
    key: "attendedMeeting",
    title: "Attend your first meeting",
    description: "Check in to a team meeting using the QR code or the check-in code provided.",
    actionLabel: "View Meetings",
    actionHref: "/dashboard/attendance",
  },
];

export function OnboardingClient() {
  const router = useRouter();
  const utils = api.useUtils();
  const { data, isPending } = api.member.getOnboardingStatus.useQuery();

  const dismiss = api.member.dismissOnboarding.useMutation({
    onSuccess: () => {
      void utils.member.getOnboardingStatus.invalidate();
      router.push("/dashboard");
    },
  });

  if (isPending) {
    return <p className="text-sm text-gray-400">Loading…</p>;
  }

  if (!data) return null;

  const visibleTasks = TASKS.filter(
    (t) => !(t.viewerOnly && data.role !== "VIEWER"),
  );

  const completed = visibleTasks.filter((t) => data.tasks[t.key]).length;
  const total = visibleTasks.length;
  const allDone = completed === total;
  const progressPct = Math.round((completed / total) * 100);

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Getting Started</h1>
        <p className="text-gray-500 mt-1">
          Complete these steps to get the most out of the RoBorregos platform.
        </p>
      </div>

      {/* Progress */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">
            {completed} of {total} completed
          </span>
          <span className="text-sm font-semibold text-blue-600">{progressPct}%</span>
        </div>
        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-2 bg-blue-600 rounded-full transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        {allDone && (
          <p className="text-sm text-green-600 font-medium mt-2">
            🎉 You&apos;re all set! Welcome to the team.
          </p>
        )}
      </div>

      {/* Task list */}
      <div className="space-y-3 mb-8">
        {visibleTasks.map((task) => {
          const done = data.tasks[task.key];
          return (
            <div
              key={task.key}
              className={`bg-white rounded-xl border shadow-sm p-5 flex gap-4 items-start transition-opacity ${
                done ? "border-green-200 opacity-75" : "border-gray-200"
              }`}
            >
              {/* Status icon */}
              <div
                className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center mt-0.5 ${
                  done ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-400"
                }`}
              >
                {done ? (
                  <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <div className="w-2 h-2 rounded-full bg-gray-300" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className={`font-semibold text-sm ${done ? "text-gray-400 line-through" : "text-gray-900"}`}>
                    {task.title}
                  </h3>
                  {done && (
                    <span className="text-xs px-2 py-0.5 rounded border bg-green-50 text-green-700 border-green-200">
                      Done
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500 mt-0.5">{task.description}</p>
              </div>

              {!done && (
                <Link
                  href={task.actionHref}
                  className="shrink-0 px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {task.actionLabel}
                </Link>
              )}
            </div>
          );
        })}
      </div>

      {/* Dismiss */}
      {!data.dismissed && (
        <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
          <button
            onClick={() => dismiss.mutate()}
            disabled={dismiss.isPending}
            className="text-sm text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
          >
            {dismiss.isPending ? "Dismissing…" : "Dismiss onboarding"}
          </button>
          <span className="text-gray-200">·</span>
          <p className="text-xs text-gray-400">
            You can re-enable it from your{" "}
            <Link href="/dashboard/profile/edit" className="text-blue-600 hover:underline">
              profile settings
            </Link>
            .
          </p>
        </div>
      )}
    </div>
  );
}
