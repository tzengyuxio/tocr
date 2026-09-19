import { CDOSGAME_GENRES, enrichment, pickCover } from "@/lib/cdosgame";

const BASE = "https://cdosgame.simagame.me/games/cdg-0212";

describe("pickCover", () => {
  it("prefers a box front over the key visual", () => {
    const html = `
      <img src="/media/games/cdg-1638/key-visual.webp">
      <img src="/media/games/cdg-1638/box-front-01.webp">
    `;

    expect(pickCover(html, BASE)).toBe(
      "https://cdosgame.simagame.me/media/games/cdg-1638/box-front-01.webp"
    );
  });

  it("takes the first box front when there are several", () => {
    const html = `
      <img src="/media/games/x/box-front-02.webp">
      <img src="/media/games/x/box-front-01.webp">
    `;

    expect(pickCover(html, BASE)).toContain("box-front-01.webp");
  });

  it("falls back to the key visual", () => {
    const html = `<img src="/media/games/cdg-0212/key-visual.webp">`;

    expect(pickCover(html, BASE)).toBe(
      "https://cdosgame.simagame.me/media/games/cdg-0212/key-visual.webp"
    );
  });

  // 144x192 on the game page; a thumbnail would be visibly soft.
  it("never picks a thumbnail", () => {
    const html = `
      <img src="/media/games/x/thumb/box-front-01.webp">
      <img src="/media/games/x/key-visual.webp">
    `;

    expect(pickCover(html, BASE)).toContain("/key-visual.webp");
    expect(pickCover(html, BASE)).not.toContain("/thumb/");
  });

  it("returns null when the entry has no image", () => {
    expect(pickCover("<p>no media here</p>", BASE)).toBeNull();
    expect(pickCover(`<img src="/media/games/x/thumb/a.webp">`, BASE)).toBeNull();
  });

  it("takes an ad over a title screen, per the cover priority", () => {
    const html = `
      <img src="/media/games/x/title.webp">
      <img src="/media/games/x/ad-01.webp">
    `;

    expect(pickCover(html, BASE)).toContain("/ad-01.webp");
  });

  it("matches a name with or without a serial number", () => {
    expect(pickCover(`<img src="/media/games/x/box-front.webp">`, BASE)).toContain(
      "/box-front.webp"
    );
  });

  // "Take the first one" would put a screenshot at the top of the game page the
  // day cdosgame adds a file kind this does not know.
  it("ignores a file kind it does not recognise", () => {
    const html = `<img src="/media/games/x/screenshot-01.webp">`;

    expect(pickCover(html, BASE)).toBeNull();
  });
});

describe("enrichment", () => {
  const blank = { developer: null, publisher: null, genres: [] };

  it("fills the empty fields", () => {
    const patch = enrichment(
      blank,
      { id: "cdg-0212", developer: "KOEI", publisher_tw: ["第三波"], genre: "HSG" },
      "https://example.test/cover.webp",
      null
    );

    expect(patch).toEqual({
      developer: "KOEI",
      publisher: "第三波",
      genres: ["歷史模擬"],
      coverImage: "https://example.test/cover.webp",
    });
  });

  it("never overwrites what the site already has", () => {
    const patch = enrichment(
      { developer: "光榮", publisher: "智冠", genres: ["策略"] },
      { id: "cdg-0212", developer: "KOEI", publisher_tw: ["第三波"], genre: "HSG" },
      "https://example.test/cover.webp",
      "https://example.test/existing.jpg"
    );

    expect(patch).toEqual({});
  });

  it("joins several Taiwanese publishers", () => {
    const patch = enrichment(blank, { id: "x", publisher_tw: ["第三波", "智冠"] }, null, null);

    expect(patch.publisher).toBe("第三波、智冠");
  });

  // Guessing gets these wrong: TBG is board games, LSG is raising sims,
  // AVG is visual novels, CBG is city building.
  it("uses the looked-up genre labels", () => {
    expect(CDOSGAME_GENRES.TBG).toBe("棋牌桌遊");
    expect(CDOSGAME_GENRES.LSG).toBe("養成");
    expect(CDOSGAME_GENRES.AVG).toBe("視覺小說");
    expect(CDOSGAME_GENRES.CBG).toBe("城市建造");
  });

  it("skips a genre code it does not know", () => {
    const patch = enrichment(blank, { id: "x", genre: "XYZ" }, null, null);

    expect(patch).not.toHaveProperty("genres");
  });
});
