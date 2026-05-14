import { getSession } from "@/app/lib/session";
import { getPrisma } from "@/app/lib/db";
import type { EnhancedBrief, ContentBrief } from "@/app/lib/types";

/**
 * POST /api/briefs/:id/start-writing — Create a ContentSession from an approved brief
 */
export async function POST(
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

    if (brief.status !== "approved") {
      return Response.json(
        { error: "Brief must be approved before starting to write" },
        { status: 400 }
      );
    }

    if (brief.sessionId) {
      return Response.json(
        { error: "A writing session already exists for this brief", sessionId: brief.sessionId },
        { status: 409 }
      );
    }

    const enhancedBrief = brief.data as unknown as EnhancedBrief;

    // Convert EnhancedHeading[] to BriefHeading[] for the content pipeline
    const contentBrief: ContentBrief = {
      pageType: brief.pageType as ContentBrief["pageType"],
      niche: brief.niche,
      topic: brief.topic,
      location: brief.location || undefined,
      clientName: brief.clientName || undefined,
      headings: enhancedBrief.headings.map((h) => ({
        level: h.level,
        text: h.text,
        intent: h.intent || h.structureInstructions,
        notes: h.structureInstructions,
      })),
      source: "agent",
    };

    const title = brief.location
      ? `${brief.topic} — ${brief.location}`
      : brief.topic;

    // Create ContentSession with sections
    const session = await prisma.contentSession.create({
      data: {
        userId: user.id,
        brief: contentBrief as object,
        niche: brief.niche,
        pageType: brief.pageType,
        title,
        status: "draft",
        sections: {
          create: enhancedBrief.headings.map((h, i) => ({
            headingLevel: h.level,
            headingText: h.text,
            intent: h.structureInstructions || h.intent || null,
            status: "pending",
            sortOrder: i,
          })),
        },
      },
      include: { sections: { orderBy: { sortOrder: "asc" } } },
    });

    // Link brief to session
    await prisma.brief.update({
      where: { id },
      data: { sessionId: session.id },
    });

    return Response.json({ sessionId: session.id }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/briefs/:id/start-writing]", err);
    return Response.json({ error: "Failed to create writing session" }, { status: 500 });
  }
}
