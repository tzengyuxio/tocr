/**
 * @jest-environment node
 */
jest.mock("@/lib/prisma", () => ({
  prisma: {
    editLog: { create: jest.fn(), createMany: jest.fn() },
    user: { upsert: jest.fn() },
  },
}));
jest.mock("@/lib/auth", () => ({ auth: jest.fn() }));
jest.mock("next/headers", () => ({ headers: jest.fn() }));
jest.mock("@/lib/dev-auth", () => ({
  isDevBypass: false,
  DEV_USER: { id: "dev-user", email: "dev@localhost", name: "Dev", role: "ADMIN" },
}));
jest.mock("@/lib/user-api-token", () => ({ resolveApiToken: jest.fn() }));

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { resolveApiToken } from "@/lib/user-api-token";
import { logEdit } from "@/lib/edit-log";
import { API_USER } from "@/lib/api-token";

const createMock = (prisma.editLog as unknown as { create: jest.Mock }).create;
const upsertMock = (prisma.user as unknown as { upsert: jest.Mock }).upsert;
const authMock = auth as unknown as jest.Mock;
const headersMock = headers as unknown as jest.Mock;
const resolveApiTokenMock = resolveApiToken as jest.Mock;

const ORIGINAL_TOKEN = process.env.API_TOKEN;

function withAuthorization(value: string | null) {
  headersMock.mockResolvedValue({ get: () => value });
}

beforeEach(() => {
  createMock.mockReset().mockResolvedValue({ id: "log-1" });
  upsertMock.mockReset().mockResolvedValue({ id: "u1" });
  authMock.mockReset().mockResolvedValue(null);
  resolveApiTokenMock.mockReset().mockResolvedValue(null);
  withAuthorization(null);
  delete process.env.API_TOKEN;
});

afterEach(() => {
  if (ORIGINAL_TOKEN === undefined) {
    delete process.env.API_TOKEN;
  } else {
    process.env.API_TOKEN = ORIGINAL_TOKEN;
  }
});

/** The data the log row was written with. */
function loggedRow() {
  return createMock.mock.calls[0][0].data;
}

describe("who an edit is attributed to", () => {
  it("signs a token write with its owner, not with the script account", async () => {
    withAuthorization("Bearer tocr_something");
    resolveApiTokenMock.mockResolvedValue({ userId: "u1", tokenId: "tok-1" });

    await logEdit("Game", "game-1", "CREATE");

    expect(loggedRow()).toEqual(
      expect.objectContaining({ userId: "u1", via: "token" })
    );
  });

  // The shared env-var token has nobody behind it, so it keeps being the 司書.
  it("still signs the shared token as the import account", async () => {
    process.env.API_TOKEN = "s3cret-token";
    withAuthorization("Bearer s3cret-token");

    await logEdit("Game", "game-1", "CREATE");

    expect(loggedRow()).toEqual(
      expect.objectContaining({ userId: API_USER.id, via: "token" })
    );
  });

  // `via` marks the exception. Rows written in the admin carry null, which is
  // also what every row written before tokens existed carries.
  it("leaves an edit made in the admin unmarked", async () => {
    authMock.mockResolvedValue({ user: { id: "u2", role: "EDITOR" } });

    await logEdit("Game", "game-1", "CREATE");

    expect(loggedRow()).toEqual(
      expect.objectContaining({ userId: "u2", via: null })
    );
  });

  it("prefers the session when a request carries both", async () => {
    authMock.mockResolvedValue({ user: { id: "u2", role: "EDITOR" } });
    withAuthorization("Bearer tocr_something");
    resolveApiTokenMock.mockResolvedValue({ userId: "u1", tokenId: "tok-1" });

    await logEdit("Game", "game-1", "CREATE");

    expect(loggedRow()).toEqual(
      expect.objectContaining({ userId: "u2", via: null })
    );
  });

  it("writes nothing when the token resolves to nobody", async () => {
    withAuthorization("Bearer tocr_revoked");

    await logEdit("Game", "game-1", "CREATE");

    expect(createMock).not.toHaveBeenCalled();
  });
});
