import {
  externalLinkCreateSchema,
  externalLinkUpdateSchema,
} from "@/lib/validators/external-link";

const base = {
  site: "INTERNET_ARCHIVE" as const,
  url: "https://archive.org/details/example",
};

describe("externalLinkCreateSchema", () => {
  it("takes a link hung off a magazine", () => {
    expect(externalLinkCreateSchema.safeParse({ ...base, magazineId: "m1" }).success).toBe(true);
  });

  // 二擇一：資料庫的 external_links_one_owner 也擋得住，但那只回得了約束違反。
  it("refuses both owners at once", () => {
    const result = externalLinkCreateSchema.safeParse({ ...base, magazineId: "m1", issueId: "i1" });
    expect(result.success).toBe(false);
  });

  it("refuses neither owner", () => {
    expect(externalLinkCreateSchema.safeParse(base).success).toBe(false);
  });

  // 這一欄會變成公開頁上可點的連結。
  it("only takes http(s) urls", () => {
    expect(
      externalLinkCreateSchema.safeParse({ ...base, issueId: "i1", url: "javascript:alert(1)" })
        .success
    ).toBe(false);
    expect(
      externalLinkCreateSchema.safeParse({ ...base, issueId: "i1", url: "ftp://example.test/x" })
        .success
    ).toBe(false);
  });

  // OTHER 沒有預設名稱，不填就會顯示成「其他」。
  it("requires a label when the site is OTHER", () => {
    const without = externalLinkCreateSchema.safeParse({
      ...base,
      site: "OTHER" as const,
      issueId: "i1",
    });
    expect(without.success).toBe(false);

    const withLabel = externalLinkCreateSchema.safeParse({
      ...base,
      site: "OTHER" as const,
      issueId: "i1",
      label: "巴哈姆特收藏整理",
    });
    expect(withLabel.success).toBe(true);
  });
});

describe("externalLinkUpdateSchema", () => {
  // 換一本刊等於換一條連結的身分，刪掉重貼說得更清楚。
  it("ignores an attempt to move the link to another owner", () => {
    const result = externalLinkUpdateSchema.safeParse({ magazineId: "m2", url: "https://a.test/b" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).not.toHaveProperty("magazineId");
  });
});
