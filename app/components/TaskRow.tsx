"use client";

import { useState } from "react";
import type { TaskData, TaskStatus } from "../lib/types";

const STATUS_CYCLE: Record<string, TaskStatus> = {
  pending: "in-progress",
  "in-progress": "done",
  done: "pending",
  blocked: "pending",
};

const STATUS_COLORS: Record<string, string> = {
  done: "bg-emerald-500",
  "in-progress": "bg-amber-500",
  pending: "bg-zinc-600",
  blocked: "bg-red-500/70",
};

const STATUS_LABELS: Record<string, string> = {
  done: "Done",
  "in-progress": "Active",
  pending: "Pending",
  blocked: "Blocked",
};

const BADGE_STYLES: Record<string, string> = {
  done: "bg-emerald-500/10 text-emerald-400",
  "in-progress": "bg-amber-500/10 text-amber-400",
  pending: "bg-zinc-800 text-zinc-500",
  blocked: "bg-red-500/10 text-red-400",
};

interface Props {
  task: TaskData;
  onUpdate: (taskId: string, updates: Partial<TaskData>) => void;
  onDelete: (taskId: string) => void;
}

export function TaskRow({ task, onUpdate, onDelete }: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);

  const cycleStatus = () => {
    const next = STATUS_CYCLE[task.status] || "pending";
    onUpdate(task.id, { status: next });
  };

  const saveTitle = () => {
    const trimmed = editTitle.trim();
    if (trimmed && trimmed !== task.title) {
      onUpdate(task.id, { title: trimmed });
    } else {
      setEditTitle(task.title);
    }
    setIsEditing(false);
  };

  const handleAssign = (value: string) => {
    onUpdate(task.id, { assignedTo: value || null });
  };

  return (
    <div className="px-5 py-2.5 flex items-center gap-3 group hover:bg-zinc-800/30">
      {/* Status dot — click to cycle */}
      <button
        onClick={cycleStatus}
        className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${STATUS_COLORS[task.status] || "bg-zinc-600"} hover:ring-2 hover:ring-zinc-500 transition-all cursor-pointer`}
        title={`${STATUS_LABELS[task.status]} — click to change`}
      />

      {/* Title — click to edit */}
      {isEditing ? (
        <input
          className="text-sm flex-1 bg-zinc-800 border border-zinc-600 rounded px-2 py-0.5 text-zinc-100 outline-none focus:border-zinc-400"
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          onBlur={saveTitle}
          onKeyDown={(e) => {
            if (e.key === "Enter") saveTitle();
            if (e.key === "Escape") { setEditTitle(task.title); setIsEditing(false); }
          }}
          autoFocus
        />
      ) : (
        <span
          onClick={() => setIsEditing(true)}
          className={`text-sm flex-1 cursor-text hover:text-white transition-colors ${
            task.status === "done" ? "text-zinc-500 line-through" : "text-zinc-200"
          }`}
        >
          {task.title}
        </span>
      )}

      {/* Assign dropdown */}
      <select
        value={task.assignedTo || ""}
        onChange={(e) => handleAssign(e.target.value)}
        className="text-xs bg-zinc-800 border border-zinc-700 rounded px-1.5 py-0.5 text-zinc-400 outline-none hover:border-zinc-500 cursor-pointer"
      >
        <option value="">—</option>
        <option value="Michael">Michael</option>
        <option value="Sardar">Sardar</option>
      </select>

      {/* Status badge */}
      <button
        onClick={cycleStatus}
        className={`text-xs px-2 py-0.5 rounded-full cursor-pointer hover:opacity-80 ${BADGE_STYLES[task.status] || "bg-zinc-800 text-zinc-500"}`}
      >
        {STATUS_LABELS[task.status] || task.status}
      </button>

      {/* Blocked reason */}
      {task.blockedBy && (
        <span className="text-xs text-red-400/70 italic max-w-[150px] truncate" title={task.blockedBy}>
          {task.blockedBy}
        </span>
      )}

      {/* Delete button */}
      <button
        onClick={() => onDelete(task.id)}
        className="text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all text-sm"
        title="Delete task"
      >
        ✕
      </button>
    </div>
  );
}
