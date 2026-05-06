import { getPrisma } from "../../lib/db";
import { revalidatePath } from "next/cache";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.phaseId || !body.title) {
      return Response.json({ error: "phaseId and title required" }, { status: 400 });
    }

    const task = await getPrisma().task.create({
      data: {
        phaseId: body.phaseId,
        title: body.title,
        status: body.status || "pending",
        assignedTo: body.assignedTo || null,
        blockedBy: body.blockedBy || null,
        sortOrder: body.sortOrder ?? 0,
      },
    });

    revalidatePath("/");
    return Response.json(task, { status: 201 });
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 500 });
  }
}
