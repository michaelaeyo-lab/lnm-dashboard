import { getSession } from "@/app/lib/session";
import { getPrisma } from "@/app/lib/db";
import { refineSection } from "@/app/lib/content-pipeline";
import type { ContentBrief, ContentSectionData } from "@/app/lib/types";

/**
 * POST /api/content/refine — Refine a section with user feedback (SSE streaming)
 */
export async function POST(request: Request) {
  try {
    const user = await getSession();
    if (!user) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { sessionId, sectionId, feedback } = await request.json();

    if (!sessionId || !sectionId || !feedback) {
      return Response.json(
        { error: "sessionId, sectionId, and feedback are required" },
        { status: 400 }
      );
    }

    const prisma = getPrisma();

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

    if (!section.content) {
      return Response.json(
        { error: "Section has no content to refine. Generate first." },
        { status: 400 }
      );
    }

    // Mark as generating during refinement
    await prisma.contentSection.update({
      where: { id: sectionId },
      data: { status: "generating" },
    });

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

    const previousSections: ContentSectionData[] = session.sections
      .filter((s) => s.id !== sectionId && s.content)
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

    const stream = await refineSection({
      brief,
      section: sectionData,
      previousSections,
      feedback,
    });

    // Wrap stream to capture final content
    const encoder = new TextEncoder();
    let fullContent = "";

    const wrappedStream = new ReadableStream({
      async start(controller) {
        const reader = stream.getReader();
        const decoder = new TextDecoder();

        try {
          let sseBuffer = "";
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            controller.enqueue(value);

            // Buffer incomplete lines across chunks
            sseBuffer += decoder.decode(value, { stream: true });
            const lines = sseBuffer.split("\n");
            sseBuffer = lines.pop() ?? "";

            for (const line of lines) {
              if (!line.startsWith("data: ")) continue;
              const data = line.slice(6).trim();
              if (!data || data === "[DONE]") continue;
              try {
                const parsed = JSON.parse(data);
                if (parsed.done && parsed.fullContent) {
                  fullContent = parsed.fullContent;
                }
              } catch {
                // skip incomplete chunk
              }
            }
          }

          controller.close();

          if (fullContent) {
            const prevMeta = (section.metadata as Record<string, unknown>) || {};
            prisma.contentSection
              .update({
                where: { id: sectionId },
                data: {
                  content: fullContent,
                  status: "refined",
                  metadata: {
                    ...prevMeta,
                    wordCount: fullContent.split(/\s+/).length,
                    refinedAt: new Date().toISOString(),
                    refinementFeedback: feedback,
                  },
                },
              })
              .catch((e) =>
                console.error("[refine] Failed to save section:", e)
              );
          }
        } catch (err) {
          console.error("[refine] Stream wrapper error:", err);
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ error: "Refinement stream failed" })}\n\n`
            )
          );
          controller.close();

          prisma.contentSection
            .update({
              where: { id: sectionId },
              data: { status: "completed" },
            })
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
    console.error("[POST /api/content/refine]", err);
    return Response.json({ error: "Refinement failed" }, { status: 500 });
  }
}
