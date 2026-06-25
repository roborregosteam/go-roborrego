"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { api } from "~/trpc/react";
import type { RouterOutputs } from "~/trpc/react";
import { CompletionBadge } from "../_components/WorkPlanClient";

export function MemberProgressClient({
  memberId,
  isAdmin,
  isSelf,
  backHref,
}: {
  memberId: string;
  isAdmin: boolean;
  isSelf: boolean;
  backHref: string;
}) {
  const utils = api.useUtils();
  const { data: member } = api.member.getById.useQuery({ id: memberId });
  const { data: semesters } = api.workPlan.getSemesters.useQuery();
  const { data: activeSemester } = api.workPlan.getActiveSemester.useQuery();

  const storageKey = `workplan_member_semester_${memberId}`;

  const [semesterId, setSemesterId] = useState<string | null>(
    () => sessionStorage.getItem(storageKey),
  );
  const [search, setSearch] = useState("");
  const [filterInterested, setFilterInterested] = useState(false);
  const [filterDone, setFilterDone] = useState(false);

  const handleSemesterChange = (id: string) => {
    setSemesterId(id);
    sessionStorage.setItem(storageKey, id);
  };

  useEffect(() => {
    if (activeSemester && semesterId === null) {
      setSemesterId(activeSemester.id);
      sessionStorage.setItem(storageKey, activeSemester.id);
    }
  }, [activeSemester, semesterId, storageKey]);

  const { data: summary } = api.workPlan.getMemberSummary.useQuery(
    { semesterId: semesterId!, userId: memberId },
    { enabled: !!semesterId },
  );

  const { data: wf } = api.workPlan.getWarningsAndFaults.useQuery(
    { userId: memberId, semesterId: semesterId! },
    { enabled: !!semesterId && (isAdmin || isSelf) },
  );

  const setCondicionado = api.workPlan.setCondicionado.useMutation({
    onSuccess: () => void utils.workPlan.getWarningsAndFaults.invalidate(),
  });
  const [showCondicionadoForm, setShowCondicionadoForm] = useState(false);
  const [condicionadoReason, setCondicionadoReasonState] = useState("");

  const addWarning = api.workPlan.addWarning.useMutation({
    onSuccess: () => {
      void utils.workPlan.getWarningsAndFaults.invalidate();
      void utils.workPlan.getMemberSummary.invalidate();
    },
  });
  const removeWarning = api.workPlan.removeWarning.useMutation({
    onSuccess: () => void utils.workPlan.getWarningsAndFaults.invalidate(),
  });
  const addFault = api.workPlan.addFault.useMutation({
    onSuccess: () => {
      void utils.workPlan.getWarningsAndFaults.invalidate();
      void utils.workPlan.getMemberSummary.invalidate();
    },
  });
  const removeFault = api.workPlan.removeFault.useMutation({
    onSuccess: () => {
      void utils.workPlan.getWarningsAndFaults.invalidate();
      void utils.workPlan.getMemberSummary.invalidate();
    },
  });

  const { data: activities, isLoading: activitiesLoading } =
    api.workPlan.getMemberActivities.useQuery(
      { semesterId: semesterId!, userId: memberId },
      { enabled: !!semesterId },
    );

  const toggleInterest = api.workPlan.adminToggleInterest.useMutation({
    onSuccess: () => {
      void utils.workPlan.getMemberActivities.invalidate();
      void utils.workPlan.getMemberSummary.invalidate();
    },
  });

  const toggleCompletion = api.workPlan.adminToggleCompletion.useMutation({
    onSuccess: () => {
      void utils.workPlan.getMemberActivities.invalidate();
      void utils.workPlan.getMemberSummary.invalidate();
    },
  });

  const filtered = (activities ?? []).filter((a) => {
    const q = search.trim().toLowerCase();
    if (q && !a.name.toLowerCase().includes(q) && !a.description.toLowerCase().includes(q)) {
      return false;
    }
    if (filterInterested || filterDone) {
      const matchesInterest = filterInterested && a.isInterested;
      const matchesDone = filterDone && a.completion?.status === "APPROVED";
      if (!matchesInterest && !matchesDone) return false;
    }
    return true;
  });

  const mandatory = filtered.filter((a) => a.isMandatory);
  const optional = filtered.filter((a) => !a.isMandatory);

  return (
    <div className="max-w-3xl">
      {/* Back + header */}
      <div className="mb-6">
        <Link
          href={backHref}
          className="text-xs text-gray-400 hover:text-gray-600 mb-2 inline-block"
        >
          ← {backHref.includes("members") ? "Roster" : "Work Plan"}
        </Link>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            {member?.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={member.image} alt="" className="w-10 h-10 rounded-full" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <span className="text-blue-600 font-bold">
                  {member?.name?.charAt(0) ?? "?"}
                </span>
              </div>
            )}
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold text-gray-900">{member?.name ?? "…"}</h1>
                {wf?.condicionado && (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 border border-orange-200">
                    Condicionado
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-400">{member?.email}</p>
              {wf?.condicionado && wf.condicionadoReason && (
                <p className="text-xs text-orange-600 mt-0.5">Motivo: {wf.condicionadoReason}</p>
              )}
            </div>
            {isAdmin && wf && (
              <div className="ml-2 flex flex-col items-start gap-1">
                {wf.condicionado ? (
                  <button
                    onClick={() => {
                      setCondicionado.mutate({ userId: memberId, condicionado: false });
                      setShowCondicionadoForm(false);
                      setCondicionadoReasonState("");
                    }}
                    disabled={setCondicionado.isPending}
                    className="text-xs px-3 py-1 rounded-full border bg-orange-100 text-orange-700 border-orange-300 hover:bg-orange-200 transition-colors"
                  >
                    Quitar condicionado
                  </button>
                ) : showCondicionadoForm ? (
                  <div className="flex flex-col gap-1.5 min-w-[220px]">
                    <input
                      autoFocus
                      type="text"
                      placeholder="Motivo (requerido)"
                      value={condicionadoReason}
                      onChange={(e) => setCondicionadoReasonState(e.target.value)}
                      className="text-xs rounded border border-orange-300 px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-orange-400"
                    />
                    <div className="flex gap-1">
                      <button
                        onClick={() => {
                          if (!condicionadoReason.trim()) return;
                          setCondicionado.mutate({
                            userId: memberId,
                            condicionado: true,
                            reason: condicionadoReason.trim(),
                          });
                          setShowCondicionadoForm(false);
                          setCondicionadoReasonState("");
                        }}
                        disabled={!condicionadoReason.trim() || setCondicionado.isPending}
                        className="text-xs px-2 py-1 bg-orange-600 text-white rounded hover:bg-orange-700 disabled:opacity-40 transition-colors"
                      >
                        Confirmar
                      </button>
                      <button
                        onClick={() => { setShowCondicionadoForm(false); setCondicionadoReasonState(""); }}
                        className="text-xs px-2 py-1 text-gray-500 rounded hover:bg-gray-100 transition-colors"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowCondicionadoForm(true)}
                    className="text-xs px-3 py-1 rounded-full border bg-white text-gray-500 border-gray-300 hover:border-orange-300 hover:text-orange-600 transition-colors"
                  >
                    Marcar condicionado
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Semester selector */}
          {semesters && semesters.length > 0 && (
            <select
              value={semesterId ?? ""}
              onChange={(e) => handleSemesterChange(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {semesters.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}{s.isActive ? " (active)" : ""}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <StatCard
            label="Puntos Netos"
            value={summary.netPoints}
            note={summary.faultPoints > 0 ? `−${summary.faultPoints} por faltas` : undefined}
            highlight={summary.faultPoints > 0}
          />
          <StatCard
            label="Tentative Points"
            value={summary.tentativePoints}
            note="from interests"
          />
          <StatCard label="Interested In" value={summary.interestedCount} />
          <StatCard
            label="Mandatory"
            value={`${summary.mandatoryCompleted} / ${summary.mandatoryTotal}`}
            highlight={summary.mandatoryCompleted < summary.mandatoryTotal}
          />
        </div>
      )}

      {/* Warnings & Faults */}
      {(isAdmin || isSelf) && wf && semesterId && (
        <WarningsAndFaultsPanel
          memberId={memberId}
          semesterId={semesterId}
          warnings={wf.warnings}
          faults={wf.faults}
          isAdmin={isAdmin}
          onAddWarning={(name, description) =>
            addWarning.mutate({ userId: memberId, semesterId: semesterId ?? "", name, description })
          }
          onRemoveWarning={(id) => removeWarning.mutate({ id })}
          onAddFault={(name, description, points) =>
            addFault.mutate({ userId: memberId, semesterId: semesterId ?? "", name, description, points })
          }
          onRemoveFault={(id) => removeFault.mutate({ id })}
        />
      )}

      {/* Search + filters */}
      {activities && activities.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <input
            type="search"
            placeholder="Search activities…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 min-w-[180px] rounded-lg border border-gray-300 px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={() => setFilterInterested((v) => !v)}
            className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
              filterInterested
                ? "bg-blue-50 text-blue-700 border-blue-300"
                : "bg-white text-gray-500 border-gray-300 hover:bg-gray-50"
            }`}
          >
            ★ Interested
          </button>
          <button
            onClick={() => setFilterDone((v) => !v)}
            className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
              filterDone
                ? "bg-green-50 text-green-700 border-green-300"
                : "bg-white text-gray-500 border-gray-300 hover:bg-gray-50"
            }`}
          >
            ✓ Done
          </button>
        </div>
      )}

      {/* Activities */}
      {!semesterId ? (
        <p className="text-sm text-gray-400">No active semester.</p>
      ) : activitiesLoading ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : !activities?.length ? (
        <p className="text-sm text-gray-400">No activities for this semester.</p>
      ) : !filtered.length ? (
        <p className="text-sm text-gray-400">No activities match the current filters.</p>
      ) : (
        <div className="space-y-6">
          {mandatory.length > 0 && (
            <ActivitySection
              title="Mandatory"
              activities={mandatory}
              isAdmin={isAdmin}
              memberId={memberId}
              onToggleInterest={(activityId) =>
                toggleInterest.mutate({ userId: memberId, activityId })
              }
              onToggleCompletion={(activityId) =>
                toggleCompletion.mutate({ userId: memberId, activityId })
              }
            />
          )}
          {optional.length > 0 && (
            <ActivitySection
              title={mandatory.length > 0 ? "Optional" : "All Activities"}
              activities={optional}
              isAdmin={isAdmin}
              memberId={memberId}
              onToggleInterest={(activityId) =>
                toggleInterest.mutate({ userId: memberId, activityId })
              }
              onToggleCompletion={(activityId) =>
                toggleCompletion.mutate({ userId: memberId, activityId })
              }
            />
          )}
        </div>
      )}
    </div>
  );
}

type Activity = {
  id: string;
  name: string;
  description: string;
  points: number;
  isMandatory: boolean;
  estimatedDate: Date | null;
  adminMessage: string | null;
  isInterested: boolean;
  completion: {
    status: string;
    note: string;
    adminNote: string | null;
  } | null;
};

function ActivitySection({
  title,
  activities,
  isAdmin,
  memberId: _memberId,
  onToggleInterest,
  onToggleCompletion,
}: {
  title: string;
  activities: Activity[];
  isAdmin: boolean;
  memberId: string;
  onToggleInterest: (activityId: string) => void;
  onToggleCompletion: (activityId: string) => void;
}) {
  return (
    <div>
      <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
        {title}
      </h2>
      <div className="space-y-3">
        {activities.map((a) => (
          <ActivityRow
            key={a.id}
            activity={a}
            isAdmin={isAdmin}
            onToggleInterest={() => onToggleInterest(a.id)}
            onToggleCompletion={() => onToggleCompletion(a.id)}
          />
        ))}
      </div>
    </div>
  );
}

function ActivityRow({
  activity,
  isAdmin,
  onToggleInterest,
  onToggleCompletion,
}: {
  activity: Activity;
  isAdmin: boolean;
  onToggleInterest: () => void;
  onToggleCompletion: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const isApproved = activity.completion?.status === "APPROVED";

  return (
    <div
      className={`bg-white rounded-xl border p-4 shadow-sm ${
        activity.isMandatory ? "border-amber-200" : "border-gray-200"
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Status indicator */}
        <div className="mt-0.5 shrink-0">
          {activity.completion?.status === "APPROVED" ? (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-green-100 text-green-600 text-xs font-bold">✓</span>
          ) : activity.completion?.status === "PENDING" ? (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-yellow-100 text-yellow-600 text-xs">…</span>
          ) : activity.completion?.status === "REJECTED" ? (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-100 text-red-600 text-xs font-bold">✕</span>
          ) : activity.isInterested ? (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-50 text-blue-500 text-xs">★</span>
          ) : (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-100 text-gray-300 text-xs">○</span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-0.5">
            <h3 className="font-semibold text-gray-900 text-sm">{activity.name}</h3>
            <span className="text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-medium">
              {activity.points} pts
            </span>
            {activity.completion && (
              <CompletionBadge status={activity.completion.status} />
            )}
            {!activity.completion && activity.isInterested && (
              <span className="text-xs bg-blue-50 text-blue-600 border border-blue-200 px-1.5 py-0.5 rounded">
                Interested
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500">{activity.description}</p>
          {activity.estimatedDate && (
            <p className="text-xs text-gray-400 mt-0.5">
              Est. {new Date(activity.estimatedDate).toLocaleDateString()}
            </p>
          )}
        </div>

        {/* Right-side actions */}
        <div className="flex items-center gap-2 shrink-0">
          {isAdmin && (
            <>
              <button
                onClick={onToggleInterest}
                title={activity.isInterested ? "Remove interest" : "Mark as interested"}
                className={`text-xs px-2 py-1 rounded border transition-colors ${
                  activity.isInterested
                    ? "bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100"
                    : "bg-gray-50 text-gray-400 border-gray-200 hover:bg-gray-100"
                }`}
              >
                {activity.isInterested ? "★ Interested" : "☆ Interest"}
              </button>
              <button
                onClick={onToggleCompletion}
                title={isApproved ? "Remove completion" : "Mark as completed"}
                className={`text-xs px-2 py-1 rounded border transition-colors ${
                  isApproved
                    ? "bg-green-50 text-green-600 border-green-200 hover:bg-green-100"
                    : "bg-gray-50 text-gray-400 border-gray-200 hover:bg-gray-100"
                }`}
              >
                {isApproved ? "✓ Done" : "○ Mark done"}
              </button>
            </>
          )}
          {activity.completion && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              {expanded ? "Hide" : "Details"}
            </button>
          )}
        </div>
      </div>

      {/* Expanded submission detail */}
      {expanded && activity.completion && (
        <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
          <div>
            <p className="text-xs font-medium text-gray-500 mb-1">Submission note</p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{activity.completion.note}</p>
          </div>
          {activity.completion.adminNote && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">Admin feedback</p>
              <p className="text-sm text-gray-700">{activity.completion.adminNote}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  note,
  highlight,
}: {
  label: string;
  value: string | number;
  note?: string;
  highlight?: boolean;
}) {
  return (
    <div className={`rounded-xl border p-4 shadow-sm ${highlight ? "bg-amber-50 border-amber-200" : "bg-white border-gray-200"}`}>
      <p className="text-xs text-gray-500 font-medium mb-1">{label}</p>
      <p className={`text-2xl font-bold ${highlight ? "text-amber-700" : "text-gray-900"}`}>
        {value}
      </p>
      {note && <p className={`text-xs mt-0.5 ${highlight ? "text-amber-600" : "text-gray-400"}`}>{note}</p>}
    </div>
  );
}

type WF = RouterOutputs["workPlan"]["getWarningsAndFaults"];

function WarningsAndFaultsPanel({
  memberId: _memberId,
  semesterId: _semesterId,
  warnings,
  faults,
  isAdmin,
  onAddWarning,
  onRemoveWarning,
  onAddFault,
  onRemoveFault,
}: {
  memberId: string;
  semesterId: string;
  warnings: WF["warnings"];
  faults: WF["faults"];
  isAdmin: boolean;
  onAddWarning: (name: string, description?: string) => void;
  onRemoveWarning: (id: string) => void;
  onAddFault: (name: string, description: string | undefined, points: number) => void;
  onRemoveFault: (id: string) => void;
}) {
  const [warningName, setWarningName] = useState("");
  const [warningDesc, setWarningDesc] = useState("");
  const [faultName, setFaultName] = useState("");
  const [faultDesc, setFaultDesc] = useState("");
  const [faultPoints, setFaultPoints] = useState("1");
  const [showWarningForm, setShowWarningForm] = useState(false);
  const [showFaultForm, setShowFaultForm] = useState(false);

  const totalFaultPoints = faults.reduce((s, f) => s + f.points, 0);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
      {/* Advertencias */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-yellow-800">
            Advertencias ({warnings.length})
          </h3>
          {isAdmin && (
            <button
              onClick={() => setShowWarningForm((v) => !v)}
              className="text-xs px-2 py-1 bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200 border border-yellow-300 transition-colors"
            >
              {showWarningForm ? "Cancelar" : "+ Agregar"}
            </button>
          )}
        </div>

        {isAdmin && showWarningForm && (
          <div className="mb-3 space-y-2">
            <input
              type="text"
              placeholder="Nombre*"
              value={warningName}
              onChange={(e) => setWarningName(e.target.value)}
              className="w-full text-xs rounded border border-yellow-300 bg-white px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-yellow-400"
            />
            <input
              type="text"
              placeholder="Descripción (opcional)"
              value={warningDesc}
              onChange={(e) => setWarningDesc(e.target.value)}
              className="w-full text-xs rounded border border-yellow-300 bg-white px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-yellow-400"
            />
            <button
              onClick={() => {
                if (!warningName.trim()) return;
                onAddWarning(warningName.trim(), warningDesc.trim() || undefined);
                setWarningName("");
                setWarningDesc("");
                setShowWarningForm(false);
              }}
              disabled={!warningName.trim()}
              className="text-xs px-3 py-1.5 bg-yellow-600 text-white rounded hover:bg-yellow-700 disabled:opacity-40 transition-colors"
            >
              Guardar advertencia
            </button>
          </div>
        )}

        {warnings.length === 0 ? (
          <p className="text-xs text-yellow-700/60">Sin advertencias.</p>
        ) : (
          <div className="space-y-2">
            {warnings.map((w) => (
              <div key={w.id} className="bg-white rounded-lg border border-yellow-200 px-3 py-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-gray-800">{w.name}</p>
                    {w.description && (
                      <p className="text-xs text-gray-500 mt-0.5">{w.description}</p>
                    )}
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      por {w.creator.name} · {new Date(w.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  {isAdmin && (
                    <button
                      onClick={() => onRemoveWarning(w.id)}
                      className="text-xs text-gray-400 hover:text-red-500 shrink-0"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Faltas */}
      <div className="bg-red-50 border border-red-200 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-red-800">
            Faltas ({faults.length})
            {totalFaultPoints > 0 && (
              <span className="ml-1.5 text-xs font-normal text-red-600">
                −{totalFaultPoints} pts
              </span>
            )}
          </h3>
          {isAdmin && (
            <button
              onClick={() => setShowFaultForm((v) => !v)}
              className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 border border-red-300 transition-colors"
            >
              {showFaultForm ? "Cancelar" : "+ Agregar"}
            </button>
          )}
        </div>

        {isAdmin && showFaultForm && (
          <div className="mb-3 space-y-2">
            <input
              type="text"
              placeholder="Nombre*"
              value={faultName}
              onChange={(e) => setFaultName(e.target.value)}
              className="w-full text-xs rounded border border-red-300 bg-white px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-red-400"
            />
            <input
              type="text"
              placeholder="Descripción (opcional)"
              value={faultDesc}
              onChange={(e) => setFaultDesc(e.target.value)}
              className="w-full text-xs rounded border border-red-300 bg-white px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-red-400"
            />
            <div className="flex items-center gap-2">
              <label className="text-xs text-red-700 shrink-0">Puntos de penalización:</label>
              <input
                type="number"
                min="1"
                value={faultPoints}
                onChange={(e) => setFaultPoints(e.target.value)}
                className="w-20 text-xs rounded border border-red-300 bg-white px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-red-400"
              />
            </div>
            <button
              onClick={() => {
                const pts = parseInt(faultPoints, 10);
                if (!faultName.trim() || !pts || pts < 1) return;
                onAddFault(faultName.trim(), faultDesc.trim() || undefined, pts);
                setFaultName("");
                setFaultDesc("");
                setFaultPoints("1");
                setShowFaultForm(false);
              }}
              disabled={!faultName.trim() || !parseInt(faultPoints, 10)}
              className="text-xs px-3 py-1.5 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-40 transition-colors"
            >
              Guardar falta
            </button>
          </div>
        )}

        {faults.length === 0 ? (
          <p className="text-xs text-red-700/60">Sin faltas.</p>
        ) : (
          <div className="space-y-2">
            {faults.map((f) => (
              <div key={f.id} className="bg-white rounded-lg border border-red-200 px-3 py-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="text-xs font-semibold text-gray-800">{f.name}</p>
                      <span className="text-[10px] font-medium text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded">
                        −{f.points} pts
                      </span>
                    </div>
                    {f.description && (
                      <p className="text-xs text-gray-500 mt-0.5">{f.description}</p>
                    )}
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      por {f.creator.name} · {new Date(f.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  {isAdmin && (
                    <button
                      onClick={() => onRemoveFault(f.id)}
                      className="text-xs text-gray-400 hover:text-red-500 shrink-0"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
