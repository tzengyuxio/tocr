/**
 * @jest-environment node
 */
import { ExternalSite as PrismaExternalSite } from "@prisma/client";
import {
  EXTERNAL_SITE_VALUES,
  externalLinkEntryName,
  externalLinkLabel,
} from "@/lib/external-site";

describe("externalLinkLabel", () => {
  it("names the site when no label is given", () => {
    expect(externalLinkLabel({ site: "INTERNET_ARCHIVE", label: null }))
      .toBe("Internet Archive");
    expect(externalLinkLabel({ site: "NCL", label: null })).toBe("國家圖書館");
  });

  // 同一個站可能有兩條連結（IA 的全本掃描與縮圖集），光寫站名分不出來。
  it("prefers the editor's own label", () => {
    expect(
      externalLinkLabel({ site: "INTERNET_ARCHIVE", label: "全本掃描" })
    ).toBe("全本掃描");
  });

  it("ignores a label that is only whitespace", () => {
    expect(externalLinkLabel({ site: "WIKIPEDIA", label: "   " }))
      .toBe("維基百科");
  });

  // 這份表是手抄 schema 的 enum，少一個值下拉選單就選不到它。
  it("offers every site the schema has", () => {
    expect([...EXTERNAL_SITE_VALUES].sort()).toEqual(
      Object.values(PrismaExternalSite).sort()
    );
  });
});

describe("externalLinkEntryName", () => {
  const wiki = (url: string) =>
    externalLinkEntryName({ site: "WIKIPEDIA", url, label: null });

  // 站上 602 條維基連結是整批建的，一條 label 都沒有——條目名只能從網址讀。
  it("reads the article title out of a wikipedia url", () => {
    expect(wiki("https://en.wikipedia.org/wiki/SimAnt")).toBe("SimAnt");
    expect(wiki("https://en.wikipedia.org/wiki/Monkey_Island_2:_LeChuck's_Revenge"))
      .toBe("Monkey Island 2: LeChuck's Revenge");
    expect(wiki("https://zh.wikipedia.org/wiki/%E5%B9%BB%E5%BD%B1%E7%89%B9%E6%94%BB"))
      .toBe("幻影特攻");
  });

  it("ignores a fragment or query on a wikipedia url", () => {
    expect(wiki("https://en.wikipedia.org/wiki/SimAnt#Gameplay")).toBe("SimAnt");
    expect(wiki("https://en.wikipedia.org/wiki/SimAnt?action=raw")).toBe("SimAnt");
  });

  // 流水號不是條目名。寧可只顯示站名，也不要拿代號充數。
  it("says nothing for a site whose url carries no title", () => {
    expect(
      externalLinkEntryName({
        site: "CDOSGAME",
        url: "https://cdosgame.simagame.me/games/cdg-0030",
        label: null,
      })
    ).toBeNull();
    expect(
      externalLinkEntryName({
        site: "INTERNET_ARCHIVE",
        url: "https://archive.org/details/astro-kuaibao-001",
        label: null,
      })
    ).toBeNull();
  });

  it("prefers the editor's label over anything read from the url", () => {
    expect(
      externalLinkEntryName({
        site: "WIKIPEDIA",
        url: "https://en.wikipedia.org/wiki/SimAnt",
        label: "模擬螞蟻",
      })
    ).toBe("模擬螞蟻");
  });

  // 中文維基的連結常帶語言變體：正式站 602 條裡有 41 條走 /zh-tw/ 或 /zh-hant/。
  it("reads the title from a language-variant path too", () => {
    expect(wiki("https://zh.wikipedia.org/zh-tw/GO!GO!台北捷運")).toBe("GO!GO!台北捷運");
    expect(wiki("https://zh.wikipedia.org/zh-hant/AS～天使小夜曲")).toBe("AS～天使小夜曲");
    expect(wiki("https://zh.wikipedia.org/zh-cn/仙剑奇侠传")).toBe("仙剑奇侠传");
  });

  it("survives a url that is not shaped like an article link", () => {
    expect(wiki("https://en.wikipedia.org/")).toBeNull();
    expect(wiki("https://en.wikipedia.org/wiki/%E0%A4%A")).toBeNull();
  });
});

// 擋重複的比對寫在 ExternalLinkList 裡，但判準屬於這一層：一字不差才算同名。
describe("entry name against the page's own subject", () => {
  const cdos = (label: string) =>
    externalLinkEntryName({
      site: "CDOSGAME",
      url: "https://cdosgame.simagame.me/games/cdg-0030",
      label,
    });

  // 上游與站上多半同名：2026-09-20 回填的 1,192 條裡約 83% 一字不差。
  it("gives back the upstream title as stored", () => {
    expect(cdos("神奇王國")).toBe("神奇王國");
  });

  // 括號是消歧義用的，剝掉再比會把最該顯示的那幾條擋掉。
  it("keeps a disambiguating parenthetical distinct from the bare name", () => {
    expect(cdos("德軍總部（Castle Wolfenstein）")).not.toBe("德軍總部");
    expect(cdos("異形（Alien Syndrome）")).toBe("異形（Alien Syndrome）");
  });
});
