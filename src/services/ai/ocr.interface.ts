/**
 * AI OCR 服務介面定義
 * 設計為可抽換架構，支援 Claude、OpenAI、Gemini 等不同 Provider
 */

// 單篇文章辨識結果
export interface OcrArticleResult {
  title: string;
  subtitle?: string;
  authors?: string[];
  category?: string;
  pageStart?: number;
  pageEnd?: number;
  summary?: string;
  suggestedTags?: Array<{ name: string; type: string }>;
  suggestedGames?: string[];
  confidence: number; // 0-1 辨識信心度
}

// 完整辨識結果
export interface OcrResult {
  articles: OcrArticleResult[];
  rawText?: string;
  metadata?: {
    issueTitle?: string;
    publishDate?: string;
    pageInfo?: string;
  };
  provider: string;
  processingTime: number; // 毫秒
}

// Provider 設定
export interface OcrProviderConfig {
  apiKey: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

// 單張圖片資料
export interface OcrImage {
  base64: string;
  mimeType: string;
}

// Provider 介面
export interface IOcrProvider {
  name: string;

  /**
   * 從圖片中提取目錄資訊（支援多張圖片）
   * @param images 圖片陣列，每張包含 base64 編碼和 MIME 類型
   * @param config 可選的 Provider 設定
   */
  extractTableOfContents(
    images: OcrImage[],
    config?: Partial<OcrProviderConfig>
  ): Promise<OcrResult>;
}

// 支援的 Provider 類型
export type OcrProviderType = "claude" | "openai" | "gemini";

// 圖片 MIME 類型
export type ImageMimeType =
  | "image/jpeg"
  | "image/png"
  | "image/webp"
  | "image/gif";
