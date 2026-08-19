import { buildSitemapEntries, sitemapUrl } from "@/lib/sitemap-entries";

const ORIGIN = "https://tocr.simagame.me";

describe("sitemapUrl", () => {
  it("joins segments onto the origin", () => {
    expect(sitemapUrl(ORIGIN, ["magazines", "jxdn"])).toBe(
      "https://tocr.simagame.me/magazines/jxdn"
    );
  });

  it("percent-encodes a CJK slug", () => {
    // Slugs are hand-typed and often Chinese (創刊號, 試刊2號). A raw one in the
    // XML is not a valid URL, and search engines drop the entry.
    expect(sitemapUrl(ORIGIN, ["magazines", "swm", "issues", "創刊號"])).toBe(
      "https://tocr.simagame.me/magazines/swm/issues/%E5%89%B5%E5%88%8A%E8%99%9F"
    );
  });

  it("encodes each segment on its own, so the separators survive", () => {
    expect(sitemapUrl(ORIGIN, ["tags", "三國志"])).toBe(
      "https://tocr.simagame.me/tags/%E4%B8%89%E5%9C%8B%E5%BF%97"
    );
  });

  it("does not double-encode a slug that already contains a percent", () => {
    // encodeURIComponent would turn "%" into "%25"; that is correct, and the
    // test pins it so nobody "fixes" it into a double decode.
    expect(sitemapUrl(ORIGIN, ["games", "100%"])).toBe(
      "https://tocr.simagame.me/games/100%25"
    );
  });
});

describe("buildSitemapEntries", () => {
  const data = {
    magazines: [{ slug: "jxdn", updatedAt: new Date("2026-08-18") }],
    issues: [
      {
        slug: "創刊號",
        updatedAt: new Date("2026-08-17"),
        magazine: { slug: "swm" },
      },
    ],
    games: [{ slug: "p-47", updatedAt: new Date("2026-08-16") }],
    tags: [{ slug: "rpg", updatedAt: new Date("2026-08-15") }],
  };

  it("lists the static pages first", () => {
    const urls = buildSitemapEntries(ORIGIN, data).map((e) => e.url);
    expect(urls.slice(0, 5)).toEqual([
      `${ORIGIN}`,
      `${ORIGIN}/magazines`,
      `${ORIGIN}/games`,
      `${ORIGIN}/tags`,
      `${ORIGIN}/contributors`,
    ]);
  });

  it("nests an issue under its own magazine", () => {
    const urls = buildSitemapEntries(ORIGIN, data).map((e) => e.url);
    expect(urls).toContain(
      `${ORIGIN}/magazines/swm/issues/%E5%89%B5%E5%88%8A%E8%99%9F`
    );
  });

  it("carries each record's own last-modified date", () => {
    const entry = buildSitemapEntries(ORIGIN, data).find((e) =>
      e.url.endsWith("/magazines/jxdn")
    );
    expect(entry?.lastModified).toEqual(new Date("2026-08-18"));
  });

  it("covers every record it was given", () => {
    // 5 static + 1 magazine + 1 issue + 1 game + 1 tag
    expect(buildSitemapEntries(ORIGIN, data)).toHaveLength(9);
  });

  it("drops an issue whose magazine is missing rather than emitting /undefined/", () => {
    const orphan = {
      ...data,
      issues: [{ slug: "1", updatedAt: new Date(), magazine: null }],
    };
    const urls = buildSitemapEntries(ORIGIN, orphan).map((e) => e.url);
    expect(urls.some((u) => u.includes("undefined") || u.includes("//issues"))).toBe(false);
  });
});
