import Anthropic from "@anthropic-ai/sdk";
import {
  IOcrProvider,
  OcrResult,
  OcrProviderConfig,
  ImageMimeType,
  OcrArticleResult,
} from "../ocr.interface";
import { TOC_EXTRACTION_PROMPT } from "../prompts/toc-extraction";

export class ClaudeOcrProvider implements IOcrProvider {
  name = "claude";
  private client: Anthropic;

  constructor(apiKey?: string) {
    this.client = new Anthropic({
      apiKey: apiKey || process.env.ANTHROPIC_API_KEY,
    });
  }

  async extractTableOfContents(
    imageBase64: string,
    mimeType: string,
    config?: Partial<OcrProviderConfig>
  ): Promise<OcrResult> {
    const startTime = Date.now();

    try {
      const response = await this.client.messages.create({
        model: config?.model || "claude-sonnet-4-20250514",
        max_tokens: config?.maxTokens || 4096,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: mimeType as ImageMimeType,
                  data: imageBase64,
                },
              },
              {
                type: "text",
                text: TOC_EXTRACTION_PROMPT,
              },
            ],
          },
        ],
      });

      const content = response.content[0];
      const text = content.type === "text" ? content.text : "";
      const parsed = this.parseResponse(text);

      return {
        ...parsed,
        provider: this.name,
        processingTime: Date.now() - startTime,
      };
    } catch (error) {
      console.error("Claude OCR Error:", error);
      throw new Error(
        `Claude OCR failed: ${error instanceof Error ? error.message : "Unknown error"}`
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
      console.error("Failed to parse Claude response:", error);
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
          ? a.suggestedTags.map(String)
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
