/**
 * @jest-environment node
 */
import { prismaMock, resetPrismaMock } from "../__mocks__/prisma";
import { POST } from "@/app/api/ocr/route";
import { OcrProviderFactory } from "@/services/ai/ocr.factory";
import { requireEditor } from "@/lib/require-editor";
import { NextRequest, NextResponse } from "next/server";

// The route's authorisation layer pulls in next-auth, which is ESM and cannot
// be loaded here. These cases are about provider selection; the layer itself is
// covered in require-editor.test.ts.
jest.mock("@/lib/require-editor", () => ({
  requireEditor: jest.fn().mockResolvedValue(null),
}));

jest.mock("@/services/ai/ocr.factory", () => ({
  OcrProviderFactory: {
    getProvider: jest.fn(() => ({
      extractTableOfContents: jest.fn().mockResolvedValue({ articles: [] }),
    })),
    getAvailableProviders: jest.fn(() => ["claude", "openai", "gemini"]),
    // Kept in step with the real factory: these cases are about the route
    // reading the deployment default, not about where the default lives.
    getDefaultProviderType: jest.fn(
      () => process.env.DEFAULT_OCR_PROVIDER || "claude"
    ),
  },
}));

const requireEditorMock = requireEditor as jest.Mock;
const getProvider = OcrProviderFactory.getProvider as jest.Mock;
const getAvailableProviders =
  OcrProviderFactory.getAvailableProviders as jest.Mock;

function requestWith(fields: Record<string, string>) {
  const body = new FormData();
  body.append("image", new File(["fake"], "toc.jpg", { type: "image/jpeg" }));
  for (const [key, value] of Object.entries(fields)) {
    body.append(key, value);
  }
  // A fresh IP per request keeps the in-memory rate limiter out of the way.
  return new NextRequest(new URL("http://localhost:3000/api/ocr"), {
    method: "POST",
    body,
    headers: { "x-real-ip": Math.random().toString(36).slice(2) },
  });
}

beforeEach(() => {
  resetPrismaMock();
  requireEditorMock.mockClear().mockResolvedValue(null);
  getProvider.mockClear();
  getAvailableProviders.mockReturnValue(["claude", "openai", "gemini"]);
  prismaMock.ocrRecord.create.mockResolvedValue({ id: "ocr-1" });
});

describe("POST /api/ocr provider selection", () => {
  it("uses the provider the caller asked for", async () => {
    process.env.DEFAULT_OCR_PROVIDER = "openai";

    await POST(requestWith({ provider: "gemini" }));

    expect(getProvider).toHaveBeenCalledWith("gemini");
  });

  it("falls back to the deployment's configured provider", async () => {
    process.env.DEFAULT_OCR_PROVIDER = "openai";

    await POST(requestWith({}));

    expect(getProvider).toHaveBeenCalledWith("openai");
  });

  it("falls back to claude when nothing is configured", async () => {
    delete process.env.DEFAULT_OCR_PROVIDER;

    await POST(requestWith({}));

    expect(getProvider).toHaveBeenCalledWith("claude");
  });

  it("rejects a provider this deployment has no key for", async () => {
    getAvailableProviders.mockReturnValue(["openai"]);

    const res = await POST(requestWith({ provider: "claude" }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.available).toEqual(["openai"]);
    expect(getProvider).not.toHaveBeenCalled();
  });
});

// The route calls a paid model, so it repeats the check middleware already
// makes -- see require-editor.ts for why one layer is not enough.
describe("POST /api/ocr authorisation", () => {
  it("stops before the model call when the caller is not allowed", async () => {
    requireEditorMock.mockResolvedValue(
      NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    );

    const response = await POST(requestWith({}));

    expect(response.status).toBe(401);
    expect(getProvider).not.toHaveBeenCalled();
  });
});
