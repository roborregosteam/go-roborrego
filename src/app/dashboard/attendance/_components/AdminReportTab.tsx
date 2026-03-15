"use client";

import { useState } from "react";

import { api } from "~/trpc/react";

// Attendance rate thresholds
const THRESHOLD_GREEN = 80;
const THRESHOLD_YELLOW = 60;

export function AdminReportTab() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const { data, isPending, refetch } = api.attendance.getReport.useQuery(
    {
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
    },
    { enabled: true },
  );

  if (isPending) return <p className="text-sm text-gray-400">Loading...</p>;

  // Group by subTeam
  const byTeam = new Map<string, typeof data>();
  for (const member of data ?? []) {
    const team = member.subTeam ?? "No sub-team";
    if (!byTeam.has(team)) byTeam.set(team, []);
    byTeam.get(team)!.push(member);
  }

  const totalMeetings = data?.[0]?.totalMeetings ?? 0;

  return (
    <div>
      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm mb-6 flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            From
          </label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            To
          </label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button
          onClick={() => {
            setFrom("");
            setTo("");
            void refetch();
          }}
          className="px-3 py-1.5 text-sm text-gray-600 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
        >
          Clear
        </button>
        <p className="text-xs text-gray-400 self-end pb-0.5">
          {totalMeetings} meeting{totalMeetings !== 1 ? "s" : ""} in range
        </p>
      </div>

      {/* Legend */}
      <div className="flex gap-4 mb-4 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
          ≥{THRESHOLD_GREEN}%
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" />
          {THRESHOLD_YELLOW}–{THRESHOLD_GREEN - 1}%
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />
          &lt;{THRESHOLD_YELLOW}%
        </span>
      </div>

      {/* Tables per sub-team */}
      {byTeam.size === 0 && (
        <p className="text-sm text-gray-400">No active members found.</p>
      )}

      {Array.from(byTeam.entries()).map(([team, members]) => (
        <div key={team} className="mb-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-2">{team}</h2>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-left">
                  <th className="px-4 py-3 font-medium text-gray-600">
                    Member
                  </th>
                  <th className="px-4 py-3 font-medium text-gray-600">
                    Attended
                  </th>
                  <th className="px-4 py-3 font-medium text-gray-600">Rate</th>
                  <th className="px-4 py-3 font-medium text-gray-600">Late</th>
                </tr>
              </thead>
              <tbody>
                {members!.map((m) => (
                  <tr
                    key={m.id}
                    className="border-b border-gray-100 last:border-0 hover:bg-gray-50"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {m.image && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={m.image}
                            alt=""
                            className="w-6 h-6 rounded-full"
                          />
                        )}
                        <div>
                          <p className="font-medium text-gray-900">{m.name}</p>
                          <p className="text-xs text-gray-400">{m.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {m.attended} / {m.totalMeetings}
                    </td>
                    <td className="px-4 py-3">
                      <RateBadge rate={m.rate} />
                    </td>
                    <td className="px-4 py-3 text-gray-500">{m.late}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}

function RateBadge({ rate }: { rate: number }) {
  const color =
    rate >= THRESHOLD_GREEN
      ? "bg-green-50 text-green-700 border-green-200"
      : rate >= THRESHOLD_YELLOW
        ? "bg-yellow-50 text-yellow-700 border-yellow-200"
        : "bg-red-50 text-red-600 border-red-200";

  return (
    <span className={`text-xs px-2 py-0.5 rounded border font-medium ${color}`}>
      {rate}%
    </span>
  );
}
