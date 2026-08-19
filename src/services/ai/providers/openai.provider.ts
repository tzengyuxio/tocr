import OpenAI from "openai";
import type { IOcrProvider, OcrResult, OcrImage } from "../ocr.interface";
import { TOC_EXTRACTION_PROMPT } from "../prompts/toc-extraction";
import { parseOcrResponse } from "../ocr.utils";

export class OpenAIOcrProvider implements IOcrProvider {
  name = "openai";
  private client: OpenAI;

  constructor(apiKey?: string) {
    this.client = new OpenAI({
      apiKey: apiKey || process.env.OPENAI_API_KEY,
      // Allows pointing at any OpenAI-compatible endpoint (vLLM, Ollama, ...)
      baseURL: process.env.OPENAI_BASE_URL,
    });
  }

  async extractTableOfContents(images: OcrImage[]): Promise<OcrResult> {
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
        model: process.env.OPENAI_MODEL || "gpt-4o",
        max_tokens: Number(process.env.OPENAI_MAX_TOKENS) || 8192,
        temperature: 0.1,
        messages: [
          {
            role: "user",
            content: [
              ...imageBlocks,
              { type: "text" as const, text: TOC_EXTRACTION_PROMPT },
            ],
          },
        ],
        // Ollama extension, not an OpenAI parameter -- only send it when the
        // endpoint is known to understand it. Reasoning models otherwise spend
        // the whole token budget on the chain and return empty content.
        ...(process.env.OPENAI_DISABLE_THINKING === "true"
          ? { think: false }
          : {}),
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
