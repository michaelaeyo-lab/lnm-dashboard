"use client";

import { useState } from "react";

interface Props {
  phaseId: string;
  onAdd: (phaseId: string, title: string) => void;
}

export function AddTaskForm({ phaseId, onAdd }: Props) {
  const [title, setTitle] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const submit = () => {
    const trimmed = title.trim();
    if (trimmed) {
      onAdd(phaseId, trimmed);
      setTitle("");
      setIsOpen(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="px-5 py-2 text-xs text-zinc-500 hover:text-zinc-300 transition-colors w-full text-left"
      >
        + Add task
      </button>
    );
  }

  return (
    <div className="px-5 py-2 flex items-center gap-2">
      <input
        className="text-sm flex-1 bg-zinc-800 border border-zinc-600 rounded px-2 py-1 text-zinc-100 outline-none focus:border-zinc-400 placeholder:text-zinc-600"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
          if (e.key === "Escape") { setTitle(""); setIsOpen(false); }
        }}
        placeholder="Task title..."
        autoFocus
      />
      <button
        onClick={submit}
        className="text-xs px-3 py-1 bg-zinc-700 hover:bg-zinc-600 rounded text-zinc-200 transition-colors"
      >
        Add
      </button>
      <button
        onClick={() => { setTitle(""); setIsOpen(false); }}
        className="text-xs text-zinc-500 hover:text-zinc-300"
      >
        Cancel
      </button>
    </div>
  );
}
