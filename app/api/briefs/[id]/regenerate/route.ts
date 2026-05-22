import { getSession } from "@/app/lib/session";
import { getPrisma } from "@/app/lib/db";
import { generateBrief } from "@/app/lib/brief-pipeline";
import { rateLimit } from "@/app/lib/security";
import { logOperation } from "@/app/lib/audit";

/**
 * POST /api/briefs/:id/regenerate — Re-run the 12-step pipeline on an existing brief
 * Uses the brief's original params (topic, niche, pageType, etc.) but runs
 * through the latest pipeline code. Increments version on completion.
 *
 * Optional body fields can override the original params:
 *   { topic?, pageType?, niche?, location?, clientName?, domain? }
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSession();
    if (!user) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Rate limit: shares the same bucket as new brief generation
    const rl = rateLimit(`brief-gen:${user.id}`, 5, 3_600_000);
    if (!rl.allowed) {
      return Response.json(
        { error: "Brief generation rate limit exceeded. Max 5 per hour." },
        { status: 429, headers: { "Retry-After": String(Math.ceil((rl.resetMs - Date.now()) / 1000)) } }
      );
    }

    const { id } = await params;
    const prisma = getPrisma();

    const existing = await prisma.brief.findFirst({
      where: { id, userId: user.id },
    });

    if (!existing) {
      return Response.json({ error: "Brief not found" }, { status: 404 });
    }

    // Parse optional overrides from request body
    let overrides: Record<string, unknown> = {};
    try {
      overrides = await request.json();
    } catch {
      // No body or invalid JSON — that's fine, use original params
    }

    const topic = (overrides.topic as string)?.trim() || existing.topic;
    const pageType = (overrides.pageType as string) || existing.pageType;
    const niche = (overrides.niche as string) || existing.niche;
    const location = overrides.location !== undefined
      ? (overrides.location as string)?.trim() || null
      : existing.location;
    const clientName = overrides.clientName !== undefined
      ? (overrides.clientName as string)?.trim() || null
      : existing.clientName;
    const domain = overrides.domain !== undefined
      ? (overrides.domain as string)?.trim() || null
      : existing.domain;

    logOperation({
      userId: user.id,
      action: "regenerate_brief",
      resource: `/api/briefs/${id}/regenerate`,
      metadata: { topic, pageType, niche, previousVersion: existing.version },
    });

    // Reset brief to draft while regenerating
    await prisma.brief.update({
      where: { id },
      data: {
        status: "draft",
        topic,
        pageType,
        niche,
        location,
        clientName,
        domain,
      },
    });

    // Run the pipeline with (possibly overridden) params
    const pipelineStream = await generateBrief({
      topic,
      pageType,
      niche,
      location: location || undefined,
      clientName: clientName || undefined,
      domain: domain || undefined,
    });

    // Wrap stream to capture final brief and save to DB
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const wrappedStream = new ReadableStream({
      async start(controller) {
        const reader = pipelineStream.getReader();

        // Send brief ID so client can confirm
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ briefId: id })}\n\n`)
        );

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            controller.enqueue(value);

            // Parse to capture final brief
            const text = decoder.decode(value, { stream: true });
            for (const line of text.split("\n")) {
              if (!line.startsWith("data: ")) continue;
              const data = line.slice(6);
              if (data === "[DONE]") continue;
              try {
                const parsed = JSON.parse(data);
                if (parsed.done && parsed.brief) {
                  // Save final brief — increment version
                  await prisma.brief.update({
                    where: { id },
                    data: {
                      data: parsed.brief,
                      status: "reviewing",
                      version: existing.version + 1,
                    },
                  });
                }
              } catch { /* skip parse errors */ }
            }
          }
          controller.close();
        } catch (err) {
          console.error("[POST /api/briefs/:id/regenerate] Stream error:", err);
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: "Regeneration failed" })}\n\n`)
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
    console.error("[POST /api/briefs/:id/regenerate]", err);
    return Response.json({ error: "Failed to regenerate brief" }, { status: 500 });
  }
}
