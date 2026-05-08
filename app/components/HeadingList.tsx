"use client";

import type { ContentSectionData } from "../lib/types";

const STATUS_ICONS: Record<string, { icon: string; color: string }> = {
  pending: { icon: "\u25CB", color: "text-zinc-500" },
  generating: { icon: "\u25CF", color: "text-yellow-400 animate-pulse" },
  completed: { icon: "\u2713", color: "text-green-400" },
  refined: { icon: "\u2713\u2713", color: "text-blue-400" },
};

export function HeadingList({
  sections,
  activeIndex,
  onSelect,
}: {
  sections: ContentSectionData[];
  activeIndex: number;
  onSelect: (index: number) => void;
}) {
  return (
    <div className="space-y-1">
      {sections.map((section, i) => {
        const status = STATUS_ICONS[section.status] || STATUS_ICONS.pending;
        const isActive = i === activeIndex;
        const indent = (section.headingLevel - 1) * 12;

        return (
          <button
            key={section.id}
            onClick={() => onSelect(i)}
            className={`w-full text-left px-3 py-2 rounded text-sm transition-colors flex items-center gap-2 ${
              isActive
                ? "bg-zinc-700 text-zinc-100"
                : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200"
            }`}
            style={{ paddingLeft: `${12 + indent}px` }}
          >
            <span className={`text-xs flex-shrink-0 ${status.color}`}>
              {status.icon}
            </span>
            <span className="text-xs text-zinc-500 flex-shrink-0">
              H{section.headingLevel}
            </span>
            <span className="truncate">{section.headingText}</span>
          </button>
        );
      })}
    </div>
  );
}
