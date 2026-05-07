import { getSession } from "@/app/lib/session";

export async function GET() {
  const user = await getSession();
  if (!user) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }
  return Response.json({ user });
}
