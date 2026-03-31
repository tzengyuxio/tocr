import OpenAI from "openai";
import type {
  IOcrProvider,
  OcrResult,
  OcrProviderConfig,
  OcrImage,
} from "../ocr.interface";
import { TOC_EXTRACTION_PROMPT } from "../prompts/toc-extraction";
import { parseOcrResponse } from "../ocr.utils";

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
        max_tokens: config?.maxTokens || 8192,
        temperature: config?.temperature ?? 0.1,
        messages: [
          {
            role: "user",
            content: [
              ...imageBlocks,
              { type: "text" as const, text: TOC_EXTRACTION_PROMPT },
            ],
          },
        ],
      });

      const content = response.choices[0]?.message?.content || "";

      return {
        ...parseOcrResponse(content),
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
}
