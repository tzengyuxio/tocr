/**
 * @jest-environment node
 */
import { prismaMock, resetPrismaMock } from "../__mocks__/prisma";
import { POST } from "@/app/api/ocr/route";
import { OcrProviderFactory } from "@/services/ai/ocr.factory";
import { NextRequest } from "next/server";

jest.mock("@/services/ai/ocr.factory", () => ({
  OcrProviderFactory: {
    getProvider: jest.fn(() => ({
      extractTableOfContents: jest.fn().mockResolvedValue({ articles: [] }),
    })),
    getAvailableProviders: jest.fn(() => []),
  },
}));

const getProvider = OcrProviderFactory.getProvider as jest.Mock;

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
  getProvider.mockClear();
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
});
