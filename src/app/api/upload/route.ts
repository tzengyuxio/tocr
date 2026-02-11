import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

async function uploadLocal(
  filename: string,
  file: File
): Promise<{ url: string; pathname: string }> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const filePath = path.join(process.cwd(), "public", filename);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, buffer);
  return { url: `/${filename}`, pathname: filename };
}

export async function POST(request: NextRequest) {
  try {
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

    // 驗證檔案大小 (最大 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File too large. Maximum size: 10MB" },
        { status: 400 }
      );
    }

    // 產生檔案名稱
    const timestamp = Date.now();
    const ext = file.name.split(".").pop();
    const filename = `${folder}/${timestamp}-${Math.random().toString(36).substring(7)}.${ext}`;

    // 有 Vercel Blob token 時上傳到 Blob，否則存到本地 public/
    // placeholder token 長度遠小於真正的 token，以此判斷是否為有效 token
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    const useLocalStorage = !token || token.length < 50;
    const result = useLocalStorage
      ? await uploadLocal(filename, file)
      : await put(filename, file, { access: "public" });

    return NextResponse.json({
      url: result.url,
      filename: result.pathname,
    });
  } catch (error) {
    console.error("Upload failed:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
