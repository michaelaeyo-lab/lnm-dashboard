import { getSession } from "@/app/lib/session";
import { getPrisma } from "@/app/lib/db";

/**
 * GET /api/content/sessions/[id] — Get a content session with all sections
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSession();
    if (!user) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { id } = await params;
    const prisma = getPrisma();

    const session = await prisma.contentSession.findFirst({
      where: { id, userId: user.id },
      include: { sections: { orderBy: { sortOrder: "asc" } } },
    });

    if (!session) {
      return Response.json({ error: "Session not found" }, { status: 404 });
    }

    return Response.json(session);
  } catch (err) {
    console.error("[GET /api/content/sessions/[id]]", err);
    return Response.json({ error: "Failed to fetch session" }, { status: 500 });
  }
}

/**
 * DELETE /api/content/sessions/[id] — Delete a content session
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSession();
    if (!user) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { id } = await params;
    const prisma = getPrisma();

    const session = await prisma.contentSession.findFirst({
      where: { id, userId: user.id },
    });

    if (!session) {
      return Response.json({ error: "Session not found" }, { status: 404 });
    }

    await prisma.contentSession.delete({ where: { id } });

    return Response.json({ deleted: true });
  } catch (err) {
    console.error("[DELETE /api/content/sessions/[id]]", err);
    return Response.json({ error: "Failed to delete session" }, { status: 500 });
  }
}
