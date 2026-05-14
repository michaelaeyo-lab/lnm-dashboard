import "dotenv/config";
import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const MODEL = "text-embedding-3-small";
const DIMENSIONS = 1536;

/**
 * Embed multiple texts in a single API call (max ~8191 tokens per text).
 * OpenAI batches internally — send up to 2048 texts per call.
 */
export async function embedTexts(texts: string[]): Promise<number[][]> {
  const response = await client.embeddings.create({
    model: MODEL,
    dimensions: DIMENSIONS,
    input: texts,
  });
  // Response embeddings are returned in the same order as input
  return response.data
    .sort((a, b) => a.index - b.index)
    .map((d) => d.embedding);
}

/** Embed a single text string. */
export async function embedSingle(text: string): Promise<number[]> {
  const [embedding] = await embedTexts([text]);
  return embedding;
}
