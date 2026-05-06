"use client";

import { useState } from "react";
import type { PhaseData, TaskData } from "../lib/types";
import { TaskRow } from "./TaskRow";
import { AddTaskForm } from "./AddTaskForm";

interface Props {
  phase: PhaseData;
  onUpdateTask: (taskId: string, updates: Partial<TaskData>) => void;
  onDeleteTask: (taskId: string) => void;
  onAddTask: (phaseId: string, title: string) => void;
  onUpdatePhase: (phaseId: string, updates: Partial<PhaseData>) => void;
}

export function PhaseCard({ phase, onUpdateTask, onDeleteTask, onAddTask, onUpdatePhase }: Props) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState(phase.title);
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [editDesc, setEditDesc] = useState(phase.description);

  const total = phase.tasks.length;
  const done = phase.tasks.filter((t) => t.status === "done").length;
  const inProgress = phase.tasks.filter((t) => t.status === "in-progress").length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  const saveTitle = () => {
    const trimmed = editTitle.trim();
    if (trimmed && trimmed !== phase.title) {
      onUpdatePhase(phase.id, { title: trimmed });
    } else {
      setEditTitle(phase.title);
    }
    setIsEditingTitle(false);
  };

  const saveDesc = () => {
    const trimmed = editDesc.trim();
    if (trimmed !== phase.description) {
      onUpdatePhase(phase.id, { description: trimmed });
    } else {
      setEditDesc(phase.description);
    }
    setIsEditingDesc(false);
  };

  return (
    <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
      <div className="p-5 border-b border-zinc-800">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            {isEditingTitle ? (
              <input
                className="font-semibold text-base bg-zinc-800 border border-zinc-600 rounded px-2 py-0.5 text-zinc-100 outline-none focus:border-zinc-400 w-full"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onBlur={saveTitle}
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveTitle();
                  if (e.key === "Escape") { setEditTitle(phase.title); setIsEditingTitle(false); }
                }}
                autoFocus
              />
            ) : (
              <h3
                onClick={() => setIsEditingTitle(true)}
                className="font-semibold text-base cursor-text hover:text-white transition-colors"
              >
                {phase.title}
              </h3>
            )}
            {isEditingDesc ? (
              <input
                className="text-sm mt-1 bg-zinc-800 border border-zinc-600 rounded px-2 py-0.5 text-zinc-400 outline-none focus:border-zinc-400 w-full"
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                onBlur={saveDesc}
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveDesc();
                  if (e.key === "Escape") { setEditDesc(phase.description); setIsEditingDesc(false); }
                }}
                autoFocus
              />
            ) : (
              <p
                onClick={() => setIsEditingDesc(true)}
                className="text-sm text-zinc-500 mt-0.5 cursor-text hover:text-zinc-400 transition-colors"
              >
                {phase.description}
              </p>
            )}
          </div>
          <span className="text-xs text-zinc-500 ml-4 whitespace-nowrap">{pct}%</span>
        </div>
        {/* Progress bar */}
        <div className="mt-3 w-full">
          <div className="flex justify-between text-xs text-zinc-400 mb-1">
            <span>{done}/{total} tasks</span>
          </div>
          <div className="h-2 bg-zinc-800 rounded-full overflow-hidden flex">
            {done > 0 && (
              <div className="bg-emerald-500 h-full transition-all" style={{ width: `${(done / total) * 100}%` }} />
            )}
            {inProgress > 0 && (
              <div className="bg-amber-500 h-full transition-all" style={{ width: `${(inProgress / total) * 100}%` }} />
            )}
          </div>
        </div>
      </div>
      <div className="divide-y divide-zinc-800/50">
        {phase.tasks.map((task) => (
          <TaskRow
            key={task.id}
            task={task}
            onUpdate={onUpdateTask}
            onDelete={onDeleteTask}
          />
        ))}
        <AddTaskForm phaseId={phase.id} onAdd={onAddTask} />
      </div>
    </div>
  );
}
