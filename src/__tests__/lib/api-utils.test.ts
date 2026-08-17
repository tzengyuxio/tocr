/**
 * @jest-environment node
 */
import { MAX_PAGE_SIZE, parsePagination, withErrorHandler } from "@/lib/api-utils";
import { NextRequest } from "next/server";

function params(query: string) {
  return new URLSearchParams(query);
}

describe("parsePagination", () => {
  it("uses defaults when nothing is given", () => {
    expect(parsePagination(params(""))).toEqual({ page: 1, limit: 20, skip: 0 });
  });

  it("honours an explicit default limit", () => {
    expect(parsePagination(params(""), 50).limit).toBe(50);
  });

  it("parses valid values", () => {
    expect(parsePagination(params("page=3&limit=10"))).toEqual({
      page: 3,
      limit: 10,
      skip: 20,
    });
  });

  it("falls back when the value is not a number", () => {
    // Used to reach Prisma as NaN and surface as a 500.
    expect(parsePagination(params("page=abc&limit=xyz"))).toEqual({
      page: 1,
      limit: 20,
      skip: 0,
    });
  });

  it("caps limit so one request cannot ask for the whole table", () => {
    expect(parsePagination(params("limit=99999")).limit).toBe(MAX_PAGE_SIZE);
  });

  it("clamps zero and negative values up to the minimum", () => {
    expect(parsePagination(params("page=0&limit=0"))).toEqual({
      page: 1,
      limit: 1,
      skip: 0,
    });
    expect(parsePagination(params("page=-5&limit=-5"))).toEqual({
      page: 1,
      limit: 1,
      skip: 0,
    });
  });
});

// 撞號要讓編輯者知道該改哪一欄——這是「不自動接 -2」那個決定成立的前提。
describe("withErrorHandler on a unique constraint", () => {
  function p2002(meta: unknown) {
    return Object.assign(new Error("Unique constraint failed"), {
      code: "P2002",
      meta,
    });
  }

  async function run(error: unknown) {
    const handler = withErrorHandler(async () => {
      throw error;
    }, "Create issue");
    const res = await handler(new NextRequest("http://localhost/api/issues"));
    return { status: res.status, body: await res.json() };
  }

  // Prisma 7 走 driver adapter，欄位不在 meta.target 而在這裡。
  it("names the field from the driver adapter, dropping the foreign key", async () => {
    const { status, body } = await run(
      p2002({
        driverAdapterError: {
          cause: { constraint: { fields: ["magazine_id", "slug"] } },
        },
      })
    );

    expect(status).toBe(409);
    expect(body.error).toBe("已經有一筆資料使用了相同的網址代號");
  });

  it("still reads meta.target when that is what it gets", async () => {
    const { status, body } = await run(p2002({ target: ["issue_number"] }));

    expect(status).toBe(409);
    expect(body.error).toBe("已經有一筆資料使用了相同的期號");
  });

  it("falls back when the error names no field", async () => {
    expect((await run(p2002(undefined))).body.error).toBe("資料重複");
  });
});
