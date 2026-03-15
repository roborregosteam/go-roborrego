"use client";

import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { useDroppable, useDraggable } from "@dnd-kit/core";

import { api, type RouterOutputs } from "~/trpc/react";

type Task = RouterOutputs["project"]["getTasks"][0];
type TaskStatus = "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE";

const COLUMNS: { id: TaskStatus; label: string; color: string }[] = [
  { id: "TODO", label: "To Do", color: "bg-gray-100" },
  { id: "IN_PROGRESS", label: "In Progress", color: "bg-blue-50" },
  { id: "IN_REVIEW", label: "In Review", color: "bg-yellow-50" },
  { id: "DONE", label: "Done", color: "bg-green-50" },
];

const PRIORITY_STYLES: Record<string, string> = {
  LOW: "bg-gray-100 text-gray-500",
  MEDIUM: "bg-blue-50 text-blue-600",
  HIGH: "bg-orange-50 text-orange-600",
  URGENT: "bg-red-50 text-red-600",
};

export function BoardTab({
  projectId,
  isMember,
  userId,
  onSelectTask,
  selectedTaskId,
}: {
  projectId: string;
  isMember: boolean;
  userId: string;
  onSelectTask: (id: string | null) => void;
  selectedTaskId: string | null;
}) {
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [addingToColumn, setAddingToColumn] = useState<TaskStatus | null>(null);

  const { data: tasks } = api.project.getTasks.useQuery({ projectId });
  const utils = api.useUtils();

  const updateTask = api.project.updateTask.useMutation({
    onMutate: async ({ id, status }) => {
      if (!status) return;
      await utils.project.getTasks.cancel({ projectId });
      const prev = utils.project.getTasks.getData({ projectId });
      utils.project.getTasks.setData({ projectId }, (old) =>
        old?.map((t) => (t.id === id ? { ...t, status } : t)),
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) utils.project.getTasks.setData({ projectId }, ctx.prev);
    },
    onSettled: () => void utils.project.getTasks.invalidate({ projectId }),
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  function handleDragStart(event: DragStartEvent) {
    const task = tasks?.find((t) => t.id === event.active.id);
    setActiveTask(task ?? null);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveTask(null);
    const { active, over } = event;
    if (!over) return;
    const newStatus = over.id as TaskStatus;
    const task = tasks?.find((t) => t.id === active.id);
    if (task && task.status !== newStatus) {
      updateTask.mutate({ id: task.id, status: newStatus });
    }
  }

  const tasksByStatus = (status: TaskStatus) =>
    tasks?.filter((t) => t.status === status) ?? [];

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-3 overflow-x-auto pb-4">
        {COLUMNS.map((col) => (
          <Column
            key={col.id}
            column={col}
            tasks={tasksByStatus(col.id)}
            isMember={isMember}
            selectedTaskId={selectedTaskId}
            onSelectTask={onSelectTask}
            isAddingHere={addingToColumn === col.id}
            onStartAdd={() => setAddingToColumn(col.id)}
            onDoneAdd={() => setAddingToColumn(null)}
            projectId={projectId}
          />
        ))}
      </div>
      <DragOverlay>
        {activeTask && <TaskCard task={activeTask} isDragging />}
      </DragOverlay>
    </DndContext>
  );
}

function Column({
  column,
  tasks,
  isMember,
  selectedTaskId,
  onSelectTask,
  isAddingHere,
  onStartAdd,
  onDoneAdd,
  projectId,
}: {
  column: (typeof COLUMNS)[0];
  tasks: Task[];
  isMember: boolean;
  selectedTaskId: string | null;
  onSelectTask: (id: string | null) => void;
  isAddingHere: boolean;
  onStartAdd: () => void;
  onDoneAdd: () => void;
  projectId: string;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });

  return (
    <div className="flex-shrink-0 w-64">
      <div className="flex items-center justify-between mb-2 px-1">
        <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
          {column.label}
        </h3>
        <span className="text-xs text-gray-400 bg-gray-100 rounded-full px-1.5 py-0.5">
          {tasks.length}
        </span>
      </div>

      <div
        ref={setNodeRef}
        className={`min-h-32 rounded-xl p-2 space-y-2 transition-colors ${column.color} ${isOver ? "ring-2 ring-blue-400 ring-inset" : ""}`}
      >
        {tasks.map((task) => (
          <DraggableTaskCard
            key={task.id}
            task={task}
            isSelected={selectedTaskId === task.id}
            onClick={() =>
              onSelectTask(selectedTaskId === task.id ? null : task.id)
            }
          />
        ))}

        {isAddingHere ? (
          <QuickAddTask
            projectId={projectId}
            status={column.id}
            onDone={onDoneAdd}
          />
        ) : isMember ? (
          <button
            onClick={onStartAdd}
            className="w-full text-left text-xs text-gray-400 hover:text-gray-600 px-2 py-1.5 rounded-lg hover:bg-white/60 transition-colors"
          >
            + Add task
          </button>
        ) : null}
      </div>
    </div>
  );
}

