"use client";

import { useState } from "react";

const REPO = "https://github.com/RoBorregos/go-roborrego";

type IssueType = "bug" | "feature" | "other";

const TYPE_CONFIG: Record<
  IssueType,
  { label: string; description: string; label_param: string; bodyTemplate: string }
> = {
  bug: {
    label: "Bug Report",
    description: "Something isn't working as expected",
    label_param: "bug",
    bodyTemplate: `## Description\n\n<!-- A clear description of the bug -->\n\n## Steps to Reproduce\n\n1. \n2. \n3. \n\n## Expected Behavior\n\n\n## Actual Behavior\n\n\n## Additional Context\n\n<!-- Browser, screenshots, error messages... -->`,
  },
  feature: {
    label: "Feature Request",
    description: "Suggest a new feature or improvement",
    label_param: "enhancement",
    bodyTemplate: `## Summary\n\n<!-- What feature would you like? -->\n\n## Problem / Motivation\n\n<!-- What problem does this solve? -->\n\n## Proposed Solution\n\n\n## Additional Context\n`,
  },
  other: {
    label: "Other",
    description: "Question, feedback, or anything else",
    label_param: "question",
    bodyTemplate: `## Description\n\n`,
  },
};

export function SupportClient() {
  const [type, setType] = useState<IssueType>("bug");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState(TYPE_CONFIG.bug.bodyTemplate);

  function handleTypeChange(newType: IssueType) {
    setType(newType);
    setBody(TYPE_CONFIG[newType].bodyTemplate);
  }

  function buildUrl() {
    const config = TYPE_CONFIG[type];
    const params = new URLSearchParams({
      title,
      body,
      labels: config.label_param,
    });
    return `${REPO}/issues/new?${params.toString()}`;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    window.open(buildUrl(), "_blank", "noopener,noreferrer");
  }

  const config = TYPE_CONFIG[type];

  return (
    <div className="max-w-2xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Report an Issue</h1>
        <p className="text-sm text-gray-500 mt-1">
          Fill in the form below. You&apos;ll be redirected to GitHub to submit the issue.
        </p>
      </div>

      {/* Type selector */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {(Object.entries(TYPE_CONFIG) as [IssueType, (typeof TYPE_CONFIG)[IssueType]][]).map(
          ([key, cfg]) => (
            <button
              key={key}
              type="button"
              onClick={() => handleTypeChange(key)}
              className={`rounded-xl border p-4 text-left transition-all ${
                type === key
                  ? "border-blue-500 bg-blue-50 ring-1 ring-blue-500"
                  : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm"
              }`}
            >
              <p className={`text-sm font-semibold ${type === key ? "text-blue-700" : "text-gray-900"}`}>
                {cfg.label}
              </p>
              <p className="text-xs text-gray-500 mt-0.5 leading-snug">{cfg.description}</p>
            </button>
          ),
        )}
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Title <span className="text-red-500">*</span>
          </label>
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={
              type === "bug"
                ? "e.g. Attendance check-in button doesn't respond on mobile"
                : type === "feature"
                  ? "e.g. Add email notifications for approved completions"
                  : "Brief summary…"
            }
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Details
          </label>
          <p className="text-xs text-gray-400 mb-1.5">
            Fill in what applies — you can also edit directly on GitHub before submitting.
          </p>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={12}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
          />
        </div>

        <div className="flex items-center gap-3 pt-1">
          <button
            type="submit"
            disabled={!title.trim()}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#1a2744] text-white text-sm font-medium rounded-lg hover:bg-[#243660] disabled:opacity-50 transition-colors"
          >
            <GitHubIcon />
            Open on GitHub
          </button>
          <p className="text-xs text-gray-400">
            Opens a new tab — you&apos;ll review it before submitting.
          </p>
        </div>
      </form>

      {/* Divider */}
      <div className="mt-10 pt-6 border-t border-gray-200">
        <p className="text-sm font-medium text-gray-700 mb-3">Or go directly to GitHub</p>
        <div className="flex flex-wrap gap-2">
          <a
            href={`${REPO}/issues/new?template=bug_report.md&labels=bug`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50 transition-colors"
          >
            <GitHubIcon size={12} />
            Bug report template
          </a>
          <a
            href={`${REPO}/issues/new?template=feature_request.md&labels=enhancement`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50 transition-colors"
          >
            <GitHubIcon size={12} />
            Feature request template
          </a>
          <a
            href={`${REPO}/issues`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50 transition-colors"
          >
            <GitHubIcon size={12} />
            View all issues
          </a>
        </div>
      </div>
    </div>
  );
}

function GitHubIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222 0 1.606-.015 2.896-.015 3.286 0 .322.216.694.825.576C20.565 21.795 24 17.298 24 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}
