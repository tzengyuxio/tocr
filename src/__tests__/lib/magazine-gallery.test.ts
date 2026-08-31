import { buildMagazineGallery, type GalleryPhoto } from "@/lib/magazine-gallery";

// 電視遊樂雜誌：試刊號起《電視遊樂快訊》，第 2 期起本名，新刊 1 號起《GAME fans》。
// 代表圖掛在 magazine.logoImage，本名那個時期自己的 logoImage 是空的。
const tvgm = {
  name: "電視遊樂雜誌",
  logoImage: "https://blob/tvgm.webp",
  photos: [],
  titles: [
    { title: "GAME fans", logoImage: "https://blob/fans.webp", startIssue: { order: 296 } },
    { title: "電視遊樂快訊", logoImage: "https://blob/kuaixun.webp", startIssue: { order: 1 } },
    { title: "電視遊樂雜誌", logoImage: null, startIssue: { order: 3 } },
  ],
};

/** 一張額外圖片，只填測試在意的那幾欄。 */
function photo(overrides: Partial<GalleryPhoto> & { url: string }): GalleryPhoto {
  return { caption: null, sourceName: null, sourceUrl: null, ...overrides };
}

describe("buildMagazineGallery", () => {
  it("orders the mastheads by period and stands the代表圖 in for the period it names", () => {
    const { images } = buildMagazineGallery(tvgm);
    expect(images.map((i) => i.note)).toEqual([
      "電視遊樂快訊 刊頭",
      "電視遊樂雜誌 刊頭",
      "GAME fans 刊頭",
    ]);
    expect(images[1].url).toBe("https://blob/tvgm.webp");
  });

  it("opens on the代表圖 rather than the first period", () => {
    expect(buildMagazineGallery(tvgm).initialIndex).toBe(1);
  });

  it("prefers a period's own logo over the代表圖 when both exist", () => {
    const { images, initialIndex } = buildMagazineGallery({
      ...tvgm,
      titles: tvgm.titles.map((t) =>
        t.title === "電視遊樂雜誌" ? { ...t, logoImage: "https://blob/own.webp" } : t
      ),
    });
    expect(images[1].url).toBe("https://blob/own.webp");
    expect(images).toHaveLength(3);
    expect(initialIndex).toBe(1);
  });

  it("leads with the代表圖 when no period carries the magazine's name", () => {
    const { images, initialIndex } = buildMagazineGallery({
      ...tvgm,
      name: "改過的名字",
    });
    expect(images.map((i) => i.note)).toEqual([
      "改過的名字 刊頭",
      "電視遊樂快訊 刊頭",
      "GAME fans 刊頭",
    ]);
    expect(initialIndex).toBe(0);
  });

  // 四十本裡只有這幾本有 titles，其餘走的是這條路，顯示不該變。
  it("leaves a magazine without titles exactly as it was: one unlabelled masthead", () => {
    const { images, initialIndex } = buildMagazineGallery({
      name: "軟體世界雜誌",
      logoImage: "https://blob/swm.webp",
      photos: [],
      titles: [],
    });
    expect(images).toEqual([{ url: "https://blob/swm.webp" }]);
    expect(initialIndex).toBe(0);
  });

  it("leaves the代表圖 unlabelled when no period contributes a masthead", () => {
    const { images } = buildMagazineGallery({
      ...tvgm,
      titles: tvgm.titles.map((t) => ({ ...t, logoImage: null })),
    });
    expect(images).toEqual([{ url: "https://blob/tvgm.webp" }]);
  });

  it("falls back to the stand-in cover only when no masthead exists at all", () => {
    const standIn = { url: "https://blob/cover.webp", note: "創刊號 封面" };
    expect(
      buildMagazineGallery({ name: "城市少年", logoImage: null, photos: [], titles: [], standIn })
        .images
    ).toEqual([standIn]);
    // 本刊沒有代表圖，但某個時期有——代打就沒有存在的理由了。
    expect(
      buildMagazineGallery({ ...tvgm, logoImage: null, standIn }).images.map((i) => i.note)
    ).toEqual(["電視遊樂快訊 刊頭", "GAME fans 刊頭"]);
  });

  // 沒有說明也沒有來源的圖維持 Magazine.photos 那一欄原本的顯示。
  it("puts the shelf photographs last, still labelled 藏書照", () => {
    const { images } = buildMagazineGallery({
      ...tvgm,
      photos: [photo({ url: "https://blob/shelf.webp" })],
    });
    expect(images[images.length - 1]).toEqual({
      url: "https://blob/shelf.webp",
      note: "藏書照",
    });
  });

  it("carries a photograph's own caption and source", () => {
    const { images } = buildMagazineGallery({
      ...tvgm,
      photos: [
        photo({
          url: "https://blob/auction.webp",
          caption: "推測是 NO.213，封面右上角的日期只看得出 2002",
          sourceName: "露天拍賣",
          sourceUrl: "https://example.test/item",
        }),
      ],
    });
    expect(images[images.length - 1]).toEqual({
      url: "https://blob/auction.webp",
      note: "推測是 NO.213，封面右上角的日期只看得出 2002",
      source: { name: "露天拍賣", url: "https://example.test/item" },
    });
  });

  // 沒有說明時來源自己當說明，而不是退回「藏書照」——那句話對外部來源的圖是錯的。
  it("lets the source stand in for a missing caption", () => {
    const { images } = buildMagazineGallery({
      ...tvgm,
      photos: [photo({ url: "https://blob/forum.webp", sourceName: "巴哈姆特哈啦板" })],
    });
    expect(images[images.length - 1]).toEqual({
      url: "https://blob/forum.webp",
      source: { name: "巴哈姆特哈啦板", url: null },
    });
  });
});
