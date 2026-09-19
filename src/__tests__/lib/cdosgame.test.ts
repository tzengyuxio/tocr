import {
  CDOSGAME_GENRES,
  enrichment,
  isCdosgameImage,
  pickCover,
  pickWikipedia,
} from "@/lib/cdosgame";

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

  it("leaves a foreign cover alone unless asked to replace it", () => {
    const rawg = "https://media.rawg.io/media/screenshots/930/9304650c.jpg";

    expect(
      enrichment(blank, { id: "x" }, "https://cdosgame.simagame.me/c.webp", rawg)
    ).toEqual({});
  });

  it("replaces a foreign cover when asked", () => {
    const rawg = "https://media.rawg.io/media/screenshots/930/9304650c.jpg";
    const cover = "https://cdosgame.simagame.me/media/games/cdg-2968/box-front.webp";

    expect(enrichment(blank, { id: "x" }, cover, rawg, true)).toEqual({
      coverImage: cover,
    });
  });

  it("does not churn a cover that already comes from cdosgame", () => {
    const now = "https://cdosgame.simagame.me/media/games/cdg-1/box-front.webp";
    const next = "https://cdosgame.simagame.me/media/games/cdg-1/box-front-02.webp";

    expect(enrichment(blank, { id: "x" }, next, now, true)).toEqual({});
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

describe("pickWikipedia", () => {
  it("takes the wikipedia link off the entry page", () => {
    const html = `<a href="https://zh.wikipedia.org/wiki/%E4%B8%89%E5%9C%8B%E5%BF%97III">維基</a>`;

    expect(pickWikipedia(html)).toBe("https://zh.wikipedia.org/wiki/三國志III");
  });

  // 仙劍奇俠傳的條目就沒有。不猜網址。
  it("returns null when the entry links to no wikipedia article", () => {
    const html = `<a href="https://chiuinan.github.io/game/intro.htm">青衫之友</a>`;

    expect(pickWikipedia(html)).toBeNull();
  });

  // 語言版本由上游決定：《三國志III》連中文版，《快打旋風》連英文版，因為
  // 後者沒有中文條目。
  it("takes the first when several language editions are listed", () => {
    const html = `
      <a href="https://zh.wikipedia.org/wiki/A">中文</a>
      <a href="https://en.wikipedia.org/wiki/A">English</a>
    `;

    expect(pickWikipedia(html)).toContain("zh.wikipedia.org");
  });
});

describe("isCdosgameImage", () => {
  it("tells cdosgame's own media from RAWG's", () => {
    // Both live under /media/games/ -- only the host separates them.
    expect(
      isCdosgameImage("https://cdosgame.simagame.me/media/games/cdg-1/box-front.webp")
    ).toBe(true);
    expect(
      isCdosgameImage("https://media.rawg.io/media/games/985/985295de.jpg")
    ).toBe(false);
  });

  it("treats anything unparseable as foreign", () => {
    expect(isCdosgameImage("/media/games/cdg-1/box-front.webp")).toBe(false);
    expect(isCdosgameImage("")).toBe(false);
  });
});
