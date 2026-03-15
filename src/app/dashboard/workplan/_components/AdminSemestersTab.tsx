"use client";

import { useState } from "react";

import { api } from "~/trpc/react";

type SemesterFormState = {
  name: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
};

const emptyForm: SemesterFormState = {
  name: "",
  startDate: "",
  endDate: "",
  isActive: false,
};

export function AdminSemestersTab() {
  const utils = api.useUtils();
  const { data: semesters, isLoading } = api.workPlan.getSemesters.useQuery();

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<SemesterFormState>(emptyForm);

  const createSemester = api.workPlan.createSemester.useMutation({
    onSuccess: () => {
      void utils.workPlan.getSemesters.invalidate();
      void utils.workPlan.getActiveSemester.invalidate();
      setShowCreate(false);
      setForm(emptyForm);
    },
  });

  const setActive = api.workPlan.setActiveSemester.useMutation({
    onSuccess: () => {
      void utils.workPlan.getSemesters.invalidate();
      void utils.workPlan.getActiveSemester.invalidate();
    },
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  }

  function handleSubmit() {
    if (!form.name.trim() || !form.startDate || !form.endDate) return;
    createSemester.mutate({
      name: form.name,
      startDate: new Date(form.startDate),
      endDate: new Date(form.endDate),
      isActive: form.isActive,
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">
          {semesters?.length ?? 0} semester{semesters?.length !== 1 ? "s" : ""}
        </p>
        <button
          onClick={() => setShowCreate((v) => !v)}
          className="text-sm px-4 py-2 bg-[#1a2744] text-white rounded-lg hover:bg-[#243660] transition-colors"
        >
          {showCreate ? "Cancel" : "+ New Semester"}
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 mb-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Label>Semester Name *</Label>
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                className={inputCls}
                placeholder="e.g. Spring 2026"
              />
            </div>
            <div>
              <Label>Start Date *</Label>
              <input
                name="startDate"
                type="date"
                value={form.startDate}
                onChange={handleChange}
                className={inputCls}
              />
            </div>
            <div>
              <Label>End Date *</Label>
              <input
                name="endDate"
                type="date"
                value={form.endDate}
                onChange={handleChange}
                className={inputCls}
              />
            </div>
            <div className="sm:col-span-2 flex items-center gap-2">
              <input
                id="semIsActive"
                name="isActive"
                type="checkbox"
                checked={form.isActive}
                onChange={handleChange}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="semIsActive" className="text-sm text-gray-700">
                Set as active semester (deactivates current active)
              </label>
            </div>
          </div>

          {createSemester.error && (
            <p className="text-xs text-red-600">{createSemester.error.message}</p>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleSubmit}
              disabled={createSemester.isPending}
              className="text-sm px-4 py-2 bg-[#1a2744] text-white rounded-lg hover:bg-[#243660] disabled:opacity-50 transition-colors"
            >
              {createSemester.isPending ? "Creating…" : "Create Semester"}
            </button>
            <button
              onClick={() => { setShowCreate(false); setForm(emptyForm); }}
              className="text-sm px-4 py-2 border border-gray-200 text-gray-600 rounded-lg hover:bg-white transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {isLoading && <p className="text-sm text-gray-400">Loading…</p>}

      {/* Semester list */}
      <div className="space-y-3">
        {semesters?.map((semester) => (
          <div
            key={semester.id}
            className={`bg-white rounded-xl border p-4 shadow-sm flex items-center justify-between gap-4 ${
              semester.isActive ? "border-blue-300" : "border-gray-200"
            }`}
          >
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-900 text-sm">
                  {semester.name}
                </span>
                {semester.isActive && (
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                    Active
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                {new Date(semester.startDate).toLocaleDateString()} →{" "}
                {new Date(semester.endDate).toLocaleDateString()}
              </p>
            </div>

            {!semester.isActive && (
              <button
                onClick={() => setActive.mutate({ id: semester.id })}
                disabled={setActive.isPending}
                className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors flex-shrink-0"
              >
                {setActive.isPending ? "Setting…" : "Set Active"}
              </button>
            )}
          </div>
        ))}

        {!isLoading && semesters?.length === 0 && !showCreate && (
          <p className="text-sm text-gray-400">
            No semesters yet. Create the first one above.
          </p>
        )}
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
