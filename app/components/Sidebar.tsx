"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  BookOpen,
  FileText,
  PenLine,
  MessageSquare,
  Clock,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
} from "lucide-react";
import type { SessionUser } from "../lib/types";
import { cn } from "../lib/utils";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/knowledge", label: "Knowledge", icon: BookOpen },
  { href: "/briefs", label: "Briefs", icon: FileText },
  { href: "/write", label: "Write", icon: PenLine },
  { href: "/chat", label: "Chat", icon: MessageSquare },
  { href: "/history", label: "History", icon: Clock },
] as const;

export function Sidebar({ user }: { user: SessionUser }) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const navContent = (
    <>
      {/* Brand mark */}
      <div
        className={cn(
          "flex items-center gap-3 border-b border-[var(--border)] px-4",
          collapsed ? "justify-center py-4" : "py-4"
        )}
      >
        <div
          className="flex items-center justify-center rounded-[var(--radius)] flex-shrink-0"
          style={{
            width: 32,
            height: 32,
            background: "var(--accent)",
            color: "white",
            fontWeight: 700,
            fontSize: 14,
            fontFamily: "var(--font-mono)",
          }}
        >
          LN
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <div className="text-[13px] font-semibold truncate" style={{ color: "var(--text-1)" }}>
              LNM Platform
            </div>
            <div className="text-[10px]" style={{ color: "var(--text-3)" }}>
              Multi-Agent SEO
            </div>
          </div>
        )}
      </div>

      {/* Nav items */}
      <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-[var(--radius)] text-[13px] transition-colors",
                collapsed ? "justify-center px-2 py-2" : "px-3 py-2",
                active
                  ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                  : "text-[var(--text-2)] hover:bg-[var(--surface)] hover:text-[var(--text-1)]"
              )}
              title={collapsed ? item.label : undefined}
            >
              <Icon size={18} className="flex-shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Bottom: user + collapse toggle */}
      <div className="border-t border-[var(--border)] px-3 py-3 space-y-2">
        {/* Settings link */}
        <Link
          href="/settings"
          className={cn(
            "flex items-center gap-3 rounded-[var(--radius)] text-[13px] text-[var(--text-2)] hover:bg-[var(--surface)] hover:text-[var(--text-1)] transition-colors",
            collapsed ? "justify-center px-2 py-2" : "px-3 py-2"
          )}
          title={collapsed ? "Settings" : undefined}
        >
          <Settings size={18} className="flex-shrink-0" />
          {!collapsed && <span>Settings</span>}
        </Link>

        {/* User row */}
        <div
          className={cn(
            "flex items-center gap-2 rounded-[var(--radius)] px-3 py-2",
            collapsed && "justify-center px-2"
          )}
        >
          <div
            className="flex items-center justify-center rounded-full flex-shrink-0"
            style={{
              width: 26,
              height: 26,
              background: "var(--surface)",
              color: "var(--text-2)",
              fontSize: 11,
              fontWeight: 600,
            }}
          >
            {(user.name || user.email)?.[0]?.toUpperCase() ?? "U"}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <div className="text-[12px] truncate" style={{ color: "var(--text-1)" }}>
                {user.name || user.email}
              </div>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="text-[var(--text-3)] hover:text-[var(--coral)] transition-colors flex-shrink-0"
            title="Sign out"
          >
            <LogOut size={14} />
          </button>
        </div>

        {/* Collapse toggle (desktop only) */}
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="hidden md:flex items-center justify-center w-full py-1 text-[var(--text-3)] hover:text-[var(--text-1)] transition-colors"
          title={collapsed ? "Expand" : "Collapse"}
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="md:hidden fixed top-3 left-3 z-50 p-2 rounded-[var(--radius)]"
        style={{ background: "var(--bg-elev)", border: "1px solid var(--border)" }}
      >
        {mobileOpen ? (
          <X size={18} style={{ color: "var(--text-1)" }} />
        ) : (
          <Menu size={18} style={{ color: "var(--text-1)" }} />
        )}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-40"
          style={{ background: "oklch(0 0 0 / 0.55)", backdropFilter: "blur(2px)" }}
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed md:static inset-y-0 left-0 z-40 flex flex-col border-r border-[var(--border)] transition-all duration-200",
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
        style={{
          width: collapsed ? 56 : 240,
          background: "var(--bg-elev)",
        }}
      >
        {navContent}
      </aside>
    </>
  );
}
