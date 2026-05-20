"use client";

import { Search, Command, Bell } from "lucide-react";
import { Button } from "./ui/button";

interface TopbarProps {
  onCommandPalette?: () => void;
}

export function Topbar({ onCommandPalette }: TopbarProps) {
  return (
    <header
      className="flex items-center gap-3 border-b border-[var(--border)] px-4 md:px-6 flex-shrink-0"
      style={{ height: "var(--topbar-h)", background: "var(--bg)" }}
    >
      {/* Spacer for mobile hamburger */}
      <div className="w-10 md:hidden" />

      {/* Search / command palette trigger */}
      <button
        onClick={onCommandPalette}
        className="flex items-center gap-2 flex-1 max-w-[420px] h-[32px] px-3 rounded-[var(--radius)] text-[12px] transition-colors cursor-pointer"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          color: "var(--text-3)",
        }}
      >
        <Search size={13} />
        <span className="flex-1 text-left">Search briefs, commands...</span>
        <span className="kbd">
          <Command size={10} />K
        </span>
      </button>

      <div className="flex-1" />

      {/* Right actions */}
      <Button variant="ghost" size="icon" title="Notifications">
        <Bell size={16} />
      </Button>
    </header>
  );
}
