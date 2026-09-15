import OpenAI from "openai";
import type { IOcrProvider, OcrResult, OcrImage } from "../ocr.interface";
import { TOC_EXTRACTION_PROMPT } from "../prompts/toc-extraction";
import { parseOcrResponse } from "../ocr.utils";

/**
 * 任何 OpenAI 相容端點：官方 API、自架的 llama-server／vLLM／Ollama。
 *
 * **這個任務要關掉模型的思考模式。** 同一張目錄圖（《軟體世界》60 期，人工複查
 * 66 篇），開著思考只辨識出 27–33 篇，關掉就是 66 篇——差別不在快慢，在於思考
 * 會讓模型把「逐條轉錄」做成「摘要挑選」。調 `reasoning_effort` 的檔位沒有用，
 * 三檔都落在 27–33（2026-09-13 在自架後端上實測）。
 *
 * 關法**不在這裡**：怎麼關是後端的方言（Ollama 吃 `think: false`，llama-server
 * 要 `chat_template_kwargs.enable_thinking`），這支 provider 送不出一個到處都對的
 * 形狀。目前是在閘道的模型路由上設定的。**判斷有沒有生效**：回應裡出現
 * `reasoning_content` 或思考內容就是沒生效，症狀是辨識量無預警砍半。
 */
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

      const stream = await this.client.chat.completions.create({
        model: process.env.OPENAI_MODEL || "gpt-4o",
        max_tokens: Number(process.env.OPENAI_MAX_TOKENS) || 8192,
        // Transcription has one right answer, so sampling freedom buys nothing
        // and costs recall: at 0.1 the same scan came back with 37 articles on
        // one run and 51 on the next (電擊Dreamcast 31, 53 by hand). Measured
        // on the self-hosted backend 2026-09-13.
        temperature: 0,
        messages: [
          {
            role: "user",
            content: [
              ...imageBlocks,
              { type: "text" as const, text: TOC_EXTRACTION_PROMPT },
            ],
          },
        ],
        // Streamed so the response keeps flowing: the self-hosted backend sits
        // behind Cloudflare, whose 100s cap is not configurable on any plan and
        // cuts a silent hole in the results -- a dense page takes 65s and a
        // pathological one runs past 150s. Streaming does not make those any
        // faster; it stops them from being cut off mid-answer.
        stream: true,
        // Streamed responses carry no usage unless asked, and the gateway's
        // spend log is what the token budget is reasoned about.
        stream_options: { include_usage: true },
      });

      let content = "";
      let finishReason: string | null = null;
      for await (const chunk of stream) {
        // The usage-only chunk at the end has an empty choices array.
        const choice = chunk.choices[0];
        if (!choice) continue;
        content += choice.delta?.content ?? "";
        if (choice.finish_reason) finishReason = choice.finish_reason;
      }

      // `length` means the model was cut off at max_tokens -- the reasoning
      // chain eating the whole budget produced exactly this, with an empty
      // body, and it used to read as "the scan has nothing on it". Only a
      // reported-but-wrong reason is an error: endpoints that never send
      // finish_reason fall through to the parser, which catches a truncated
      // body on its own.
      if (finishReason && finishReason !== "stop") {
        return {
          articles: [],
          rawText: content,
          parseError: `模型的回應沒有正常結束（finish_reason=${finishReason}）`,
          provider: this.name,
          processingTime: Date.now() - startTime,
        };
      }

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
