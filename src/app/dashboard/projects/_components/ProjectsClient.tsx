"use client";

import { useState, useMemo } from "react";
import Link from "next/link";

import { api, type RouterOutputs } from "~/trpc/react";

type Project = RouterOutputs["project"]["getAll"][0];
type StatusFilter = "ALL" | "ACTIVE" | "COMPLETED" | "ARCHIVED";

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: "bg-green-50 text-green-700 border-green-200",
  COMPLETED: "bg-blue-50 text-blue-700 border-blue-200",
  ARCHIVED: "bg-gray-100 text-gray-500 border-gray-200",
};

const STATUS_FILTER_LABELS: { value: StatusFilter; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "ACTIVE", label: "Active" },
  { value: "COMPLETED", label: "Completed" },
  { value: "ARCHIVED", label: "Archived" },
];

export function ProjectsClient({
  userId,
  userRole,
}: {
  userId: string;
  userRole: "MEMBER" | "ADMIN";
}) {
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");

  const { data: projects, isPending } = api.project.getAll.useQuery();
  const utils = api.useUtils();

  function onCreated() {
    setShowCreate(false);
    void utils.project.getAll.invalidate();
  }

  const filtered = useMemo(() => {
    if (!projects) return [];
    const q = search.trim().toLowerCase();
    return projects.filter((p) => {
      if (statusFilter !== "ALL" && p.status !== statusFilter) return false;
      if (q) {
        const inName = p.name.toLowerCase().includes(q);
        const inDesc = p.description?.toLowerCase().includes(q) ?? false;
        if (!inName && !inDesc) return false;
      }
      return true;
    });
  }, [projects, search, statusFilter]);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
          <p className="text-sm text-gray-500 mt-1">
            {filtered.length} project{filtered.length !== 1 ? "s" : ""}
            {projects && filtered.length !== projects.length ? ` of ${projects.length}` : ""}
          </p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          + New Project
        </button>
      </div>

      {/* Search + filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or description…"
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <div className="flex gap-1">
          {STATUS_FILTER_LABELS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setStatusFilter(value)}
              className={`px-3 py-1.5 text-xs rounded-lg border font-medium transition-colors ${
                statusFilter === value
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {showCreate && (
        <div className="mb-6">
          <CreateProjectForm onDone={onCreated} onCancel={() => setShowCreate(false)} />
        </div>
      )}

      {isPending ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : !filtered.length ? (
        <div className="text-center py-16 text-gray-400">
          {projects?.length ? (
            <>
              <p className="text-lg font-medium">No projects match</p>
              <p className="text-sm mt-1">Try a different search or filter.</p>
            </>
          ) : (
            <>
              <p className="text-lg font-medium">No projects yet</p>
              <p className="text-sm mt-1">Create your first project to get started.</p>
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}
    </div>
  );
}

function ProjectCard({ project }: { project: Project }) {
  return (
    <Link
      href={`/dashboard/projects/${project.id}`}
      className="block bg-white rounded-xl border border-gray-200 shadow-sm p-5 hover:shadow-md hover:border-blue-200 transition-all"
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <h2 className="font-semibold text-gray-900 leading-snug line-clamp-2">
          {project.name}
        </h2>
        <div className="flex gap-1 shrink-0">
          {project.isPrivate && (
            <span className="text-xs px-2 py-0.5 rounded border font-medium bg-gray-100 text-gray-500 border-gray-200">
              Private
            </span>
          )}
          <span
            className={`text-xs px-2 py-0.5 rounded border font-medium ${STATUS_STYLES[project.status] ?? ""}`}
          >
            {project.status.charAt(0) + project.status.slice(1).toLowerCase()}
          </span>
        </div>
      </div>

      {project.description && (
        <p className="text-sm text-gray-500 line-clamp-2 mb-3">
          {project.description}
        </p>
      )}

      <div className="flex items-center justify-between text-xs text-gray-400 mt-auto">
        <div className="flex gap-3">
          <span>{project._count.members} member{project._count.members !== 1 ? "s" : ""}</span>
          <span>{project._count.tasks} task{project._count.tasks !== 1 ? "s" : ""}</span>
        </div>
        {project.subTeam && (
          <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
            {project.subTeam}
          </span>
        )}
      </div>

      {project.myRole && (
        <div className="mt-2 pt-2 border-t border-gray-100">
          <span className="text-xs text-blue-600 font-medium">
            {project.myRole === "PROJECT_MANAGER" ? "Project Manager" : "Member"}
          </span>
        </div>
      )}
    </Link>
  );
}

function CreateProjectForm({
  onDone,
  onCancel,
}: {
  onDone: () => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({
    name: "",
    description: "",
    subTeam: "",
    githubRepo: "",
    isPrivate: false,
  });

  const createProject = api.project.create.useMutation({ onSuccess: onDone });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    createProject.mutate({
      name: form.name,
      description: form.description || undefined,
      subTeam: form.subTeam || undefined,
      githubRepo: form.githubRepo || undefined,
      isPrivate: form.isPrivate,
    });
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
      <h2 className="font-semibold text-gray-900 mb-4">New Project</h2>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Name *
            </label>
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Project name"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Sub-team
            </label>
            <input
              value={form.subTeam}
              onChange={(e) => setForm({ ...form, subTeam: e.target.value })}
              placeholder="e.g. RoboCup"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Description
          </label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="What is this project about?"
            rows={2}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            GitHub Repo URL
          </label>
          <input
            type="url"
            value={form.githubRepo}
            onChange={(e) => setForm({ ...form, githubRepo: e.target.value })}
            placeholder="https://github.com/…"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={form.isPrivate}
            onChange={(e) => setForm({ ...form, isPrivate: e.target.checked })}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-700">Private — hidden from non-members</span>
        </label>
        <div className="flex gap-2 pt-1">
          <button
            type="submit"
            disabled={createProject.isPending}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {createProject.isPending ? "Creating…" : "Create Project"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
        </div>

        {createProject.error && (
          <p className="text-sm text-red-600">{createProject.error.message}</p>
        )}
      </form>
    </div>
  );
}
