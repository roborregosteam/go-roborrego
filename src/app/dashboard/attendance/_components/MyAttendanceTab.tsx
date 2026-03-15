"use client";

import { api } from "~/trpc/react";

export function MyAttendanceTab() {
  const { data: records, isPending } =
    api.attendance.getMyAttendance.useQuery();

  if (isPending) return <p className="text-sm text-gray-400">Loading...</p>;
  if (!records?.length)
    return (
      <p className="text-sm text-gray-400">No attendance records yet.</p>
    );

  const attended = records.length;
  const late = records.filter((r) => r.isLate).length;

  return (
    <div>
      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
        <StatCard label="Meetings Attended" value={attended} />
        <StatCard label="On Time" value={attended - late} />
        <StatCard label="Late Check-ins" value={late} />
      </div>

      {/* List */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 text-left">
              <th className="px-4 py-3 font-medium text-gray-600">Meeting</th>
              <th className="px-4 py-3 font-medium text-gray-600">Date</th>
              <th className="px-4 py-3 font-medium text-gray-600">Status</th>
              <th className="px-4 py-3 font-medium text-gray-600">Method</th>
            </tr>
          </thead>
          <tbody>
            {records.map((r) => (
              <tr
                key={r.id}
                className="border-b border-gray-100 last:border-0 hover:bg-gray-50"
              >
                <td className="px-4 py-3 text-gray-900 font-medium">
                  {r.meeting.title}
                </td>
                <td className="px-4 py-3 text-gray-500">
                  {new Date(r.meeting.startTime).toLocaleDateString(undefined, {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`text-xs px-2 py-0.5 rounded border ${
                      r.isLate
                        ? "bg-yellow-50 text-yellow-700 border-yellow-200"
                        : "bg-green-50 text-green-700 border-green-200"
                    }`}
                  >
                    {r.isLate ? "Late" : "On time"}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-400 capitalize">
                  {r.method === "QR_CODE"
                    ? "QR code"
                    : r.method === "MANUAL"
                      ? "Manual"
                      : "Self"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
      <p className="text-xs text-gray-500 font-medium mb-1">{label}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}
