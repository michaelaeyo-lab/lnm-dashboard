import { LoginForm } from "../components/LoginForm";

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center">
      <div className="text-center space-y-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">LNM Platform</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Multi-Agent SEO Ecosystem
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
