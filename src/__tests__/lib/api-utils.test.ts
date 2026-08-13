/**
 * @jest-environment node
 */
import { MAX_PAGE_SIZE, parsePagination } from "@/lib/api-utils";

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
