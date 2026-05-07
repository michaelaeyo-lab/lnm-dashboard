import { getSession } from "@/app/lib/session";
import { getPrisma } from "@/app/lib/db";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const user = await getSession();
  if (!user) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "20", 10);
  const agentType = searchParams.get("agentType");

  const prisma = getPrisma();

  const where: Record<string, unknown> = { userId: user.id };
  if (agentType) where.agentType = agentType;

  const [generations, total] = await Promise.all([
    prisma.generation.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.generation.count({ where }),
  ]);

  return Response.json({
    generations,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}
