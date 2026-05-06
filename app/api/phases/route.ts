import { NextResponse } from "next/server";
import { getPrisma } from "../../lib/db";

export async function GET() {
  const phases = await getPrisma().phase.findMany({
    include: { tasks: { orderBy: { sortOrder: "asc" } } },
    orderBy: { sortOrder: "asc" },
  });
  return NextResponse.json(phases);
}
