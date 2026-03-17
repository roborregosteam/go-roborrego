"use client";

import { useState } from "react";
import { api } from "~/trpc/react";

type MeetingForm = {
  title: string;
  description: string;
  startTime: string;
  duration: number;
  projectId: string;
  notesAllowAttendees: boolean;
  teamsChannelId: string;
};

const EMPTY_FORM: MeetingForm = {
  title: "",
  description: "",
  startTime: "",
  duration: 60,
  projectId: "",
  notesAllowAttendees: false,
  teamsChannelId: "",
};

export function CreateMeetingModal({ onClose }: { onClose: () => void }) {
  const utils = api.useUtils();
  const { data: projects } = api.project.getAll.useQuery();
  const { data: teamsChannels } = api.attendance.getTeamsChannels.useQuery();
  const [form, setForm] = useState<MeetingForm>(EMPTY_FORM);

  const createMeeting = api.attendance.createMeeting.useMutation({
    onSuccess: () => {
      void utils.attendance.getMeetings.invalidate();
      onClose();
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    createMeeting.mutate({
      title: form.title,
      description: form.description || undefined,
      startTime: new Date(form.startTime),
      duration: form.duration,
      notesAllowAttendees: form.notesAllowAttendees,
      projectId: form.projectId || undefined,
      teamsChannelId: form.teamsChannelId || undefined,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">New Meeting</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Title *</label>
              <input
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Duration (minutes) *</label>
              <input
                required
                type="number"
                min={1}
                value={form.duration}
                onChange={(e) => setForm({ ...form, duration: Number(e.target.value) })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Start Date & Time *</label>
              <input
                required
                type="datetime-local"
                value={form.startTime}
                onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
              <input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Related Project</label>
              <select
                value={form.projectId}
                onChange={(e) => setForm({ ...form, projectId: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">— None —</option>
                {projects?.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center">
              <label className="flex items-center gap-2 cursor-pointer select-none mt-4">
                <input
                  type="checkbox"
                  checked={form.notesAllowAttendees}
                  onChange={(e) => setForm({ ...form, notesAllowAttendees: e.target.checked })}
                  className="rounded border-gray-300"
                />
                <span className="text-sm text-gray-700">Allow attendees to edit notes</span>
              </label>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Teams Channel
                {teamsChannels === null && (
                  <a
                    href="/dashboard/profile/edit"
                    className="ml-2 text-blue-600 hover:underline font-normal"
                  >
                    (connect Microsoft account to enable)
                  </a>
                )}
              </label>
              {teamsChannels && teamsChannels.length > 0 ? (
                <select
                  value={form.teamsChannelId}
                  onChange={(e) => setForm({ ...form, teamsChannelId: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">— Don&apos;t link to Teams —</option>
                  {teamsChannels.map((ch) => (
                    <option key={ch.id} value={ch.id}>{ch.displayName}</option>
                  ))}
                </select>
              ) : teamsChannels === null ? (
                <input
                  disabled
                  placeholder="Connect Microsoft to pick a channel"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm bg-gray-50 text-gray-400"
                />
              ) : null}
              {form.teamsChannelId && (
                <p className="text-xs text-blue-600 mt-1">
                  Will create a Teams meeting + Outlook invites for all active members.
                </p>
              )}
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={createMeeting.isPending}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {createMeeting.isPending ? "Creating…" : "Create"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
