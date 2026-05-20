"use client";

import { useState, useEffect, useCallback } from "react";
import { Topbar } from "./Topbar";
import { CommandPalette } from "./CommandPalette";

export function DashboardShellClient({ children }: { children: React.ReactNode }) {
  const [cmdOpen, setCmdOpen] = useState(false);

  // Global ⌘K / Ctrl+K listener
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCmdOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Initialize theme from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("theme");
    if (saved) {
      document.documentElement.setAttribute("data-theme", saved);
    }
  }, []);

  const handleClose = useCallback(() => setCmdOpen(false), []);

  return (
    <>
      <Topbar onCommandPalette={() => setCmdOpen(true)} />
      <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      <CommandPalette open={cmdOpen} onClose={handleClose} />
    </>
  );
}
