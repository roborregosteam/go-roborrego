"use client";

import Link from "next/link";
import { api } from "~/trpc/react";

export function OnboardingBanner() {
  const utils = api.useUtils();
  const { data, isPending } = api.member.getOnboardingStatus.useQuery();

  const dismiss = api.member.dismissOnboarding.useMutation({
    onSuccess: () => void utils.member.getOnboardingStatus.invalidate(),
  });

  if (isPending || !data || data.dismissed) return null;

  const tasks = Object.values(data.tasks);
  const completed = tasks.filter(Boolean).length;
  const total = tasks.length;
  const allDone = completed === total;

  if (allDone) return null;

  const progressPct = Math.round((completed / total) * 100);

  return (
    <div className="bg-white border border-blue-200 rounded-xl shadow-sm p-5 mb-6 flex flex-col sm:flex-row sm:items-center gap-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h2 className="font-semibold text-gray-900 text-sm">Complete your onboarding</h2>
          <span className="text-xs text-blue-600 font-medium">
            {completed}/{total} done
          </span>
        </div>

        {/* Mini progress bar */}
        <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-1.5 bg-blue-600 rounded-full transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <Link
          href="/dashboard/onboarding"
          className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Continue
        </Link>
        <button
          onClick={() => dismiss.mutate()}
          disabled={dismiss.isPending}
          className="text-xs text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
