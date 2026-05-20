import { LoginForm } from "../components/LoginForm";

export default function LoginPage() {
  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: "var(--bg)", color: "var(--text-1)" }}
    >
      <div className="text-center" style={{ display: "flex", flexDirection: "column", gap: 24, alignItems: "center" }}>
        <div>
          <div
            className="inline-flex items-center justify-center rounded-[10px] mb-4"
            style={{
              width: 48,
              height: 48,
              background: "var(--accent)",
              fontWeight: 700,
              fontSize: 18,
              color: "white",
            }}
          >
            LN
          </div>
          <h1 className="h1" style={{ fontSize: 24 }}>LNM Platform</h1>
          <p className="text-sm muted mt-1">Multi-Agent SEO Ecosystem</p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
