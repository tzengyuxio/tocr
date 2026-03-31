/**
 * Prisma client mock for unit testing API routes.
 * Each model method is a jest.fn() that can be configured per test.
 */

const createMockModel = () => ({
  findMany: jest.fn(),
  findUnique: jest.fn(),
  findFirst: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  count: jest.fn(),
  aggregate: jest.fn(),
});

export const prismaMock = {
  magazine: createMockModel(),
  issue: createMockModel(),
  article: createMockModel(),
  tag: createMockModel(),
  game: createMockModel(),
  articleTag: createMockModel(),
  articleGame: createMockModel(),
  ocrRecord: createMockModel(),
  user: createMockModel(),
  $transaction: jest.fn((fn: (tx: typeof prismaMock) => Promise<unknown>) =>
    fn(prismaMock)
  ),
};

jest.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
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
  prismaMock.$transaction.mockImplementation(
    (fn: (tx: typeof prismaMock) => Promise<unknown>) => fn(prismaMock)
  );
}
