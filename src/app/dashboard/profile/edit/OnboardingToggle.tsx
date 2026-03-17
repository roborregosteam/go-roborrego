"use client";

import { api } from "~/trpc/react";

export function OnboardingToggle() {
  const utils = api.useUtils();
  const { data } = api.member.getOnboardingStatus.useQuery();

  const enable = api.member.enableOnboarding.useMutation({
    onSuccess: () => void utils.member.getOnboardingStatus.invalidate(),
  });

  const dismiss = api.member.dismissOnboarding.useMutation({
    onSuccess: () => void utils.member.getOnboardingStatus.invalidate(),
  });

  if (!data) return null;

  return (
    <div className="flex items-center gap-3">
      {data.dismissed ? (
        <>
          <span className="text-sm text-gray-500">Onboarding is hidden.</span>
          <button
            onClick={() => enable.mutate()}
            disabled={enable.isPending}
            className="text-sm px-4 py-1.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            {enable.isPending ? "Enabling…" : "Re-enable onboarding"}
          </button>
        </>
      ) : (
        <>
          <span className="text-sm text-gray-500">Onboarding banner is visible.</span>
          <button
            onClick={() => dismiss.mutate()}
            disabled={dismiss.isPending}
            className="text-sm px-4 py-1.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            {dismiss.isPending ? "Hiding…" : "Hide onboarding"}
          </button>
        </>
      )}
    </div>
  );
}
