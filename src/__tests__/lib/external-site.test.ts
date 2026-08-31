/**
 * @jest-environment node
 */
import { ExternalSite as PrismaExternalSite } from "@prisma/client";
import { EXTERNAL_SITE_VALUES, externalLinkLabel } from "@/lib/external-site";

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
