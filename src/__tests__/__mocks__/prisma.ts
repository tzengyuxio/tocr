/**
 * Prisma client mock for unit testing API routes.
 * Each model method is a jest.fn() that can be configured per test.
 */

interface MockModel {
  findMany: jest.Mock;
  groupBy: jest.Mock;
  findUnique: jest.Mock;
  findUniqueOrThrow: jest.Mock;
  findFirst: jest.Mock;
  create: jest.Mock;
  createMany: jest.Mock;
  update: jest.Mock;
  updateMany: jest.Mock;
  delete: jest.Mock;
  deleteMany: jest.Mock;
  count: jest.Mock;
  aggregate: jest.Mock;
}

// `$transaction` hands the callback the mock itself, so inferring the type
// would be circular. Declaring it explicitly breaks the cycle.
type TransactionCallback = (tx: PrismaMock) => Promise<unknown>;
type TransactionArg = TransactionCallback | Promise<unknown>[];

// The real client takes either an interactive callback or an array of queries
// to run together; a mock that only understood the callback made the array
// form throw instead of resolving.
const runTransaction = (arg: TransactionArg) =>
  Array.isArray(arg) ? Promise.all(arg) : arg(prismaMock);

interface PrismaMock {
  magazine: MockModel;
  magazineSlug: MockModel;
  issue: MockModel;
  article: MockModel;
  tag: MockModel;
  game: MockModel;
  articleTag: MockModel;
  articleGame: MockModel;
  ocrRecord: MockModel;
  photo: MockModel;
  exportLog: MockModel;
  user: MockModel;
  editLog: MockModel;
  apiToken: MockModel;
  $transaction: jest.Mock;
  $queryRaw: jest.Mock;
}

const createMockModel = (): MockModel => ({
  findMany: jest.fn(),
  groupBy: jest.fn(),
  findUnique: jest.fn(),
  findUniqueOrThrow: jest.fn(),
  findFirst: jest.fn(),
  create: jest.fn(),
  createMany: jest.fn(),
  update: jest.fn(),
  updateMany: jest.fn(),
  delete: jest.fn(),
  deleteMany: jest.fn(),
  count: jest.fn(),
  aggregate: jest.fn(),
});

export const prismaMock: PrismaMock = {
  magazine: createMockModel(),
  magazineSlug: createMockModel(),
  issue: createMockModel(),
  article: createMockModel(),
  tag: createMockModel(),
  game: createMockModel(),
  articleTag: createMockModel(),
  articleGame: createMockModel(),
  ocrRecord: createMockModel(),
  photo: createMockModel(),
  exportLog: createMockModel(),
  user: createMockModel(),
  editLog: createMockModel(),
  apiToken: createMockModel(),
  $transaction: jest.fn(runTransaction),
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
  prismaMock.$transaction.mockImplementation(runTransaction);
  prismaMock.$queryRaw.mockReset().mockResolvedValue([]);
}
