"use client";

import { useState } from "react";

import { api } from "~/trpc/react";

type ActivityFormState = {
  name: string;
  description: string;
  points: string;
  estimatedDate: string;
  adminMessage: string;
  isMandatory: boolean;
};

const emptyForm: ActivityFormState = {
  name: "",
  description: "",
  points: "",
  estimatedDate: "",
  adminMessage: "",
  isMandatory: false,
};

export function AdminActivitiesTab({
  semesterId,
  semesterName,
}: {
  semesterId: string;
  semesterName: string;
}) {
  const utils = api.useUtils();

  const { data: activities, isLoading } = api.workPlan.getActivities.useQuery({
    semesterId,
  });

  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ActivityFormState>(emptyForm);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const createActivity = api.workPlan.createActivity.useMutation({
    onSuccess: () => {
      void utils.workPlan.getActivities.invalidate();
      setShowCreate(false);
      setForm(emptyForm);
    },
  });

  const updateActivity = api.workPlan.updateActivity.useMutation({
    onSuccess: () => {
      void utils.workPlan.getActivities.invalidate();
      setEditingId(null);
      setForm(emptyForm);
    },
  });

  const deleteActivity = api.workPlan.deleteActivity.useMutation({
    onSuccess: () => {
      void utils.workPlan.getActivities.invalidate();
      setDeletingId(null);
    },
  });

  function openEdit(activity: NonNullable<typeof activities>[number]) {
    setEditingId(activity.id);
    setShowCreate(false);
    setForm({
      name: activity.name,
      description: activity.description,
      points: String(activity.points),
      estimatedDate: activity.estimatedDate
        ? new Date(activity.estimatedDate).toISOString().slice(0, 10)
        : "",
      adminMessage: activity.adminMessage ?? "",
      isMandatory: activity.isMandatory,
    });
  }

  function handleFormChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) {
    const { name, value, type } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }));
  }

  function submitCreate() {
    if (!form.name.trim() || !form.description.trim() || !form.points) return;
    createActivity.mutate({
      semesterId,
      name: form.name,
      description: form.description,
      points: parseInt(form.points),
      estimatedDate: form.estimatedDate ? new Date(form.estimatedDate) : undefined,
      adminMessage: form.adminMessage || undefined,
      isMandatory: form.isMandatory,
    });
  }

  function submitEdit() {
    if (!editingId) return;
    updateActivity.mutate({
      id: editingId,
      name: form.name || undefined,
      description: form.description || undefined,
      points: form.points ? parseInt(form.points) : undefined,
      estimatedDate: form.estimatedDate ? new Date(form.estimatedDate) : undefined,
      adminMessage: form.adminMessage || undefined,
      isMandatory: form.isMandatory,
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">
          {activities?.length ?? 0} activities in{" "}
          <span className="font-medium text-gray-700">{semesterName}</span>
        </p>
        <button
          onClick={() => {
            setShowCreate((v) => !v);
            setEditingId(null);
            setForm(emptyForm);
          }}
          className="text-sm px-4 py-2 bg-[#1a2744] text-white rounded-lg hover:bg-[#243660] transition-colors"
        >
          {showCreate ? "Cancel" : "+ Add Activity"}
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <ActivityForm
          form={form}
          onChange={handleFormChange}
          onSubmit={submitCreate}
          onCancel={() => { setShowCreate(false); setForm(emptyForm); }}
          isPending={createActivity.isPending}
          error={createActivity.error?.message}
          submitLabel="Create Activity"
        />
      )}

      {isLoading && <p className="text-sm text-gray-400">Loading…</p>}

      <div className="space-y-3 mt-4">
        {activities?.map((activity) => (
          <div key={activity.id}>
            {editingId === activity.id ? (
              <ActivityForm
                form={form}
                onChange={handleFormChange}
                onSubmit={submitEdit}
                onCancel={() => { setEditingId(null); setForm(emptyForm); }}
                isPending={updateActivity.isPending}
                error={updateActivity.error?.message}
                submitLabel="Save Changes"
              />
            ) : (
              <div
                className={`bg-white rounded-xl border p-4 shadow-sm ${
                  activity.isMandatory ? "border-amber-200" : "border-gray-200"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="font-semibold text-gray-900 text-sm">
                        {activity.name}
                      </span>
                      <span className="text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-medium">
                        {activity.points} pts
                      </span>
                      {activity.isMandatory && (
                        <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">
                          Mandatory
                        </span>
                      )}
                    </div>
                    <p className="text-gray-500 text-sm">{activity.description}</p>
                    {activity.adminMessage && (
                      <p className="mt-1 text-xs text-blue-600 bg-blue-50 border border-blue-100 rounded px-2 py-1">
                        📋 {activity.adminMessage}
                      </p>
                    )}
                    {activity.estimatedDate && (
                      <p className="mt-1 text-xs text-gray-400">
                        Est. {new Date(activity.estimatedDate).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => openEdit(activity)}
                      className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                      Edit
                    </button>
                    {deletingId === activity.id ? (
                      <div className="flex gap-1">
                        <button
                          onClick={() => deleteActivity.mutate({ id: activity.id })}
                          disabled={deleteActivity.isPending}
                          className="text-xs px-3 py-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
                        >
                          {deleteActivity.isPending ? "Deleting…" : "Confirm"}
                        </button>
                        <button
                          onClick={() => setDeletingId(null)}
                          className="text-xs px-2 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeletingId(activity.id)}
                        className="text-xs px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
        {!isLoading && activities?.length === 0 && !showCreate && (
          <p className="text-sm text-gray-400">
            No activities yet. Add the first one above.
          </p>
        )}
      </div>
    </div>
  );
}

function ActivityForm({
  form,
  onChange,
  onSubmit,
  onCancel,
  isPending,
  error,
  submitLabel,
}: {
  form: ActivityFormState;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onSubmit: () => void;
  onCancel: () => void;
  isPending: boolean;
  error?: string;
  submitLabel: string;
}) {
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 mb-4 space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <Label>Activity Name *</Label>
          <input
            name="name"
            value={form.name}
            onChange={onChange}
            className={inputCls}
            placeholder="e.g. Present at RoboMed 2026"
          />
        </div>

        <div className="sm:col-span-2">
          <Label>Description *</Label>
          <textarea
            name="description"
            value={form.description}
            onChange={onChange}
            rows={2}
            className={inputCls + " resize-none"}
            placeholder="What is this activity about?"
          />
        </div>

        <div>
          <Label>Points *</Label>
          <input
            name="points"
            type="number"
            min={1}
            value={form.points}
            onChange={onChange}
            className={inputCls}
            placeholder="e.g. 10"
          />
        </div>

        <div>
          <Label>Estimated Date</Label>
          <input
            name="estimatedDate"
            type="date"
            value={form.estimatedDate}
            onChange={onChange}
            className={inputCls}
          />
        </div>

        <div className="sm:col-span-2">
          <Label>Submission Instructions</Label>
          <input
            name="adminMessage"
            value={form.adminMessage}
            onChange={onChange}
            className={inputCls}
            placeholder="What should members include in their submission note?"
          />
        </div>

        <div className="sm:col-span-2 flex items-center gap-2">
          <input
            id="isMandatory"
            name="isMandatory"
            type="checkbox"
            checked={form.isMandatory}
            onChange={onChange}
            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <label htmlFor="isMandatory" className="text-sm text-gray-700">
            Mandatory for all active members
          </label>
        </div>
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      <div className="flex gap-2">
        <button
          onClick={onSubmit}
          disabled={isPending}
          className="text-sm px-4 py-2 bg-[#1a2744] text-white rounded-lg hover:bg-[#243660] disabled:opacity-50 transition-colors"
        >
          {isPending ? "Saving…" : submitLabel}
        </button>
        <button
          onClick={onCancel}
          className="text-sm px-4 py-2 border border-gray-200 text-gray-600 rounded-lg hover:bg-white transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

const inputCls =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500";

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
      {children}
    </label>
  );
}
