/**
 * @jest-environment node
 */
jest.mock("@/lib/auth", () => ({ auth: jest.fn() }));
jest.mock("@/lib/dev-auth", () => ({ isDevBypass: false, DEV_USER: { id: "dev-user", role: "ADMIN" } }));
jest.mock("@/lib/user-api-token", () => ({ resolveApiToken: jest.fn() }));

import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { resolveApiToken } from "@/lib/user-api-token";
import { requireEditor, sessionEditorId } from "@/lib/require-editor";

const authMock = auth as unknown as jest.Mock;
const resolveApiTokenMock = resolveApiToken as jest.Mock;

const ORIGINAL_TOKEN = process.env.API_TOKEN;

function requestWith(headers: Record<string, string> = {}) {
  return new NextRequest("https://tocr.simagame.me/api/ocr", {
    method: "POST",
    headers,
  });
}

beforeEach(() => {
  authMock.mockReset().mockResolvedValue(null);
  resolveApiTokenMock.mockReset().mockResolvedValue(null);
  delete process.env.API_TOKEN;
});

afterEach(() => {
  if (ORIGINAL_TOKEN === undefined) {
    delete process.env.API_TOKEN;
  } else {
    process.env.API_TOKEN = ORIGINAL_TOKEN;
  }
});

describe("requireEditor", () => {
  it("rejects a caller with no session as 401", async () => {
    const response = await requireEditor(requestWith());

    expect(response?.status).toBe(401);
  });

  it("rejects a signed-in VIEWER as 403", async () => {
    authMock.mockResolvedValue({ user: { id: "u1", role: "VIEWER" } });

    const response = await requireEditor(requestWith());

    expect(response?.status).toBe(403);
  });

  it("rejects a session whose user carries no role", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } });

    const response = await requireEditor(requestWith());

    expect(response?.status).toBe(403);
  });

  it("lets an EDITOR through", async () => {
    authMock.mockResolvedValue({ user: { id: "u1", role: "EDITOR" } });

    expect(await requireEditor(requestWith())).toBeNull();
  });

  it("lets an ADMIN through", async () => {
    authMock.mockResolvedValue({ user: { id: "u1", role: "ADMIN" } });

    expect(await requireEditor(requestWith())).toBeNull();
  });

  // Scripted imports have no session; middleware accepts the token for writes
  // and this layer has to agree, or it breaks them instead of protecting them.
  it("lets a valid API token through without a session", async () => {
    process.env.API_TOKEN = "s3cret-token";

    const response = await requireEditor(
      requestWith({ authorization: "Bearer s3cret-token" })
    );

    expect(response).toBeNull();
    expect(authMock).not.toHaveBeenCalled();
  });

  it("does not accept a wrong token", async () => {
    process.env.API_TOKEN = "s3cret-token";

    const response = await requireEditor(
      requestWith({ authorization: "Bearer wrong-token" })
    );

    expect(response?.status).toBe(401);
  });

  it("lets a contributor's own token through", async () => {
    resolveApiTokenMock.mockResolvedValue({ userId: "u1", tokenId: "tok-1" });

    const response = await requireEditor(
      requestWith({ authorization: "Bearer tocr_whatever" })
    );

    expect(response).toBeNull();
  });

  it("rejects a token that resolves to nobody", async () => {
    const response = await requireEditor(
      requestWith({ authorization: "Bearer tocr_revoked" })
    );

    expect(response?.status).toBe(401);
  });
});

// Minting a token is the one thing a token must not buy: a token that can
// create another one cannot be revoked.
describe("sessionEditorId", () => {
  it("ignores an API token entirely", async () => {
    process.env.API_TOKEN = "s3cret-token";
    resolveApiTokenMock.mockResolvedValue({ userId: "u1", tokenId: "tok-1" });

    expect(await sessionEditorId()).toBeNull();
  });

  it("returns the signed-in editor", async () => {
    authMock.mockResolvedValue({ user: { id: "u1", role: "EDITOR" } });

    expect(await sessionEditorId()).toBe("u1");
  });

  it("turns down a VIEWER", async () => {
    authMock.mockResolvedValue({ user: { id: "u1", role: "VIEWER" } });

    expect(await sessionEditorId()).toBeNull();
  });
});