function DraggableTaskCard({
  task,
  isSelected,
  onClick,
}: {
  task: Task;
  isSelected: boolean;
  onClick: () => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: task.id,
  });

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={isDragging ? "opacity-40" : ""}
    >
      <TaskCard task={task} isSelected={isSelected} onClick={onClick} />
    </div>
  );
}

function TaskCard({
  task,
  isSelected,
  isDragging,
  onClick,
}: {
  task: Task;
  isSelected?: boolean;
  isDragging?: boolean;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-lg border p-3 cursor-pointer select-none shadow-sm transition-all ${
        isDragging
          ? "shadow-lg rotate-1 border-blue-200"
          : isSelected
            ? "border-blue-400 ring-1 ring-blue-400"
            : "border-gray-200 hover:border-blue-200 hover:shadow-md"
      }`}
    >
      <p className="text-sm text-gray-900 font-medium leading-snug mb-2">
        {task.title}
      </p>

      <div className="flex items-center justify-between gap-1">
        <span
          className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${PRIORITY_STYLES[task.priority] ?? ""}`}
        >
          {task.priority}
        </span>

        <div className="flex items-center gap-1.5">
          {task._count.comments > 0 && (
            <span className="text-[10px] text-gray-400">
              💬 {task._count.comments}
            </span>
          )}
          {task.assignees.length > 0 && (
            <div className="flex -space-x-1">
              {task.assignees.slice(0, 3).map((a) =>
                a.user.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={a.user.id}
                    src={a.user.image}
                    alt=""
                    className="w-4 h-4 rounded-full border border-white"
                  />
                ) : (
                  <div
                    key={a.user.id}
                    className="w-4 h-4 rounded-full bg-blue-100 border border-white flex items-center justify-center"
                  >
                    <span className="text-[8px] text-blue-600 font-semibold">
                      {a.user.name?.charAt(0) ?? "?"}
                    </span>
                  </div>
                ),
              )}
            </div>
          )}
        </div>
      </div>

      {task.labels.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {task.labels.slice(0, 3).map((label) => (
            <span
              key={label}
              className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded"
            >
              {label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function QuickAddTask({
  projectId,
  status,
  onDone,
}: {
  projectId: string;
  status: TaskStatus;
  onDone: () => void;
}) {
  const [title, setTitle] = useState("");
  const utils = api.useUtils();

  const createTask = api.project.createTask.useMutation({
    onSuccess: () => {
      void utils.project.getTasks.invalidate({ projectId });
      setTitle("");
      onDone();
    },
  });

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && title.trim()) {
      e.preventDefault();
      createTask.mutate({ projectId, title: title.trim(), status });
    }
    if (e.key === "Escape") onDone();
  }

  return (
    <div className="bg-white rounded-lg border border-blue-300 p-2 shadow-sm">
      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Task title… (Enter to add)"
        className="w-full text-sm outline-none text-gray-900 placeholder-gray-400"
      />
      <div className="flex gap-1 mt-2">
        <button
          onClick={() => {
            if (title.trim()) createTask.mutate({ projectId, title: title.trim(), status });
          }}
          disabled={!title.trim() || createTask.isPending}
          className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          Add
        </button>
        <button
          onClick={onDone}
          className="text-xs px-2 py-1 text-gray-500 rounded hover:bg-gray-100 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
