import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  IOcrProvider,
  OcrResult,
  OcrProviderConfig,
  OcrArticleResult,
} from "../ocr.interface";
import { TOC_EXTRACTION_PROMPT } from "../prompts/toc-extraction";

export class GeminiOcrProvider implements IOcrProvider {
  name = "gemini";
  private client: GoogleGenerativeAI;

  constructor(apiKey?: string) {
    const key = apiKey || process.env.GOOGLE_AI_API_KEY;
    if (!key) {
      throw new Error("Google AI API key is required");
    }
    this.client = new GoogleGenerativeAI(key);
  }

  async extractTableOfContents(
    imageBase64: string,
    mimeType: string,
    config?: Partial<OcrProviderConfig>
  ): Promise<OcrResult> {
    const startTime = Date.now();

    try {
      const model = this.client.getGenerativeModel({
        model: config?.model || "gemini-2.0-flash",
      });

      const result = await model.generateContent([
        {
          inlineData: {
            mimeType,
            data: imageBase64,
          },
        },
        { text: TOC_EXTRACTION_PROMPT },
      ]);

      const response = await result.response;
      const content = response.text();
      const parsed = this.parseResponse(content);

      return {
        ...parsed,
        provider: this.name,
        processingTime: Date.now() - startTime,
      };
    } catch (error) {
      console.error("Gemini OCR Error:", error);
      throw new Error(
        `Gemini OCR failed: ${error instanceof Error ? error.message : "Unknown error"}`
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
      console.error("Failed to parse Gemini response:", error);
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
