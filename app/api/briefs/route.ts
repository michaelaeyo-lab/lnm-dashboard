import { getSession } from "@/app/lib/session";
import { getPrisma } from "@/app/lib/db";
import { generateBrief } from "@/app/lib/brief-pipeline";
import { rateLimit } from "@/app/lib/security";
import { logOperation } from "@/app/lib/audit";
import type { QueryEntry } from "@/app/lib/types";

/**
 * POST /api/briefs — Generate a new brief (SSE streaming)
 */
export async function POST(request: Request) {
  try {
    const user = await getSession();
    if (!user) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Rate limit: 5 brief generations per hour
    const rl = rateLimit(`brief-gen:${user.id}`, 5, 3_600_000);
    if (!rl.allowed) {
      return Response.json(
        { error: "Brief generation rate limit exceeded. Max 5 per hour." },
        { status: 429, headers: { "Retry-After": String(Math.ceil((rl.resetMs - Date.now()) / 1000)) } }
      );
    }

    const body = await request.json();
    const { topic, pageType, niche, location, clientName, domain, manualKeywords } = body;

    if (!topic || typeof topic !== "string") {
      return Response.json({ error: "topic is required" }, { status: 400 });
    }
    if (!pageType || !["service", "location", "blog", "landing"].includes(pageType)) {
      return Response.json({ error: "Valid pageType required: service, location, blog, landing" }, { status: 400 });
    }

    logOperation({
      userId: user.id,
      action: "generate_brief",
      resource: "/api/briefs",
      metadata: { topic, pageType, niche },
    });

    const prisma = getPrisma();

    // Create draft brief record
    const brief = await prisma.brief.create({
      data: {
        userId: user.id,
        topic: topic.trim(),
        pageType,
        niche: niche || "general",
        location: location?.trim() || null,
        clientName: clientName?.trim() || null,
        domain: domain?.trim() || null,
        status: "draft",
        data: {
          contextualVectors: [], headings: [], entityMap: [], connectionMap: [],
          competitors: [], knowledgeGaps: [],
          queryPreAnalysis: null, serpAnalysis: null, deepCompetitorAnalysis: null,
          topicalMap: null, titleTag: null, headingValidation: null, qualityReport: null,
        },
      },
    });

    // Generate brief via pipeline (SSE stream)
    const pipelineStream = await generateBrief({
      topic: topic.trim(),
      pageType,
      niche: niche || "general",
      location: location?.trim(),
      clientName: clientName?.trim(),
      domain: domain?.trim(),
      manualKeywords: manualKeywords as QueryEntry[] | undefined,
    });

    // Wrap stream to capture final brief and save to DB
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const wrappedStream = new ReadableStream({
      async start(controller) {
        const reader = pipelineStream.getReader();

        // Send brief ID first so client can navigate
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ briefId: brief.id })}\n\n`)
        );

        try {
          let sseBuffer = "";
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            controller.enqueue(value);

            // Parse to capture final brief — buffer incomplete lines
            sseBuffer += decoder.decode(value, { stream: true });
            const lines = sseBuffer.split("\n");
            sseBuffer = lines.pop() ?? "";

            for (const line of lines) {
              if (!line.startsWith("data: ")) continue;
              const data = line.slice(6).trim();
              if (!data || data === "[DONE]") continue;
              try {
                const parsed = JSON.parse(data);
                if (parsed.done && parsed.brief) {
                  // Save final brief to DB
                  await prisma.brief.update({
                    where: { id: brief.id },
                    data: {
                      data: parsed.brief,
                      status: "reviewing",
                    },
                  });
                }
              } catch { /* skip incomplete chunk */ }
            }
          }
          controller.close();
        } catch (err) {
          console.error("[POST /api/briefs] Stream error:", err);
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: "Generation failed" })}\n\n`)
          );
          controller.close();
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
    console.error("[POST /api/briefs]", err);
    return Response.json({ error: "Failed to generate brief" }, { status: 500 });
  }
}

/**
 * GET /api/briefs — List user's briefs
 */
export async function GET() {
  try {
    const user = await getSession();
    if (!user) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    const prisma = getPrisma();
    const briefs = await prisma.brief.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        topic: true,
        pageType: true,
        niche: true,
        location: true,
        status: true,
        version: true,
        sessionId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return Response.json({ briefs });
  } catch (err) {
    console.error("[GET /api/briefs]", err);
    return Response.json({ error: "Failed to fetch briefs" }, { status: 500 });
  }
}
