/**
 * Prisma client mock for unit testing API routes.
 * Each model method is a jest.fn() that can be configured per test.
 */

interface MockModel {
  findMany: jest.Mock;
  groupBy: jest.Mock;
  findUnique: jest.Mock;
  findFirst: jest.Mock;
  create: jest.Mock;
  update: jest.Mock;
  delete: jest.Mock;
  count: jest.Mock;
  aggregate: jest.Mock;
}

// `$transaction` hands the callback the mock itself, so inferring the type
// would be circular. Declaring it explicitly breaks the cycle.
type TransactionCallback = (tx: PrismaMock) => Promise<unknown>;

interface PrismaMock {
  magazine: MockModel;
  issue: MockModel;
  article: MockModel;
  tag: MockModel;
  game: MockModel;
  articleTag: MockModel;
  articleGame: MockModel;
  ocrRecord: MockModel;
  exportLog: MockModel;
  user: MockModel;
  editLog: MockModel;
  $transaction: jest.Mock;
  $queryRaw: jest.Mock;
}

const createMockModel = (): MockModel => ({
  findMany: jest.fn(),
  groupBy: jest.fn(),
  findUnique: jest.fn(),
  findFirst: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  count: jest.fn(),
  aggregate: jest.fn(),
});

export const prismaMock: PrismaMock = {
  magazine: createMockModel(),
  issue: createMockModel(),
  article: createMockModel(),
  tag: createMockModel(),
  game: createMockModel(),
  articleTag: createMockModel(),
  articleGame: createMockModel(),
  ocrRecord: createMockModel(),
  exportLog: createMockModel(),
  user: createMockModel(),
  editLog: createMockModel(),
  $transaction: jest.fn((fn: TransactionCallback) => fn(prismaMock)),
  // Tagged-template call, so tests assert on the interpolated values rather
  // than on a query object.
  $queryRaw: jest.fn(),
};

jest.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

jest.mock("@/lib/edit-log", () => ({
  logEdit: jest.fn().mockResolvedValue(undefined),
  logEditBatch: jest.fn().mockResolvedValue(undefined),
  getCurrentUserId: jest.fn().mockResolvedValue("test-user"),
  FEED_SCOPE: { OR: [{ batchId: null }, { batchSize: { not: null } }] },
  // Mirror the real module: spreading a constant this mock forgets yields
  // nothing, and the filter it stands for silently stops being applied.
  CATALOGUE_ONLY: { entityType: { not: "User" } },
  CONTRIBUTION_FEED_SCOPE: {
    OR: [{ batchId: null }, { batchSize: { not: null } }],
    entityType: { not: "User" },
  },
}));

export function resetPrismaMock() {
  Object.values(prismaMock).forEach((model) => {
    if (typeof model === "object" && model !== null) {
      Object.values(model).forEach((fn) => {
        if (typeof fn === "function" && "mockReset" in fn) {
          (fn as jest.Mock).mockReset();
        }
      });
    }
  });
  prismaMock.$transaction.mockReset();
  prismaMock.$transaction.mockImplementation((fn: TransactionCallback) =>
    fn(prismaMock)
  );
  prismaMock.$queryRaw.mockReset().mockResolvedValue([]);
}
