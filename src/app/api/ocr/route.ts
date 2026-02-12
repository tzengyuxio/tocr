import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { OcrProviderFactory } from "@/services/ai/ocr.factory";
import type { OcrProviderType, OcrImage } from "@/services/ai/ocr.interface";

// POST /api/ocr - 執行 AI 辨識（支援多圖）
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const provider =
      (formData.get("provider") as OcrProviderType) || "claude";
    const issueId = formData.get("issueId") as string | null;
    const origin = new URL(request.url).origin;

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
    ];

    const images: OcrImage[] = [];

    // 多圖：FormData 中多個 "images" 欄位
    const imageFiles = formData.getAll("images") as File[];
    if (imageFiles.length > 0) {
      for (const file of imageFiles) {
        if (!allowedTypes.includes(file.type)) {
          return NextResponse.json(
            { error: `Invalid image type: ${file.type}. Allowed: JPEG, PNG, WebP, GIF` },
            { status: 400 }
          );
        }
        const bytes = await file.arrayBuffer();
        images.push({
          base64: Buffer.from(bytes).toString("base64"),
          mimeType: file.type,
        });
      }
    }

    // 多圖 URL：FormData 中 "imageUrls" JSON 字串陣列
    const imageUrlsRaw = formData.get("imageUrls") as string | null;
    if (imageUrlsRaw) {
      const imageUrls: string[] = JSON.parse(imageUrlsRaw);
      for (const url of imageUrls) {
        const absoluteUrl = url.startsWith('http') ? url : `${origin}${url}`;
        const response = await fetch(absoluteUrl);
        if (!response.ok) {
          return NextResponse.json(
            { error: `Failed to fetch image from URL: ${url}` },
            { status: 400 }
          );
        }
        const buffer = await response.arrayBuffer();
        const mimeType = response.headers.get("content-type") || "image/jpeg";
        if (!allowedTypes.includes(mimeType)) {
          return NextResponse.json(
            { error: `Invalid image type from URL: ${mimeType}` },
            { status: 400 }
          );
        }
        images.push({
          base64: Buffer.from(buffer).toString("base64"),
          mimeType,
        });
      }
    }

    // 向下相容：單個 "image" 檔案或 "imageUrl"
    if (images.length === 0) {
      const image = formData.get("image") as File | null;
      const imageUrl = formData.get("imageUrl") as string | null;

      if (image) {
        if (!allowedTypes.includes(image.type)) {
          return NextResponse.json(
            { error: "Invalid image type. Allowed: JPEG, PNG, WebP, GIF" },
            { status: 400 }
          );
        }
        const bytes = await image.arrayBuffer();
        images.push({
          base64: Buffer.from(bytes).toString("base64"),
          mimeType: image.type,
        });
      } else if (imageUrl) {
        const absoluteImageUrl = imageUrl.startsWith('http') ? imageUrl : `${origin}${imageUrl}`;
        const response = await fetch(absoluteImageUrl);
        if (!response.ok) {
          return NextResponse.json(
            { error: "Failed to fetch image from URL" },
            { status: 400 }
          );
        }
        const buffer = await response.arrayBuffer();
        const mimeType = response.headers.get("content-type") || "image/jpeg";
        if (!allowedTypes.includes(mimeType)) {
          return NextResponse.json(
            { error: "Invalid image type. Allowed: JPEG, PNG, WebP, GIF" },
            { status: 400 }
          );
        }
        images.push({
          base64: Buffer.from(buffer).toString("base64"),
          mimeType,
        });
      }
    }

    if (images.length === 0) {
      return NextResponse.json(
        { error: "No images provided. Send 'images' files, 'imageUrls' JSON array, or single 'image'/'imageUrl'" },
        { status: 400 }
      );
    }

    // 執行 AI 辨識
    const ocrProvider = OcrProviderFactory.getProvider(provider);
    const result = await ocrProvider.extractTableOfContents(images);

    // 儲存辨識紀錄
    const ocrRecord = await prisma.ocrRecord.create({
      data: {
        issueId,
        imageUrl: imageUrlsRaw || formData.get("imageUrl") as string || "",
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
