import type { OcrResult, OcrArticleResult } from "./ocr.interface";

/**
 * Parse AI response text into structured OCR result.
 * Shared across all providers (Claude, OpenAI, Gemini).
 */
export function parseOcrResponse(
  text: string
): Omit<OcrResult, "provider" | "processingTime"> {
  try {
    // Try to extract JSON block (with or without ```json wrapper)
    const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/);
    let jsonStr = jsonMatch ? jsonMatch[1] : text;

    jsonStr = jsonStr.trim();
    if (jsonStr.startsWith("{") || jsonStr.startsWith("[")) {
      const parsed = JSON.parse(jsonStr);
      return {
        articles: normalizeArticles(parsed.articles || []),
        metadata: parsed.metadata || {},
        rawText: text,
      };
    }

    return { articles: [], rawText: text };
  } catch {
    return { articles: [], rawText: text };
  }
}

function normalizeArticles(articles: unknown[]): OcrArticleResult[] {
  return articles.map((article: unknown) => {
    const a = article as Record<string, unknown>;
    return {
      title: String(a.title || ""),
      subtitle: a.subtitle ? String(a.subtitle) : undefined,
      authors: Array.isArray(a.authors) ? a.authors.map(String) : [],
      category: a.category ? String(a.category) : undefined,
      pageStart: typeof a.pageStart === "number" ? a.pageStart : undefined,
      pageEnd: typeof a.pageEnd === "number" ? a.pageEnd : undefined,
      summary: a.summary ? String(a.summary) : undefined,
      suggestedTags: Array.isArray(a.suggestedTags)
        ? a.suggestedTags.map((t: unknown) =>
            typeof t === "string"
              ? { name: t, type: "GENERAL" }
              : {
                  name: String((t as Record<string, unknown>).name || ""),
                  type: String((t as Record<string, unknown>).type || "GENERAL"),
                }
          )
        : [],
      suggestedGames: Array.isArray(a.suggestedGames)
        ? a.suggestedGames.map(String)
        : [],
      confidence: typeof a.confidence === "number" ? a.confidence : 0.8,
    };
  });
}
