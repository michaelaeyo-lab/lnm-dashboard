import { redirect } from "next/navigation";
import { getSession } from "../lib/session";
import { Sidebar } from "../components/Sidebar";
import { DashboardShellClient } from "../components/DashboardShellClient";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSession();
  if (!user) redirect("/login");

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar user={user} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <DashboardShellClient>{children}</DashboardShellClient>
      </div>
    </div>
  );
}
