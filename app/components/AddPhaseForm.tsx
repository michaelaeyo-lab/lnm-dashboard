"use client";

import { useState } from "react";

interface Props {
  onAdd: (title: string, description: string) => void;
}

export function AddPhaseForm({ onAdd }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const submit = () => {
    const trimmedTitle = title.trim();
    if (trimmedTitle) {
      onAdd(trimmedTitle, description.trim());
      setTitle("");
      setDescription("");
      setIsOpen(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="w-full py-4 border-2 border-dashed border-zinc-800 rounded-xl text-zinc-500 hover:text-zinc-300 hover:border-zinc-600 transition-colors text-sm"
      >
        + Add phase
      </button>
    );
  }

  return (
    <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-5">
      <div className="space-y-3">
        <input
          className="text-sm w-full bg-zinc-800 border border-zinc-600 rounded px-3 py-2 text-zinc-100 outline-none focus:border-zinc-400 placeholder:text-zinc-600"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
            if (e.key === "Escape") { setTitle(""); setDescription(""); setIsOpen(false); }
          }}
          placeholder="Phase title..."
          autoFocus
        />
        <input
          className="text-sm w-full bg-zinc-800 border border-zinc-600 rounded px-3 py-2 text-zinc-400 outline-none focus:border-zinc-400 placeholder:text-zinc-600"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
            if (e.key === "Escape") { setTitle(""); setDescription(""); setIsOpen(false); }
          }}
          placeholder="Brief description..."
        />
        <div className="flex gap-2">
          <button
            onClick={submit}
            className="text-xs px-4 py-1.5 bg-zinc-700 hover:bg-zinc-600 rounded text-zinc-200 transition-colors"
          >
            Add Phase
          </button>
          <button
            onClick={() => { setTitle(""); setDescription(""); setIsOpen(false); }}
            className="text-xs px-4 py-1.5 text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
