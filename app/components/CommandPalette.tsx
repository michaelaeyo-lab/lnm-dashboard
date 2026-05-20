"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  FileText,
  LayoutDashboard,
  MessageSquare,
  Clock,
  PenLine,
  Search,
  Sparkles,
  Sun,
  Moon,
  Settings,
} from "lucide-react";
import { StatusBadge } from "./ui/status-badge";

interface CommandItem {
  id: string;
  group: string;
  icon: React.ReactNode;
  label: string;
  hint?: string;
  shortcut?: string;
  status?: string;
  action: () => void;
}

interface Props {
  open: boolean;
  onClose: () => void;
}

export function CommandPalette({ open, onClose }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery("");
      setSelected(0);
    }
  }, [open]);

  const toggleTheme = useCallback(() => {
    const html = document.documentElement;
    const current = html.getAttribute("data-theme");
    html.setAttribute("data-theme", current === "light" ? "dark" : "light");
    localStorage.setItem("theme", current === "light" ? "dark" : "light");
  }, []);

  const allItems: CommandItem[] = useMemo(
    () => [
      { id: "go-dashboard", group: "Navigate", icon: <LayoutDashboard size={14} />, label: "Go to Dashboard", shortcut: "G D", action: () => router.push("/") },
      { id: "go-briefs", group: "Navigate", icon: <FileText size={14} />, label: "Go to Briefs", shortcut: "G B", action: () => router.push("/briefs") },
      { id: "go-write", group: "Navigate", icon: <PenLine size={14} />, label: "Go to Writer", shortcut: "G W", action: () => router.push("/write") },
      { id: "go-knowledge", group: "Navigate", icon: <BookOpen size={14} />, label: "Go to Knowledge", shortcut: "G K", action: () => router.push("/knowledge") },
      { id: "go-chat", group: "Navigate", icon: <MessageSquare size={14} />, label: "Go to Chat", shortcut: "G C", action: () => router.push("/chat") },
      { id: "go-history", group: "Navigate", icon: <Clock size={14} />, label: "Go to History", shortcut: "G H", action: () => router.push("/history") },
      { id: "new-brief", group: "Actions", icon: <Sparkles size={14} />, label: "New brief", shortcut: "N B", action: () => router.push("/briefs") },
      { id: "new-chat", group: "Actions", icon: <MessageSquare size={14} />, label: "New RAG chat", shortcut: "N C", action: () => router.push("/chat") },
      { id: "toggle-theme", group: "Actions", icon: <Sun size={14} />, label: "Toggle theme", shortcut: "⇧ T", action: toggleTheme },
      { id: "settings", group: "Actions", icon: <Settings size={14} />, label: "Open Settings", action: () => router.push("/settings") },
    ],
    [router, toggleTheme]
  );

  const filtered = useMemo(() => {
    if (!query.trim()) return allItems;
    const q = query.toLowerCase();
    return allItems.filter((i) => i.label.toLowerCase().includes(q) || (i.hint || "").toLowerCase().includes(q));
  }, [query, allItems]);

  const groups = useMemo(() => {
    const g: Record<string, CommandItem[]> = {};
    filtered.forEach((i) => {
      (g[i.group] ||= []).push(i);
    });
    return g;
  }, [filtered]);

  useEffect(() => {
    setSelected(0);
  }, [query]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelected((s) => Math.min(s + 1, filtered.length - 1));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelected((s) => Math.max(s - 1, 0));
      }
      if (e.key === "Enter") {
        e.preventDefault();
        const item = filtered[selected];
        if (item) {
          item.action();
          onClose();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, filtered, selected, onClose]);

  // Global ⌘K listener
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (open) onClose();
        else {
          // parent handles open
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  let runningIdx = -1;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "oklch(0 0 0 / 0.55)",
        display: "grid",
        placeItems: "start center",
        paddingTop: "12vh",
        zIndex: 100,
        backdropFilter: "blur(4px)",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(640px, 92vw)",
          background: "var(--bg-elev)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          boxShadow: "0 24px 60px oklch(0 0 0 / 0.5), 0 6px 16px oklch(0 0 0 / 0.4)",
          overflow: "hidden",
          animation: "slidein-up .15s ease both",
        }}
      >
        {/* Input */}
        <div
          className="flex items-center gap-3"
          style={{ padding: "14px 16px", borderBottom: "1px solid var(--border)" }}
        >
          <Search size={16} style={{ color: "var(--text-3)" }} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search briefs, commands..."
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              color: "var(--text-1)",
              fontSize: 15,
              fontFamily: "inherit",
            }}
          />
          <span className="kbd">ESC</span>
        </div>

        {/* Results */}
        <div style={{ maxHeight: "50vh", overflow: "auto", padding: "6px 0" }}>
          {filtered.length === 0 && (
            <div className="text-sm muted" style={{ padding: 24, textAlign: "center" }}>
              No matches for <span className="font-mono">&ldquo;{query}&rdquo;</span>
            </div>
          )}
          {Object.entries(groups).map(([group, items]) => (
            <div key={group}>
              <div className="eyebrow" style={{ padding: "8px 16px 4px" }}>
                {group}
              </div>
              {items.map((item) => {
                runningIdx += 1;
                const isSel = runningIdx === selected;
                return (
                  <button
                    key={item.id}
                    onMouseEnter={() => setSelected(runningIdx)}
                    onClick={() => {
                      item.action();
                      onClose();
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      width: "100%",
                      padding: "8px 16px",
                      border: "none",
                      cursor: "pointer",
                      background: isSel ? "var(--surface)" : "transparent",
                      borderLeft: `2px solid ${isSel ? "var(--accent)" : "transparent"}`,
                      color: "var(--text-1)",
                      textAlign: "left",
                      font: "inherit",
                    }}
                  >
                    <span style={{ color: "var(--text-3)" }}>{item.icon}</span>
                    <span className="text-sm flex-1 truncate">{item.label}</span>
                    {item.status && <StatusBadge status={item.status} />}
                    {item.hint && (
                      <span className="font-mono text-xs muted truncate" style={{ maxWidth: 180 }}>
                        {item.hint}
                      </span>
                    )}
                    {item.shortcut && <span className="kbd">{item.shortcut}</span>}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div
          className="flex items-center gap-3"
          style={{
            padding: "8px 14px",
            borderTop: "1px solid var(--border)",
            fontSize: 11,
            color: "var(--text-3)",
          }}
        >
          <span>
            <span className="kbd">↑↓</span> navigate
          </span>
          <span>
            <span className="kbd">↵</span> select
          </span>
          <span>
            <span className="kbd">esc</span> close
          </span>
          <span style={{ marginLeft: "auto" }}>
            {filtered.length} result{filtered.length !== 1 && "s"}
          </span>
        </div>
      </div>
    </div>
  );
}
