"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Login failed");
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      setError("Network error — please try again");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 w-full max-w-sm">
      {error && (
        <div
          className="px-4 py-2 rounded text-sm"
          style={{
            background: "oklch(0.35 0.12 25 / 0.5)",
            border: "1px solid oklch(0.45 0.15 25)",
            color: "oklch(0.8 0.1 25)",
          }}
        >
          {error}
        </div>
      )}

      <div>
        <label htmlFor="email" className="block text-sm mb-1" style={{ color: "var(--text-2)" }}>
          Email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full px-3 py-2 rounded"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            color: "var(--text-1)",
            outline: "none",
          }}
          placeholder="you@example.com"
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm mb-1" style={{ color: "var(--text-2)" }}>
          Password
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full px-3 py-2 rounded"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            color: "var(--text-1)",
            outline: "none",
          }}
          placeholder="Enter password"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-2 font-medium rounded transition-colors disabled:opacity-50"
        style={{
          background: loading ? "var(--surface)" : "var(--accent)",
          color: loading ? "var(--text-3)" : "white",
        }}
      >
        {loading ? "Signing in..." : "Sign In"}
      </button>
    </form>
  );
}
