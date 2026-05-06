"use client";

import { useState, useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { PhaseData, TaskData } from "../lib/types";
import { PhaseCard } from "./PhaseCard";
import { AddPhaseForm } from "./AddPhaseForm";
import { OverallProgress } from "./OverallProgress";

export function DashboardShell({ initialPhases }: { initialPhases: PhaseData[] }) {
  const [phases, setPhases] = useState(initialPhases);
  const [, startTransition] = useTransition();
  const router = useRouter();

  const rollback = useCallback(() => {
    startTransition(() => router.refresh());
  }, [router, startTransition]);

  // --- Task mutations ---

  const updateTask = useCallback(async (taskId: string, updates: Partial<TaskData>) => {
    // Optimistic update
    setPhases((prev) =>
      prev.map((phase) => ({
        ...phase,
        tasks: phase.tasks.map((task) =>
          task.id === taskId ? { ...task, ...updates } : task
        ),
      }))
    );

    const res = await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    if (!res.ok) rollback();
  }, [rollback]);

  const deleteTask = useCallback(async (taskId: string) => {
    // Optimistic remove
    setPhases((prev) =>
      prev.map((phase) => ({
        ...phase,
        tasks: phase.tasks.filter((t) => t.id !== taskId),
      }))
    );

    const res = await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
    if (!res.ok) rollback();
  }, [rollback]);

  const addTask = useCallback(async (phaseId: string, title: string) => {
    // Create via API first (need real ID)
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phaseId, title }),
    });

    if (res.ok) {
      const task: TaskData = await res.json();
      setPhases((prev) =>
        prev.map((phase) =>
          phase.id === phaseId
            ? { ...phase, tasks: [...phase.tasks, task] }
            : phase
        )
      );
    }
  }, []);

  // --- Phase mutations ---

  const updatePhase = useCallback(async (phaseId: string, updates: Partial<PhaseData>) => {
    // Optimistic update
    setPhases((prev) =>
      prev.map((phase) =>
        phase.id === phaseId ? { ...phase, ...updates } : phase
      )
    );

    const res = await fetch(`/api/phases/${phaseId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    if (!res.ok) rollback();
  }, [rollback]);

  const addPhase = useCallback(async (title: string, description: string) => {
    const res = await fetch("/api/phases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, description }),
    });

    if (res.ok) {
      const phase: PhaseData = await res.json();
      setPhases((prev) => [...prev, phase]);
    }
  }, []);

  return (
    <>
      <OverallProgress phases={phases} />

      <div className="grid gap-6">
        {phases.map((phase) => (
          <PhaseCard
            key={phase.id}
            phase={phase}
            onUpdateTask={updateTask}
            onDeleteTask={deleteTask}
            onAddTask={addTask}
            onUpdatePhase={updatePhase}
          />
        ))}
        <AddPhaseForm onAdd={addPhase} />
      </div>
    </>
  );
}
