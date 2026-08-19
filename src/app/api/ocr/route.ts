import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { OcrProviderFactory } from "@/services/ai/ocr.factory";
import type { OcrProviderType, OcrImage } from "@/services/ai/ocr.interface";
import { resolveImageUrl, isSafeImageUrl } from "@/lib/resolve-image-url";
import { checkRateLimit } from "@/lib/rate-limit";
import { requireEditor } from "@/lib/require-editor";
import {
  ALLOWED_IMAGE_LABEL,
  DEFAULT_IMAGE_MIME_TYPE,
  isAllowedImageMimeType,
} from "@/lib/image-policy";

// Vision OCR on a full table-of-contents page routinely exceeds the platform
// default timeout; 60s is the Vercel Hobby ceiling.
export const maxDuration = 60;

// Best-effort only: the limiter keeps its counters in memory, so on Vercel each
// function instance counts on its own and the real ceiling is higher than this.
// It smooths accidental repeat submissions; it is not a defence against abuse.
const OCR_RATE_LIMIT = {
  maxRequests: 10,
  windowMs: 60_000,
};

// A table of contents runs to a handful of pages. Anything beyond this is a
// mistake or abuse, and each image is a billed model call against a 60s budget.
const MAX_IMAGES = 10;

function tooManyImages(count: number) {
  return NextResponse.json(
    { error: `Too many images: ${count}. Maximum is ${MAX_IMAGES} per request.` },
    { status: 400 }
  );
}

// POST /api/ocr - 執行 AI 辨識（支援多圖）
export async function POST(request: NextRequest) {
  try {
    const denied = await requireEditor(request);
    if (denied) return denied;

    // Rate limiting by IP (or forwarded IP behind proxy)
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";
    const rateLimitResult = checkRateLimit(`ocr:${ip}`, OCR_RATE_LIMIT);

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          error: "Too many OCR requests. Please try again later.",
          retryAfterMs: rateLimitResult.resetMs,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil(rateLimitResult.resetMs / 1000)),
            "X-RateLimit-Remaining": "0",
          },
        }
      );
    }

    const formData = await request.formData();
    // The admin UI always names a provider; scripts calling the API do not,
    // and defaulting them to Claude sends the request somewhere this
    // deployment may not even have a key for. GET reports the same default.
    const provider =
      (formData.get("provider") as OcrProviderType) ||
      OcrProviderFactory.getDefaultProviderType();
    // Asking for a provider this deployment has no key for fails deep inside
    // the SDK, and the handler reports that as a generic "OCR processing
    // failed" -- an afternoon of debugging for a request that was answerable
    // up front. GET /api/ocr lists the same set.
    const availableProviders = OcrProviderFactory.getAvailableProviders();
    if (!availableProviders.includes(provider)) {
      return NextResponse.json(
        {
          error: `OCR provider not available: ${provider}`,
          available: availableProviders,
        },
        { status: 400 }
      );
    }

    const issueId = formData.get("issueId") as string | null;

    const images: OcrImage[] = [];

    // 多圖：FormData 中多個 "images" 欄位
    const imageFiles = formData.getAll("images") as File[];
    if (imageFiles.length > MAX_IMAGES) {
      return tooManyImages(imageFiles.length);
    }
    if (imageFiles.length > 0) {
      for (const file of imageFiles) {
        if (!isAllowedImageMimeType(file.type)) {
          return NextResponse.json(
            { error: `Invalid image type: ${file.type}. Allowed: ${ALLOWED_IMAGE_LABEL}` },
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
      if (images.length + imageUrls.length > MAX_IMAGES) {
        return tooManyImages(images.length + imageUrls.length);
      }
      for (const url of imageUrls) {
        if (!isSafeImageUrl(url)) {
          return NextResponse.json(
            { error: `URL not allowed: ${url}. Only same-origin and trusted storage URLs are permitted.` },
            { status: 400 }
          );
        }
        const absoluteUrl = resolveImageUrl(url);
        const response = await fetch(absoluteUrl);
        if (!response.ok) {
          return NextResponse.json(
            { error: `Failed to fetch image from URL: ${url}` },
            { status: 400 }
          );
        }
        const buffer = await response.arrayBuffer();
        const mimeType = response.headers.get("content-type") || DEFAULT_IMAGE_MIME_TYPE;
        if (!isAllowedImageMimeType(mimeType)) {
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
        if (!isAllowedImageMimeType(image.type)) {
          return NextResponse.json(
            { error: "Invalid image type. Allowed: ${ALLOWED_IMAGE_LABEL}" },
            { status: 400 }
          );
        }
        const bytes = await image.arrayBuffer();
        images.push({
          base64: Buffer.from(bytes).toString("base64"),
          mimeType: image.type,
        });
      } else if (imageUrl) {
        if (!isSafeImageUrl(imageUrl)) {
          return NextResponse.json(
            { error: `URL not allowed: ${imageUrl}. Only same-origin and trusted storage URLs are permitted.` },
            { status: 400 }
          );
        }
        const absoluteImageUrl = resolveImageUrl(imageUrl);
        const response = await fetch(absoluteImageUrl);
        if (!response.ok) {
          return NextResponse.json(
            { error: "Failed to fetch image from URL" },
            { status: 400 }
          );
        }
        const buffer = await response.arrayBuffer();
        const mimeType = response.headers.get("content-type") || DEFAULT_IMAGE_MIME_TYPE;
        if (!isAllowedImageMimeType(mimeType)) {
          return NextResponse.json(
            { error: "Invalid image type. Allowed: ${ALLOWED_IMAGE_LABEL}" },
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
      },
    });

    return NextResponse.json({
      id: ocrRecord.id,
      result,
    });
  } catch (error) {
    // Logged in full, reported generically: the message comes from the
    // self-hosted model backend and can carry internal URLs and configuration.
    console.error("OCR Error:", error);

    return NextResponse.json(
      { error: "OCR processing failed" },
      { status: 500 }
    );
  }
}

// GET /api/ocr - 取得可用的 Provider 列表
export async function GET() {
  const availableProviders = OcrProviderFactory.getAvailableProviders();

  return NextResponse.json({
    providers: availableProviders,
    default: OcrProviderFactory.getDefaultProviderType(),
  });
}
