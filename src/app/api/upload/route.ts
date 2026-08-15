import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { optimizeImage } from "@/lib/image-optimize";
import { MAX_UPLOAD_BYTES } from "@/lib/image-policy";
import { requireEditor } from "@/lib/require-editor";

async function uploadLocal(
  filename: string,
  buffer: Buffer
): Promise<{ url: string; pathname: string }> {
  const filePath = path.join(process.cwd(), "public", filename);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, buffer);
  return { url: `/${filename}`, pathname: filename };
}

export async function POST(request: NextRequest) {
  try {
    const denied = await requireEditor(request);
    if (denied) return denied;

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const folder = (formData.get("folder") as string) || "uploads";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // 驗證檔案類型
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Allowed: JPEG, PNG, WebP, GIF" },
        { status: 400 }
      );
    }

    // 驗證檔案大小。上限與 Vercel 的 request body 上限一致，超過的請求根本
    // 到不了這裡，改不了平台的回應，至少讓兩邊的規則說同一件事。
    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        { error: "File too large. Maximum size: 4.5MB" },
        { status: 400 }
      );
    }

    // 縮圖與轉檔，避免累積未優化的原檔
    const optimized = await optimizeImage(file, folder);

    // 產生檔案名稱。slice(2) 取小數部分，padEnd 補足短亂數（小數位數不固定，
    // 太短時裁切會得到空字串）
    const timestamp = Date.now();
    const suffix = Math.random().toString(36).slice(2).padEnd(6, "0").slice(0, 6);
    const filename = `${folder}/${timestamp}-${suffix}.${optimized.ext}`;

    // 有 Vercel Blob token 時上傳到 Blob，否則存到本地 public/
    // placeholder token 長度遠小於真正的 token，以此判斷是否為有效 token
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    const useLocalStorage = !token || token.length < 50;
    const result = useLocalStorage
      ? await uploadLocal(filename, optimized.data)
      : await put(filename, optimized.data, {
          access: "public",
          contentType: optimized.contentType,
        });

    return NextResponse.json({
      url: result.url,
      filename: result.pathname,
    });
  } catch (error) {
    console.error("Upload failed:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
