import { getSession } from "@/app/lib/session";
import { getPrisma } from "@/app/lib/db";
import { generateSection } from "@/app/lib/content-pipeline";
import type { ContentBrief, ContentSectionData } from "@/app/lib/types";

/**
 * POST /api/content/generate — Generate content for one section (SSE streaming)
 */
export async function POST(request: Request) {
  try {
    const user = await getSession();
    if (!user) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { sessionId, sectionId } = await request.json();

    if (!sessionId || !sectionId) {
      return Response.json(
        { error: "sessionId and sectionId are required" },
        { status: 400 }
      );
    }

    const prisma = getPrisma();

    // Load session with all sections
    const session = await prisma.contentSession.findFirst({
      where: { id: sessionId, userId: user.id },
      include: { sections: { orderBy: { sortOrder: "asc" } } },
    });

    if (!session) {
      return Response.json({ error: "Session not found" }, { status: 404 });
    }

    const section = session.sections.find((s) => s.id === sectionId);
    if (!section) {
      return Response.json({ error: "Section not found" }, { status: 404 });
    }

    // Mark section as generating
    await prisma.contentSection.update({
      where: { id: sectionId },
      data: { status: "generating" },
    });

    // Update session status if still draft
    if (session.status === "draft") {
      await prisma.contentSession.update({
        where: { id: sessionId },
        data: { status: "in_progress" },
      });
    }

    const brief = session.brief as unknown as ContentBrief;
    const sectionData: ContentSectionData = {
      id: section.id,
      headingLevel: section.headingLevel,
      headingText: section.headingText,
      intent: section.intent,
      content: section.content,
      status: section.status,
      sortOrder: section.sortOrder,
      metadata: section.metadata as Record<string, unknown> | null,
    };

    // Get previously completed sections for context
    const previousSections: ContentSectionData[] = session.sections
      .filter((s) => s.sortOrder < section.sortOrder && s.content)
      .map((s) => ({
        id: s.id,
        headingLevel: s.headingLevel,
        headingText: s.headingText,
        intent: s.intent,
        content: s.content,
        status: s.status,
        sortOrder: s.sortOrder,
        metadata: s.metadata as Record<string, unknown> | null,
      }));

    // Generate content (returns a ReadableStream)
    const stream = await generateSection({
      brief,
      section: sectionData,
      previousSections,
    });

    // Wrap stream to capture final content and save to DB
    const encoder = new TextEncoder();
    let fullContent = "";

    const wrappedStream = new ReadableStream({
      async start(controller) {
        const reader = stream.getReader();
        const decoder = new TextDecoder();

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            // Forward to client
            controller.enqueue(value);

            // Parse SSE to capture content
            const text = decoder.decode(value, { stream: true });
            const lines = text.split("\n");
            for (const line of lines) {
              if (!line.startsWith("data: ")) continue;
              const data = line.slice(6);
              if (data === "[DONE]") continue;
              try {
                const parsed = JSON.parse(data);
                if (parsed.done && parsed.fullContent) {
                  fullContent = parsed.fullContent;
                }
              } catch {
                // skip malformed
              }
            }
          }

          controller.close();

          // Save generated content to DB (fire-and-forget)
          if (fullContent) {
            prisma.contentSection
              .update({
                where: { id: sectionId },
                data: {
                  content: fullContent,
                  status: "completed",
                  metadata: {
                    wordCount: fullContent.split(/\s+/).length,
                    generatedAt: new Date().toISOString(),
                  },
                },
              })
              .catch((e) =>
                console.error("[generate] Failed to save section:", e)
              );
          }
        } catch (err) {
          console.error("[generate] Stream wrapper error:", err);
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ error: "Stream failed" })}\n\n`
            )
          );
          controller.close();

          // Revert section status on error
          prisma.contentSection
            .update({ where: { id: sectionId }, data: { status: "pending" } })
            .catch(() => {});
        }
      },
    });

    return new Response(wrappedStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    console.error("[POST /api/content/generate]", err);
    return Response.json({ error: "Generation failed" }, { status: 500 });
  }
}
