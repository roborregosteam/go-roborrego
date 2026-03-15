"use client";

import { useState } from "react";

import { MeetingsTab } from "./MeetingsTab";
import { MyAttendanceTab } from "./MyAttendanceTab";
import { AdminMeetingsTab } from "./AdminMeetingsTab";
import { AdminReportTab } from "./AdminReportTab";

type Tab = "meetings" | "mine" | "manage" | "report";

export function AttendanceClient({
  isAdmin,
  isMember,
}: {
  isAdmin: boolean;
  isMember: boolean;
}) {
  const [tab, setTab] = useState<Tab>("meetings");

  const memberTabs: { key: Tab; label: string }[] = [
    { key: "meetings", label: "Meetings" },
    { key: "mine", label: "My Attendance" },
  ];
  const adminTabs: { key: Tab; label: string }[] = [
    { key: "manage", label: "Manage Meetings" },
    { key: "report", label: "Report" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Attendance</h1>

      <div className="flex flex-wrap gap-x-6 border-b border-gray-200 mb-6">
        {memberTabs.map((t) => (
          <TabBtn key={t.key} active={tab === t.key} onClick={() => setTab(t.key)}>
            {t.label}
          </TabBtn>
        ))}
        {isAdmin && (
          <>
            <span className="border-l border-gray-200 mx-1" />
            {adminTabs.map((t) => (
              <TabBtn key={t.key} active={tab === t.key} onClick={() => setTab(t.key)}>
                {t.label}
              </TabBtn>
            ))}
          </>
        )}
      </div>

      {tab === "meetings" && <MeetingsTab isMember={isMember} />}
      {tab === "mine" && <MyAttendanceTab />}
      {isAdmin && tab === "manage" && <AdminMeetingsTab />}
      {isAdmin && tab === "report" && <AdminReportTab />}
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
        active
          ? "border-blue-600 text-blue-700"
          : "border-transparent text-gray-500 hover:text-gray-700"
      }`}
    >
      {children}
    </button>
  );
}
