import { clearSessionCookie } from "@/app/lib/session";

export async function POST() {
  await clearSessionCookie();
  return Response.json({ success: true });
}
