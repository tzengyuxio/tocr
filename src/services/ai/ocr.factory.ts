import { IOcrProvider, OcrProviderType } from "./ocr.interface";
import { ClaudeOcrProvider } from "./providers/claude.provider";
import { OpenAIOcrProvider } from "./providers/openai.provider";
import { GeminiOcrProvider } from "./providers/gemini.provider";

/**
 * OCR Provider 工廠
 * 使用單例模式管理 Provider 實例
 */
export class OcrProviderFactory {
  private static providers: Map<string, IOcrProvider> = new Map();

  /**
   * 取得指定類型的 Provider
   */
  static getProvider(type: OcrProviderType): IOcrProvider {
    if (!this.providers.has(type)) {
      switch (type) {
        case "claude":
          this.providers.set(type, new ClaudeOcrProvider());
          break;
        case "openai":
          this.providers.set(type, new OpenAIOcrProvider());
          break;
        case "gemini":
          this.providers.set(type, new GeminiOcrProvider());
          break;
        default:
          throw new Error(`Unknown OCR provider: ${type}`);
      }
    }
    return this.providers.get(type)!;
  }

  /**
   * 取得預設 Provider（從環境變數讀取）
   */
  static getDefaultProvider(): IOcrProvider {
    const defaultProvider =
      (process.env.DEFAULT_OCR_PROVIDER as OcrProviderType) || "claude";
    return this.getProvider(defaultProvider);
  }

  /**
   * 取得所有可用的 Provider 類型
   */
  static getAvailableProviders(): OcrProviderType[] {
    const available: OcrProviderType[] = [];

    if (process.env.ANTHROPIC_API_KEY) {
      available.push("claude");
    }
    if (process.env.OPENAI_API_KEY) {
      available.push("openai");
    }
    if (process.env.GOOGLE_AI_API_KEY) {
      available.push("gemini");
    }

    return available;
  }

  /**
   * 清除快取的 Provider 實例（主要用於測試）
   */
  static clearCache(): void {
    this.providers.clear();
  }
}
