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

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Meetings</h1>

      <div className="flex overflow-x-auto border-b border-gray-200 mb-6 gap-x-6 scrollbar-none">
        <TabBtn active={tab === "meetings"} onClick={() => setTab("meetings")}>Meetings</TabBtn>
        <TabBtn active={tab === "mine"} onClick={() => setTab("mine")}>My Attendance</TabBtn>
        {isMember && (
          <TabBtn active={tab === "manage"} onClick={() => setTab("manage")}>Manage Meetings</TabBtn>
        )}
        {isAdmin && (
          <TabBtn active={tab === "report"} onClick={() => setTab("report")}>Report</TabBtn>
        )}
      </div>

      {tab === "meetings" && <MeetingsTab isMember={isMember} />}
      {tab === "mine" && <MyAttendanceTab />}
      {isMember && tab === "manage" && <AdminMeetingsTab isAdmin={isAdmin} />}
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
