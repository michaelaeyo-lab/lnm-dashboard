import { getSession } from "@/app/lib/session";
import { listNiches } from "@/app/lib/writing-rules/index";

/**
 * GET /api/content/niches — List available writing niches
 */
export async function GET() {
  const user = await getSession();
  if (!user) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }
  return Response.json(listNiches());
}
