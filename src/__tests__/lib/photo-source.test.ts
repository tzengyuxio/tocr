import { publicSourceUrl, withPublicSourceUrls } from "@/lib/photo-source";

describe("publicSourceUrl", () => {
  it("drops the marketplaces the photos actually come from", () => {
    expect(
      publicSourceUrl("https://www.ruten.com.tw/item/22602925873994/")
    ).toBeNull();
    expect(publicSourceUrl("https://shopee.tw/i.32717632.27889449172")).toBeNull();
    expect(
      publicSourceUrl("https://tw.bid.yahoo.com/item/1234567890")
    ).toBeNull();
  });

  it("keeps sources that are something to read", () => {
    const article = "https://zazu.tw/2019/02/famicom-fan/";
    expect(publicSourceUrl(article)).toBe(article);
    const thread = "https://www.ptt.cc/bbs/NDS/M.1234567890.A.123.html";
    expect(publicSourceUrl(thread)).toBe(thread);
  });

  it("covers subdomains but not a host that merely ends the same way", () => {
    expect(publicSourceUrl("https://m.ruten.com.tw/item/show")).toBeNull();
    expect(publicSourceUrl("https://notruten.com.tw/item/show")).toBe(
      "https://notruten.com.tw/item/show"
    );
  });

  it("returns null for an empty or unparsable value", () => {
    expect(publicSourceUrl(null)).toBeNull();
    expect(publicSourceUrl("露天拍賣")).toBeNull();
  });
});

describe("withPublicSourceUrls", () => {
  it("filters the urls and leaves every other field alone", () => {
    const photos = [
      {
        url: "https://blob/1.webp",
        caption: "封面",
        sourceName: "露天拍賣",
        sourceUrl: "https://www.ruten.com.tw/item/1/",
      },
      {
        url: "https://blob/2.webp",
        caption: "書背",
        sourceName: "zazu 雑‧誌",
        sourceUrl: "https://zazu.tw/post/",
      },
    ];

    expect(withPublicSourceUrls(photos)).toEqual([
      { ...photos[0], sourceUrl: null },
      photos[1],
    ]);
  });
});
