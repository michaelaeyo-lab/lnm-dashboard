import { NextResponse } from "next/server";
import { prisma } from "../../lib/db";

export async function GET() {
  const phases = await prisma.phase.findMany({
    include: { tasks: { orderBy: { sortOrder: "asc" } } },
    orderBy: { sortOrder: "asc" },
  });
  return NextResponse.json(phases);
}
