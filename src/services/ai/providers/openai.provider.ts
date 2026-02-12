import OpenAI from "openai";
import {
  IOcrProvider,
  OcrResult,
  OcrProviderConfig,
  OcrImage,
  OcrArticleResult,
} from "../ocr.interface";
import { TOC_EXTRACTION_PROMPT } from "../prompts/toc-extraction";

export class OpenAIOcrProvider implements IOcrProvider {
  name = "openai";
  private client: OpenAI;

  constructor(apiKey?: string) {
    this.client = new OpenAI({
      apiKey: apiKey || process.env.OPENAI_API_KEY,
    });
  }

  async extractTableOfContents(
    images: OcrImage[],
    config?: Partial<OcrProviderConfig>
  ): Promise<OcrResult> {
    const startTime = Date.now();

    try {
      const imageBlocks = images.map((img) => ({
        type: "image_url" as const,
        image_url: {
          url: `data:${img.mimeType};base64,${img.base64}`,
          detail: "high" as const,
        },
      }));

      const response = await this.client.chat.completions.create({
        model: config?.model || "gpt-4o",
        max_tokens: config?.maxTokens || 4096,
        temperature: config?.temperature ?? 0.1,
        messages: [
          {
            role: "user",
            content: [
              ...imageBlocks,
              {
                type: "text" as const,
                text: TOC_EXTRACTION_PROMPT,
              },
            ],
          },
        ],
      });

      const content = response.choices[0]?.message?.content || "";
      const parsed = this.parseResponse(content);

      return {
        ...parsed,
        provider: this.name,
        processingTime: Date.now() - startTime,
      };
    } catch (error) {
      console.error("OpenAI OCR Error:", error);
      throw new Error(
        `OpenAI OCR failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  private parseResponse(
    text: string
  ): Omit<OcrResult, "provider" | "processingTime"> {
    try {
      // 嘗試提取 JSON 區塊
      const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/);
      let jsonStr = jsonMatch ? jsonMatch[1] : text;

      // 清理可能的前後空白和非 JSON 字元
      jsonStr = jsonStr.trim();
      if (jsonStr.startsWith("{") || jsonStr.startsWith("[")) {
        const parsed = JSON.parse(jsonStr);

        // 確保回傳格式正確
        return {
          articles: this.normalizeArticles(parsed.articles || []),
          metadata: parsed.metadata || {},
          rawText: text,
        };
      }

      // 若無法解析，回傳空結果
      return {
        articles: [],
        rawText: text,
      };
    } catch (error) {
      console.error("Failed to parse OpenAI response:", error);
      return {
        articles: [],
        rawText: text,
      };
    }
  }

  private normalizeArticles(articles: unknown[]): OcrArticleResult[] {
    return articles.map((article: unknown) => {
      const a = article as Record<string, unknown>;
      return {
        title: String(a.title || ""),
        subtitle: a.subtitle ? String(a.subtitle) : undefined,
        authors: Array.isArray(a.authors)
          ? a.authors.map(String)
          : [],
        category: a.category ? String(a.category) : undefined,
        pageStart:
          typeof a.pageStart === "number" ? a.pageStart : undefined,
        pageEnd:
          typeof a.pageEnd === "number" ? a.pageEnd : undefined,
        summary: a.summary ? String(a.summary) : undefined,
        suggestedTags: Array.isArray(a.suggestedTags)
          ? a.suggestedTags.map((t: unknown) =>
              typeof t === "string"
                ? { name: t, type: "GENERAL" }
                : { name: String((t as Record<string, unknown>).name || ""), type: String((t as Record<string, unknown>).type || "GENERAL") }
            )
          : [],
        suggestedGames: Array.isArray(a.suggestedGames)
          ? a.suggestedGames.map(String)
          : [],
        confidence:
          typeof a.confidence === "number" ? a.confidence : 0.8,
      };
    });
  }
}
