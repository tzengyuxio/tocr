import type { OcrResult, OcrArticleResult } from "./ocr.interface";
import { isArticleCategory } from "@/lib/article-categories";

/**
 * Parse AI response text into structured OCR result.
 * Shared across all providers (Claude, OpenAI, Gemini).
 */

/**
 * Put back the opening quote of a string value that lost one.
 *
 * The self-hosted qwen-tw backend drops it, reproducibly: `"title":囂張拳王",`
 * cost 軟體世界 35 and 36 seven runs each, every one returning zero articles
 * with no sign of why. Only a value that ends in a quote without starting with
 * one is touched, so numbers, null, arrays and objects are left alone.
 *
 * The value has to close on its own line: [^"] matches a newline as well, so a
 * pattern without the guard runs `"pageStart": 12,` into the quote on the line
 * below and breaks a field that was never wrong.
 */
function repairUnquotedValues(json: string): string {
  return json.replace(
    /^(\s*"[A-Za-z]\w*":\s*)([^"\s[{][^"\n]*")(,?)[ \t]*$/gm,
    '$1"$2$3'
  );
}

export function parseOcrResponse(
  text: string
): Omit<OcrResult, "provider" | "processingTime"> {
  // Try to extract JSON block (with or without ```json wrapper)
  const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/);
  const jsonStr = (jsonMatch ? jsonMatch[1] : text).trim();

  if (!jsonStr.startsWith("{") && !jsonStr.startsWith("[")) {
    return {
      articles: [],
      rawText: text,
      parseError: "AI 沒有回傳 JSON",
    };
  }

  // The repair is a second attempt, never the first: a response that parses as
  // it stands must not be rewritten on the way in.
  let lastError: unknown;
  for (const [attempt, candidate] of [
    jsonStr,
    repairUnquotedValues(jsonStr),
  ].entries()) {
    try {
      const parsed = JSON.parse(candidate);
      // Says out loud when the fallback was what saved the response. The
      // dropped opening quote is suspected to come from presence_penalty 1.5,
      // inherited from the qwen3.6 base by every derived model; the qwen-ocr
      // backend sets it to 0. If this line stops appearing, the repair above
      // has become dead code and can go.
      if (attempt > 0) {
        console.warn(
          "parseOcrResponse: JSON only parsed after repairUnquotedValues()"
        );
      }
      return {
        articles: normalizeArticles(parsed.articles || []),
        metadata: parsed.metadata || {},
        rawText: text,
      };
    } catch (error) {
      lastError = error;
    }
  }

  // Reported rather than swallowed: returning an empty list here is what made
  // a malformed response look like a scan with nothing on it.
  return {
    articles: [],
    rawText: text,
    parseError:
      lastError instanceof Error ? lastError.message : "AI 回傳的內容無法解析",
  };
}

function normalizeArticles(articles: unknown[]): OcrArticleResult[] {
  return articles.map((article: unknown) => {
    const a = article as Record<string, unknown>;
    return {
      title: String(a.title || ""),
      subtitle: a.subtitle ? String(a.subtitle) : undefined,
      authors: Array.isArray(a.authors) ? a.authors.map(String) : [],
      // The model is given the keys, but a hallucinated one must not reach
      // the database, where the column only accepts the enum.
      category: isArticleCategory(a.category) ? a.category : undefined,
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
