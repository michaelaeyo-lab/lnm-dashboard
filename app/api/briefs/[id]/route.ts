import { getSession } from "@/app/lib/session";
import { getPrisma } from "@/app/lib/db";

/**
 * GET /api/briefs/:id — Get brief detail
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

    const brief = await prisma.brief.findFirst({
      where: { id, userId: user.id },
    });

    if (!brief) {
      return Response.json({ error: "Brief not found" }, { status: 404 });
    }

    return Response.json(brief);
  } catch (err) {
    console.error("[GET /api/briefs/:id]", err);
    return Response.json({ error: "Failed to fetch brief" }, { status: 500 });
  }
}

/**
 * PATCH /api/briefs/:id — Update brief data or status
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSession();
    if (!user) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const prisma = getPrisma();

    const existing = await prisma.brief.findFirst({
      where: { id, userId: user.id },
    });

    if (!existing) {
      return Response.json({ error: "Brief not found" }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};

    // Update brief data (user edits)
    if (body.data) {
      updateData.data = body.data;
      updateData.version = existing.version + 1;
    }

    // Update status
    if (body.status) {
      const validStatuses = ["draft", "reviewing", "approved"];
      if (!validStatuses.includes(body.status)) {
        return Response.json({ error: "Invalid status" }, { status: 400 });
      }
      updateData.status = body.status;
    }

    // Update metadata fields
    if (body.topic) updateData.topic = body.topic;
    if (body.location !== undefined) updateData.location = body.location || null;
    if (body.clientName !== undefined) updateData.clientName = body.clientName || null;
    if (body.domain !== undefined) updateData.domain = body.domain || null;

    const updated = await prisma.brief.update({
      where: { id },
      data: updateData,
    });

    return Response.json(updated);
  } catch (err) {
    console.error("[PATCH /api/briefs/:id]", err);
    return Response.json({ error: "Failed to update brief" }, { status: 500 });
  }
}

/**
 * DELETE /api/briefs/:id — Delete a brief
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

    const existing = await prisma.brief.findFirst({
      where: { id, userId: user.id },
    });

    if (!existing) {
      return Response.json({ error: "Brief not found" }, { status: 404 });
    }

    await prisma.brief.delete({ where: { id } });

    return Response.json({ success: true });
  } catch (err) {
    console.error("[DELETE /api/briefs/:id]", err);
    return Response.json({ error: "Failed to delete brief" }, { status: 500 });
  }
}
