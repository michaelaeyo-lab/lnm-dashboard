import { getSession } from "@/app/lib/session";
import { getPrisma } from "@/app/lib/db";

/**
 * GET /api/content/export/[id] — Export a content session as markdown
 */
export async function GET(
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

    const session = await prisma.contentSession.findFirst({
      where: { id, userId: user.id },
      include: { sections: { orderBy: { sortOrder: "asc" } } },
    });

    if (!session) {
      return Response.json({ error: "Session not found" }, { status: 404 });
    }

    // Build markdown from sections
    const parts: string[] = [];

    for (const section of session.sections) {
      const prefix = "#".repeat(section.headingLevel);
      parts.push(`${prefix} ${section.headingText}`);

      if (section.content) {
        parts.push("", section.content);
      } else {
        parts.push("", `*[Section not yet generated]*`);
      }

      parts.push("");
    }

    const markdown = parts.join("\n");

    return new Response(markdown, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="${session.title.replace(/[^a-zA-Z0-9-_ ]/g, "")}.md"`,
      },
    });
  } catch (err) {
    console.error("[GET /api/content/export/[id]]", err);
    return Response.json({ error: "Export failed" }, { status: 500 });
  }
}
