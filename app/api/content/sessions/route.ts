import { getSession } from "@/app/lib/session";
import { getPrisma } from "@/app/lib/db";
import { nicheExists } from "@/app/lib/writing-rules/index";
import type { ContentBrief } from "@/app/lib/types";

const VALID_PAGE_TYPES = ["service", "location", "blog", "landing"];

function validateBrief(brief: unknown): brief is ContentBrief {
  if (!brief || typeof brief !== "object") return false;
  const b = brief as Record<string, unknown>;
  if (!b.pageType || !VALID_PAGE_TYPES.includes(b.pageType as string)) return false;
  if (!b.niche || typeof b.niche !== "string") return false;
  if (!b.topic || typeof b.topic !== "string") return false;
  if (!Array.isArray(b.headings) || b.headings.length === 0) return false;
  for (const h of b.headings) {
    if (!h || typeof h !== "object") return false;
    if (typeof h.level !== "number" || h.level < 1 || h.level > 4) return false;
    if (!h.text || typeof h.text !== "string") return false;
  }
  return true;
}

/**
 * POST /api/content/sessions — Create a new content session from a brief
 */
export async function POST(request: Request) {
  try {
    const user = await getSession();
    if (!user) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const { brief } = body;

    if (!validateBrief(brief)) {
      return Response.json(
        { error: "Invalid brief. Required: pageType, niche, topic, headings (array with level + text)" },
        { status: 400 }
      );
    }

    if (!nicheExists(brief.niche)) {
      // Default to general if niche not found
      brief.niche = "general";
    }

    // Set source if not provided
    if (!brief.source) {
      brief.source = "form";
    }

    const prisma = getPrisma();

    // Derive display title from brief
    const title = brief.location
      ? `${brief.topic} — ${brief.location}`
      : brief.topic;

    // Create session with sections
    const session = await prisma.contentSession.create({
      data: {
        userId: user.id,
        brief: brief as object,
        niche: brief.niche,
        pageType: brief.pageType,
        title,
        status: "draft",
        sections: {
          create: brief.headings.map((h, i) => ({
            headingLevel: h.level,
            headingText: h.text,
            intent: h.intent || null,
            status: "pending",
            sortOrder: i,
          })),
        },
      },
      include: { sections: { orderBy: { sortOrder: "asc" } } },
    });

    return Response.json(session, { status: 201 });
  } catch (err) {
    console.error("[POST /api/content/sessions]", err);
    return Response.json({ error: "Failed to create session" }, { status: 500 });
  }
}

/**
 * GET /api/content/sessions — List user's content sessions
 */
export async function GET(request: Request) {
  try {
    const user = await getSession();
    if (!user) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const offset = (page - 1) * limit;

    const prisma = getPrisma();

    const [sessions, total] = await Promise.all([
      prisma.contentSession.findMany({
        where: { userId: user.id },
        include: {
          sections: {
            select: { id: true, status: true, headingLevel: true, headingText: true },
            orderBy: { sortOrder: "asc" },
          },
        },
        orderBy: { updatedAt: "desc" },
        skip: offset,
        take: limit,
      }),
      prisma.contentSession.count({ where: { userId: user.id } }),
    ]);

    return Response.json({ sessions, total, page, limit });
  } catch (err) {
    console.error("[GET /api/content/sessions]", err);
    return Response.json({ error: "Failed to fetch sessions" }, { status: 500 });
  }
}
