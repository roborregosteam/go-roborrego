"use client";

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";

import { api } from "~/trpc/react";

type MeetingForm = {
  title: string;
  description: string;
  startTime: string;
  duration: number;
  projectId: string;
};

const EMPTY_FORM: MeetingForm = {
  title: "",
  description: "",
  startTime: "",
  duration: 60,
  projectId: "",
};

export function AdminMeetingsTab() {
  const { data: meetings, isPending } = api.attendance.getMeetings.useQuery();
  const { data: projects } = api.project.getAll.useQuery();
  const utils = api.useUtils();

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<MeetingForm>(EMPTY_FORM);
  const [editId, setEditId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [showQr, setShowQr] = useState<string | null>(null); // meetingId

  const createMeeting = api.attendance.createMeeting.useMutation({
    onSuccess: () => {
      void utils.attendance.getMeetings.invalidate();
      setShowCreate(false);
      setForm(EMPTY_FORM);
    },
  });

  const updateMeeting = api.attendance.updateMeeting.useMutation({
    onSuccess: () => {
      void utils.attendance.getMeetings.invalidate();
      setEditId(null);
    },
  });

  const deleteMeeting = api.attendance.deleteMeeting.useMutation({
    onSuccess: () => void utils.attendance.getMeetings.invalidate(),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const data = {
      title: form.title,
      description: form.description || undefined,
      startTime: new Date(form.startTime),
      duration: form.duration,
      projectId: form.projectId || undefined,
    };
    if (editId) {
      updateMeeting.mutate({
        id: editId,
        ...data,
        projectId: form.projectId || null,
      });
    } else {
      createMeeting.mutate(data);
    }
  }

  function startEdit(meeting: NonNullable<typeof meetings>[0]) {
    setEditId(meeting.id);
    setShowCreate(true);
    const d = new Date(meeting.startTime);
    // format for datetime-local input: YYYY-MM-DDTHH:mm
    const pad = (n: number) => String(n).padStart(2, "0");
    const local = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    setForm({
      title: meeting.title,
      description: meeting.description ?? "",
      startTime: local,
      duration: meeting.duration,
      projectId: meeting.projectId ?? "",
    });
  }

  const origin =
    typeof window !== "undefined" ? window.location.origin : "";

  return (
    <div>
      {/* Create / Edit form */}
      {showCreate ? (
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm mb-6 space-y-4"
        >
          <h2 className="font-semibold text-gray-900">
            {editId ? "Edit Meeting" : "New Meeting"}
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Title *
              </label>
              <input
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Duration (minutes) *
              </label>
              <input
                required
                type="number"
                min={1}
                value={form.duration}
                onChange={(e) =>
                  setForm({ ...form, duration: Number(e.target.value) })
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Start Date & Time *
              </label>
              <input
                required
                type="datetime-local"
                value={form.startTime}
                onChange={(e) =>
                  setForm({ ...form, startTime: e.target.value })
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Description
              </label>
              <input
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Related Project
              </label>
              <select
                value={form.projectId}
                onChange={(e) => setForm({ ...form, projectId: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">— None —</option>
                {projects?.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={createMeeting.isPending || updateMeeting.isPending}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {editId ? "Save" : "Create"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowCreate(false);
                setEditId(null);
                setForm(EMPTY_FORM);
              }}
              className="px-4 py-2 text-sm text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button
          onClick={() => setShowCreate(true)}
          className="mb-6 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
        >
          + New Meeting
        </button>
      )}

      {/* Meeting list */}
      {isPending && <p className="text-sm text-gray-400">Loading...</p>}
      {!isPending && !meetings?.length && (
        <p className="text-sm text-gray-400">No meetings yet.</p>
      )}

      <div className="space-y-3">
        {meetings?.map((meeting) => {
          const start = new Date(meeting.startTime);
          const checkInUrl = `${origin}/dashboard/attendance/checkin?token=${meeting.checkInToken}`;
          const isExpanded = detailId === meeting.id;

          return (
            <div
              key={meeting.id}
              className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
            >
              {/* Row */}
              <div className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <span className="font-semibold text-gray-900">
                    {meeting.title}
                  </span>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {start.toLocaleDateString(undefined, {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })}{" "}
                    ·{" "}
                    {start.toLocaleTimeString(undefined, {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}{" "}
                    ({meeting.duration} min) · {meeting._count.attendances}{" "}
                    present
                  </p>
                  {meeting.project && (
                    <span className="inline-block mt-1 text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded">
                      {meeting.project.name}
                    </span>
                  )}
                </div>

                <div className="flex gap-2 shrink-0 flex-wrap">
                  <button
                    onClick={() =>
                      setDetailId(isExpanded ? null : meeting.id)
                    }
                    className="px-3 py-1.5 text-xs rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
                  >
                    {isExpanded ? "Hide" : "Attendees"}
                  </button>
                  <button
                    onClick={() =>
                      setShowQr(showQr === meeting.id ? null : meeting.id)
                    }
                    className="px-3 py-1.5 text-xs rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
                  >
                    {showQr === meeting.id ? "Hide QR" : "QR Code"}
                  </button>
                  <button
                    onClick={() => startEdit(meeting)}
                    className="px-3 py-1.5 text-xs rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => {
                      if (confirm("Delete this meeting and all attendance records?")) {
                        deleteMeeting.mutate({ id: meeting.id });
                      }
                    }}
                    className="px-3 py-1.5 text-xs rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>

              {/* QR code panel */}
              {showQr === meeting.id && (
                <div className="border-t border-gray-100 px-4 py-4 bg-gray-50 flex flex-col sm:flex-row gap-4 items-start">
                  <QRCodeSVG value={checkInUrl} size={160} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-600 mb-1">
                      Check-in URL
                    </p>
                    <p className="text-xs text-gray-500 break-all">
                      {checkInUrl}
                    </p>
                    <p className="text-xs text-gray-400 mt-2">
                      Members scan this QR code to check in. Check-ins more
                      than 15 min after start are marked late.
                    </p>
                  </div>
                </div>
              )}

              {/* Attendees panel */}
              {isExpanded && (
                <AttendeesPanel meetingId={meeting.id} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AttendeesPanel({ meetingId }: { meetingId: string }) {
  const [activeSection, setActiveSection] = useState<"attendees" | "feedback">(
    "attendees",
  );
  const { data, isPending } = api.attendance.getMeetingDetail.useQuery({
    id: meetingId,
  });
  const utils = api.useUtils();

  const adminCheckIn = api.attendance.adminCheckIn.useMutation({
    onSuccess: () => {
      void utils.attendance.getMeetingDetail.invalidate({ id: meetingId });
      void utils.attendance.getMeetings.invalidate();
    },
  });

  const removeAttendance = api.attendance.removeAttendance.useMutation({
    onSuccess: () => {
      void utils.attendance.getMeetingDetail.invalidate({ id: meetingId });
      void utils.attendance.getMeetings.invalidate();
    },
  });

  if (isPending)
    return (
      <div className="border-t border-gray-100 px-4 py-3">
        <p className="text-sm text-gray-400">Loading...</p>
      </div>
    );

  if (!data) return null;

  const feedbackCount = data.feedbacks.length;
  const avgRating =
    feedbackCount > 0
      ? (
          data.feedbacks.reduce((s, f) => s + (f.rating ?? 0), 0) /
          data.feedbacks.filter((f) => f.rating !== null).length
        ).toFixed(1)
      : null;

  return (
    <div className="border-t border-gray-100">
      {/* Section tabs */}
      <div className="flex border-b border-gray-100 bg-gray-50 px-4">
        <button
          onClick={() => setActiveSection("attendees")}
          className={`py-2 mr-4 text-xs font-medium border-b-2 transition-colors ${
            activeSection === "attendees"
              ? "border-blue-600 text-blue-700"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Attendees ({data.members.filter((m) => m.isCheckedIn).length}/
          {data.members.length})
        </button>
        <button
          onClick={() => setActiveSection("feedback")}
          className={`py-2 text-xs font-medium border-b-2 transition-colors ${
            activeSection === "feedback"
              ? "border-blue-600 text-blue-700"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Feedback ({feedbackCount}
          {avgRating ? ` · ★ ${avgRating}` : ""})
        </button>
      </div>

      {/* Attendees table */}
      {activeSection === "attendees" && (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50 text-left">
              <th className="px-4 py-2 font-medium text-gray-600">Member</th>
              <th className="px-4 py-2 font-medium text-gray-600">Status</th>
              <th className="px-4 py-2 font-medium text-gray-600">Time</th>
              <th className="px-4 py-2 font-medium text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.members.map((member) => (
              <tr
                key={member.id}
                className="border-b border-gray-50 last:border-0 hover:bg-gray-50"
              >
                <td className="px-4 py-2">
                  <div className="flex items-center gap-2">
                    {member.image && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={member.image}
                        alt=""
                        className="w-6 h-6 rounded-full"
                      />
                    )}
                    <div>
                      <p className="font-medium text-gray-900">{member.name}</p>
                      {member.subTeam && (
                        <p className="text-xs text-gray-400">
                          {member.subTeam}
                        </p>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-2">
                  {member.isCheckedIn ? (
                    <span
                      className={`text-xs px-2 py-0.5 rounded border ${
                        member.attendance?.isLate
                          ? "bg-yellow-50 text-yellow-700 border-yellow-200"
                          : "bg-green-50 text-green-700 border-green-200"
                      }`}
                    >
                      {member.attendance?.isLate ? "Late" : "Present"}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400">Absent</span>
                  )}
                </td>
                <td className="px-4 py-2 text-gray-500 text-xs">
                  {member.attendance?.checkInTime
                    ? new Date(
                        member.attendance.checkInTime,
                      ).toLocaleTimeString(undefined, {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "—"}
                </td>
                <td className="px-4 py-2">
                  {member.isCheckedIn ? (
                    <button
                      onClick={() =>
                        removeAttendance.mutate({
                          userId: member.id,
                          meetingId,
                        })
                      }
                      disabled={removeAttendance.isPending}
                      className="text-xs text-red-500 hover:underline disabled:opacity-50"
                    >
                      Remove
                    </button>
                  ) : (
                    <button
                      onClick={() =>
                        adminCheckIn.mutate({ userId: member.id, meetingId })
                      }
                      disabled={adminCheckIn.isPending}
                      className="text-xs text-blue-600 hover:underline disabled:opacity-50"
                    >
                      Mark Present
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Feedback list */}
      {activeSection === "feedback" && (
        <div className="p-4 space-y-3">
          {data.feedbacks.length === 0 && (
            <p className="text-sm text-gray-400">No feedback submitted yet.</p>
          )}
          {data.feedbacks.map((f) => (
            <div
              key={f.id}
              className="bg-gray-50 rounded-lg border border-gray-200 px-4 py-3"
            >
              <div className="flex items-center gap-2 mb-1">
                {f.user ? (
                  <div className="flex items-center gap-1.5">
                    {f.user.image && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={f.user.image}
                        alt=""
                        className="w-5 h-5 rounded-full"
                      />
                    )}
                    <span className="text-xs font-medium text-gray-700">
                      {f.user.name}
                    </span>
                  </div>
                ) : (
                  <span className="text-xs text-gray-400 italic">
                    Anonymous
                  </span>
                )}
                {f.rating !== null && (
                  <span className="text-xs text-yellow-500 ml-auto">
                    {"★".repeat(f.rating)}
                    {"☆".repeat(5 - f.rating)}
                  </span>
                )}
              </div>
              {f.comment && (
                <p className="text-sm text-gray-700">{f.comment}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
