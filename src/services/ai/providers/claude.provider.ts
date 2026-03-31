import Anthropic from "@anthropic-ai/sdk";
import type {
  IOcrProvider,
  OcrResult,
  OcrProviderConfig,
  OcrImage,
  ImageMimeType,
} from "../ocr.interface";
import { TOC_EXTRACTION_PROMPT } from "../prompts/toc-extraction";
import { parseOcrResponse } from "../ocr.utils";

export class ClaudeOcrProvider implements IOcrProvider {
  name = "claude";
  private client: Anthropic;

  constructor(apiKey?: string) {
    this.client = new Anthropic({
      apiKey: apiKey || process.env.ANTHROPIC_API_KEY,
    });
  }

  async extractTableOfContents(
    images: OcrImage[],
    config?: Partial<OcrProviderConfig>
  ): Promise<OcrResult> {
    const startTime = Date.now();

    try {
      const imageBlocks = images.map((img) => ({
        type: "image" as const,
        source: {
          type: "base64" as const,
          media_type: img.mimeType as ImageMimeType,
          data: img.base64,
        },
      }));

      const response = await this.client.messages.create({
        model: config?.model || "claude-sonnet-4-20250514",
        max_tokens: config?.maxTokens || 8192,
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

      const content = response.content[0];
      const text = content.type === "text" ? content.text : "";

      return {
        ...parseOcrResponse(text),
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
}
