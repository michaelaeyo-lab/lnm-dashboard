import type { NextRequest } from "next/server";
import { retrieveChunks } from "@/app/lib/retrieval";

/**
 * GET /api/search?q=topical+authority&categories=01-semantic-seo,05-on-page-seo&topK=5
 *
 * Query params:
 *   q           - search query (required)
 *   categories  - comma-separated category filter (optional)
 *   topK        - max results, default 10 (optional)
 *   sourceTypes - comma-separated filter (optional)
 *   contentTypes - comma-separated filter (optional)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const query = searchParams.get("q");

  if (!query) {
    return Response.json({ error: "Missing required parameter: q" }, { status: 400 });
  }

  const categoriesParam = searchParams.get("categories");
  const topKParam = searchParams.get("topK");
  const sourceTypesParam = searchParams.get("sourceTypes");
  const contentTypesParam = searchParams.get("contentTypes");

  try {
    const results = await retrieveChunks({
      query,
      categories: categoriesParam ? categoriesParam.split(",") : undefined,
      topK: topKParam ? parseInt(topKParam, 10) : 10,
      sourceTypes: sourceTypesParam ? sourceTypesParam.split(",") : undefined,
      contentTypes: contentTypesParam ? contentTypesParam.split(",") : undefined,
    });

    return Response.json({ results, count: results.length });
  } catch (err) {
    console.error("[/api/search] Error:", err);
    return Response.json(
      { error: "Search failed", details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
