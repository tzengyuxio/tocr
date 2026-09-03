import { splitLinks, shortenUrl } from "@/lib/linkify";

/** 只取連結片段的值，斷言網址切在哪裡時比整個陣列好讀。 */
function links(text: string): string[] {
  return splitLinks(text)
    .filter((s) => s.type === "link")
    .map((s) => s.value);
}

describe("splitLinks", () => {
  it("returns one text segment when there is no URL", () => {
    expect(splitLinks("1998 年 8 月創刊，共 56 期。")).toEqual([
      { type: "text", value: "1998 年 8 月創刊，共 56 期。" },
    ]);
  });

  it("returns nothing for an empty string", () => {
    expect(splitLinks("")).toEqual([]);
  });

  // 實際踩到的那一句：用 \S+ 去抓，全形括號、全形分號與後面的中文全被收進
  // href，連結變成點不開的一長串。
  it("stops at the full-width punctuation that closes the sentence", () => {
    expect(
      links(
        "創刊報導（https://gnn.gamer.com.tw/detail.php?sn=8712）；該篇另載官方宣稱首期發行量 15 萬本。"
      )
    ).toEqual(["https://gnn.gamer.com.tw/detail.php?sn=8712"]);
  });

  it("stops where Chinese resumes with no punctuation between", () => {
    expect(links("見 https://example.com/a 創刊號")).toEqual([
      "https://example.com/a",
    ]);
  });

  it("keeps the query string", () => {
    expect(links("https://gnn.gamer.com.tw/detail.php?sn=8712")).toEqual([
      "https://gnn.gamer.com.tw/detail.php?sn=8712",
    ]);
  });

  it("drops a half-width full stop that ends the sentence", () => {
    expect(links("See https://example.com/a.")).toEqual([
      "https://example.com/a",
    ]);
  });

  // 括號要數過才知道是誰的：包住網址的那個不屬於它，網址自己帶的那對屬於它。
  it("drops the bracket that wraps the URL", () => {
    expect(links("(https://example.com/a)")).toEqual(["https://example.com/a"]);
  });

  it("keeps balanced brackets that belong to the URL", () => {
    expect(links("https://example.com/a_(b)")).toEqual([
      "https://example.com/a_(b)",
    ]);
  });

  it("finds every URL in a sentence", () => {
    expect(links("兩則報導 https://example.com/a 與 https://example.com/b。")).toEqual([
      "https://example.com/a",
      "https://example.com/b",
    ]);
  });

  it("ignores a bare domain", () => {
    expect(links("官網是 gnn.gamer.com.tw 那邊。")).toEqual([]);
  });

  // 剝掉的標點是句子的一部分，不能跟著網址消失。
  it("puts the trimmed punctuation back into the text", () => {
    expect(splitLinks("（https://example.com/a）；後續")).toEqual([
      { type: "text", value: "（" },
      { type: "link", value: "https://example.com/a" },
      { type: "text", value: "）；後續" },
    ]);
  });

  it("reassembles into the original text", () => {
    const source =
      "創刊報導（https://gnn.gamer.com.tw/detail.php?sn=8712）；另見 https://example.com/b。";
    expect(splitLinks(source).map((s) => s.value).join("")).toBe(source);
  });
});

describe("shortenUrl", () => {
  it("drops the scheme, the www and the trailing slash", () => {
    expect(shortenUrl("https://www.example.com/a/")).toBe("example.com/a");
  });

  it("keeps a short url whole", () => {
    expect(shortenUrl("https://example.com/a")).toBe("example.com/a");
  });

  it("truncates a long one to the limit", () => {
    const short = shortenUrl("https://www.ruten.com.tw/item/22234134910685/", 24);
    expect(short).toBe("ruten.com.tw/item/22234…");
    expect(short.length).toBe(24);
  });
});
