"use client";

import { useMemo, useState } from "react";

import type { RouterOutputs } from "~/trpc/react";

type Meeting = RouterOutputs["attendance"]["getMeetings"][0];

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function MeetingCalendar({
  meetings,
  onMeetingClick,
}: {
  meetings: Meeting[];
  onMeetingClick: (meeting: Meeting) => void;
}) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const { daysInMonth, firstDow } = useMemo(() => ({
    daysInMonth: new Date(year, month + 1, 0).getDate(),
    firstDow: new Date(year, month, 1).getDay(),
  }), [year, month]);

  const meetingsByDay = useMemo(() => {
    const map = new Map<number, Meeting[]>();
    for (const m of meetings) {
      const d = new Date(m.startTime);
      if (d.getFullYear() === year && d.getMonth() === month) {
        const day = d.getDate();
        const existing = map.get(day) ?? [];
        map.set(day, [...existing, m]);
      }
    }
    return map;
  }, [meetings, year, month]);

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  }

  const isCurrentMonth =
    year === today.getFullYear() && month === today.getMonth();

  // Build grid cells: nulls for leading blanks, then day numbers
  const cells: (number | null)[] = [
    ...Array<null>(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={prevMonth}
          className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
        >
          ‹
        </button>
        <h2 className="font-semibold text-gray-900">
          {MONTHS[month]} {year}
        </h2>
        <button
          onClick={nextMonth}
          className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
        >
          ›
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 mb-1">
        {WEEKDAYS.map((w) => (
          <div key={w} className="text-center text-xs font-medium text-gray-400 py-1">
            {w}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 gap-px bg-gray-100 border border-gray-100 rounded-xl overflow-hidden">
        {cells.map((day, i) => {
          const isToday = isCurrentMonth && day === today.getDate();
          const dayMeetings = day !== null ? (meetingsByDay.get(day) ?? []) : [];
          return (
            <div
              key={i}
              className={`bg-white min-h-20 p-1 ${day === null ? "bg-gray-50" : ""}`}
            >
              {day !== null && (
                <>
                  <span
                    className={`inline-flex items-center justify-center w-6 h-6 text-xs rounded-full mb-1 ${
                      isToday
                        ? "bg-blue-600 text-white font-bold"
                        : "text-gray-600"
                    }`}
                  >
                    {day}
                  </span>
                  <div className="space-y-0.5">
                    {dayMeetings.slice(0, 3).map((m) => (
                      <button
                        key={m.id}
                        onClick={() => onMeetingClick(m)}
                        className="w-full text-left text-xs rounded px-1 py-0.5 truncate bg-blue-50 text-blue-800 hover:bg-blue-100 transition-colors"
                        title={m.title}
                      >
                        {new Date(m.startTime).toLocaleTimeString(undefined, {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}{" "}
                        {m.title}
                      </button>
                    ))}
                    {dayMeetings.length > 3 && (
                      <span className="text-xs text-gray-400 px-1">
                        +{dayMeetings.length - 3} more
                      </span>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
