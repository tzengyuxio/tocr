import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { OcrProviderFactory } from "@/services/ai/ocr.factory";
import { OcrProviderType } from "@/services/ai/ocr.interface";

// POST /api/ocr - 執行 AI 辨識
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const image = formData.get("image") as File | null;
    const imageUrl = formData.get("imageUrl") as string | null;
    const provider =
      (formData.get("provider") as OcrProviderType) || "claude";
    const issueId = formData.get("issueId") as string | null;

    // 取得圖片資料
    let imageBase64: string;
    let mimeType: string;

    if (image) {
      // 從上傳的檔案取得
      const bytes = await image.arrayBuffer();
      imageBase64 = Buffer.from(bytes).toString("base64");
      mimeType = image.type;
    } else if (imageUrl) {
      // 從 URL 取得
      const response = await fetch(imageUrl);
      if (!response.ok) {
        return NextResponse.json(
          { error: "Failed to fetch image from URL" },
          { status: 400 }
        );
      }
      const buffer = await response.arrayBuffer();
      imageBase64 = Buffer.from(buffer).toString("base64");
      mimeType =
        response.headers.get("content-type") || "image/jpeg";
    } else {
      return NextResponse.json(
        { error: "No image provided. Send either 'image' file or 'imageUrl'" },
        { status: 400 }
      );
    }

    // 驗證圖片類型
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
    ];
    if (!allowedTypes.includes(mimeType)) {
      return NextResponse.json(
        { error: "Invalid image type. Allowed: JPEG, PNG, WebP, GIF" },
        { status: 400 }
      );
    }

    // 執行 AI 辨識
    const ocrProvider = OcrProviderFactory.getProvider(provider);
    const result = await ocrProvider.extractTableOfContents(
      imageBase64,
      mimeType
    );

    // 儲存辨識紀錄
    const ocrRecord = await prisma.ocrRecord.create({
      data: {
        issueId,
        imageUrl: imageUrl || "",
        provider,
        rawResult: result as object,
        status: "COMPLETED",
      },
    });

    return NextResponse.json({
      id: ocrRecord.id,
      result,
    });
  } catch (error) {
    console.error("OCR Error:", error);

    // 若有錯誤，也記錄下來
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      {
        error: "OCR processing failed",
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}

// GET /api/ocr - 取得可用的 Provider 列表
export async function GET() {
  const availableProviders = OcrProviderFactory.getAvailableProviders();

  return NextResponse.json({
    providers: availableProviders,
    default: process.env.DEFAULT_OCR_PROVIDER || "claude",
  });
}
