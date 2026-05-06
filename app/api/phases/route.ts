import { getPrisma } from "../../lib/db";
import { revalidatePath } from "next/cache";

export async function GET() {
  const phases = await getPrisma().phase.findMany({
    include: { tasks: { orderBy: { sortOrder: "asc" } } },
    orderBy: { sortOrder: "asc" },
  });
  return Response.json(phases);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.title) {
      return Response.json({ error: "title required" }, { status: 400 });
    }

    const slug = body.slug || body.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

    // Get max sortOrder to place new phase at the end
    const last = await getPrisma().phase.findFirst({ orderBy: { sortOrder: "desc" } });
    const sortOrder = body.sortOrder ?? ((last?.sortOrder ?? -1) + 1);

    const phase = await getPrisma().phase.create({
      data: {
        slug,
        title: body.title,
        description: body.description || "",
        sortOrder,
      },
      include: { tasks: true },
    });

    revalidatePath("/");
    return Response.json(phase, { status: 201 });
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 500 });
  }
}
