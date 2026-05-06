import { getPrisma } from "../../../lib/db";
import { revalidatePath } from "next/cache";

export async function PATCH(
  request: Request,
  ctx: RouteContext<"/api/tasks/[id]">
) {
  try {
    const { id } = await ctx.params;
    const body = await request.json();

    const allowed = ["title", "status", "assignedTo", "blockedBy", "sortOrder"];
    const data: Record<string, unknown> = {};
    for (const key of allowed) {
      if (key in body) data[key] = body[key];
    }

    if (Object.keys(data).length === 0) {
      return Response.json({ error: "No valid fields to update" }, { status: 400 });
    }

    const task = await getPrisma().task.update({ where: { id }, data });
    revalidatePath("/");
    return Response.json(task);
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  ctx: RouteContext<"/api/tasks/[id]">
) {
  try {
    const { id } = await ctx.params;
    await getPrisma().task.delete({ where: { id } });
    revalidatePath("/");
    return Response.json({ deleted: true });
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 500 });
  }
}
