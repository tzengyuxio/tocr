import { GoogleGenerativeAI } from "@google/generative-ai";
import type {
  IOcrProvider,
  OcrResult,
  OcrProviderConfig,
  OcrImage,
} from "../ocr.interface";
import { TOC_EXTRACTION_PROMPT } from "../prompts/toc-extraction";
import { parseOcrResponse } from "../ocr.utils";

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
    images: OcrImage[],
    config?: Partial<OcrProviderConfig>
  ): Promise<OcrResult> {
    const startTime = Date.now();

    try {
      const model = this.client.getGenerativeModel({
        model: config?.model || "gemini-2.5-flash-preview-05-20",
      });

      const imageParts = images.map((img) => ({
        inlineData: {
          mimeType: img.mimeType,
          data: img.base64,
        },
      }));

      const result = await model.generateContent([
        ...imageParts,
        { text: TOC_EXTRACTION_PROMPT },
      ]);

      const response = await result.response;
      const content = response.text();

      return {
        ...parseOcrResponse(content),
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
}
