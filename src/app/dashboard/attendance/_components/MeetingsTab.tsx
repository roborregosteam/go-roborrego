"use client";

import { useState } from "react";

import { api, type RouterOutputs } from "~/trpc/react";
import { MeetingCalendar } from "./MeetingCalendar";
import { MeetingDetailModal } from "./MeetingDetailModal";

type Meeting = RouterOutputs["attendance"]["getMeetings"][0];

export function MeetingsTab({ isMember }: { isMember: boolean }) {
  const { data: meetings, isPending } = api.attendance.getMeetings.useQuery();
  const [view, setView] = useState<"calendar" | "list">("calendar");
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);

  if (isPending) return <p className="text-sm text-gray-400">Loading...</p>;
  if (!meetings?.length)
    return <p className="text-sm text-gray-400">No meetings yet.</p>;

  return (
    <div>
      {/* View toggle */}
      <div className="flex gap-1 mb-5 bg-gray-100 rounded-lg p-1 w-fit">
        <button
          onClick={() => setView("calendar")}
          className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
            view === "calendar"
              ? "bg-white text-gray-900 shadow-sm font-medium"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Calendar
        </button>
        <button
          onClick={() => setView("list")}
          className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
            view === "list"
              ? "bg-white text-gray-900 shadow-sm font-medium"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          List
        </button>
      </div>

      {/* Calendar view */}
      {view === "calendar" && (
        <MeetingCalendar
          meetings={meetings}
          onMeetingClick={(m) => setSelectedMeeting(m)}
        />
      )}

      {/* List view */}
      {view === "list" && (
        <div className="space-y-3">
          {meetings.map((meeting) => (
            <MeetingCard
              key={meeting.id}
              meeting={meeting}
              isMember={isMember}
              onOpen={() => setSelectedMeeting(meeting)}
            />
          ))}
        </div>
      )}

      {/* Detail modal */}
      {selectedMeeting && (
        <MeetingDetailModal
          meeting={selectedMeeting}
          isMember={isMember}
          onClose={() => setSelectedMeeting(null)}
        />
      )}
    </div>
  );
}

function MeetingCard({
  meeting,
  isMember,
  onOpen,
}: {
  meeting: Meeting;
  isMember: boolean;
  onOpen: () => void;
}) {
  const now = new Date();
  const start = new Date(meeting.startTime);
  const end = new Date(start.getTime() + meeting.duration * 60 * 1000);
  const openAt = new Date(start.getTime() - 30 * 60 * 1000);
  const isOpen = now >= openAt && now <= end;
  const isPast = now > end;
  const isCheckedIn = !!meeting.myAttendance;
  const hasFeedback = !!meeting.myFeedback;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex flex-col sm:flex-row sm:items-center gap-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={onOpen}
            className="font-semibold text-gray-900 hover:text-blue-600 transition-colors text-left"
          >
            {meeting.title}
          </button>
          {isCheckedIn && (
            <span
              className={`text-xs px-2 py-0.5 rounded border ${
                meeting.myAttendance?.isLate
                  ? "bg-yellow-50 text-yellow-700 border-yellow-200"
                  : "bg-green-50 text-green-700 border-green-200"
              }`}
            >
              {meeting.myAttendance?.isLate ? "Late" : "Present"}
            </span>
          )}
          {hasFeedback && (
            <span className="text-xs px-2 py-0.5 rounded border bg-purple-50 text-purple-700 border-purple-200">
              Feedback sent
            </span>
          )}
        </div>
        <p className="text-sm text-gray-500 mt-0.5">
          {start.toLocaleDateString(undefined, {
            weekday: "short", month: "short", day: "numeric",
          })}{" "}
          ·{" "}
          {start.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}{" "}
          ({meeting.duration} min) · {meeting._count.attendances} checked in
        </p>
        <div className="flex flex-wrap gap-1.5 mt-1">
          {meeting.project && (
            <span className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded">
              {meeting.project.name}
            </span>
          )}
          {meeting.teamsJoinUrl && (
            <a
              href={meeting.teamsJoinUrl}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-xs bg-[#6264a7] text-white px-2 py-0.5 rounded hover:bg-[#4f5196] transition-colors"
            >
              Join Teams
            </a>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0 flex-wrap">
        {/* Status indicator */}
        {isCheckedIn ? (
          <span className="text-xs text-gray-400">✓ Checked in</span>
        ) : isOpen && isMember ? (
          <span className="text-xs text-green-600 font-medium">Open</span>
        ) : isPast ? (
          <span className="text-xs text-gray-400">Closed</span>
        ) : (
          <span className="text-xs text-gray-400">
            Opens {openAt.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
          </span>
        )}

        <button
          onClick={onOpen}
          className="px-3 py-1.5 text-xs rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
        >
          Details
        </button>
      </div>
    </div>
  );
}
