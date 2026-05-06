import { getPrisma } from "../../../lib/db";
import { revalidatePath } from "next/cache";

export async function PATCH(
  request: Request,
  ctx: RouteContext<"/api/phases/[id]">
) {
  try {
    const { id } = await ctx.params;
    const body = await request.json();

    const allowed = ["title", "description", "sortOrder"];
    const data: Record<string, unknown> = {};
    for (const key of allowed) {
      if (key in body) data[key] = body[key];
    }

    if (Object.keys(data).length === 0) {
      return Response.json({ error: "No valid fields to update" }, { status: 400 });
    }

    const phase = await getPrisma().phase.update({
      where: { id },
      data,
      include: { tasks: { orderBy: { sortOrder: "asc" } } },
    });

    revalidatePath("/");
    return Response.json(phase);
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  ctx: RouteContext<"/api/phases/[id]">
) {
  try {
    const { id } = await ctx.params;
    // Delete tasks first (no cascade in Prisma by default)
    await getPrisma().task.deleteMany({ where: { phaseId: id } });
    await getPrisma().phase.delete({ where: { id } });
    revalidatePath("/");
    return Response.json({ deleted: true });
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 500 });
  }
}
