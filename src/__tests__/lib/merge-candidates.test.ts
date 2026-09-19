import {
  classifyGroup,
  joinIsOnlyResidue,
  yearsDiverge,
} from "@/lib/merge-candidates";

describe("joinIsOnlyResidue", () => {
  it("catches a name left as a bare numeral by a script nameKey drops", () => {
    // Cyrillic is still outside the kept range, so Аркада2 keys as "2" and
    // would collide with anything else ending in 2.
    expect(joinIsOnlyResidue(["七年戰爭2：決戰王朝", "Бой2"], ["Аркада2"])).toBe(true);
  });

  // Kana and Hangul were the original motive; slugify keeps them since
  // 2026-09-20, so these names carry their own weight now.
  it("no longer fires for kana or hangul, which are kept", () => {
    expect(joinIsOnlyResidue(["七年戰爭2：決戰王朝", "決戰王朝2"], ["カスタムメイト・2"])).toBe(
      false
    );
    expect(joinIsOnlyResidue(["三國志：風雲再起", "三國志リターンズ"], ["三國志"])).toBe(false);
  });

  it("leaves a join that a kana-free name also makes", () => {
    expect(
      joinIsOnlyResidue(["聖眼之翼", "セイントアイズ"], ["聖眼之翼"])
    ).toBe(false);
  });

  it("says nothing when the two sides share no key at all", () => {
    expect(joinIsOnlyResidue(["魔眼殺機"], ["烏茲衝鋒槍"])).toBe(false);
  });
});

describe("classifyGroup", () => {
  it("A when the names only differ in punctuation", () => {
    expect(classifyGroup(["蝙蝠俠。電影版", "蝙蝠俠·電影版"], "蝙蝠俠電影版")).toBe("A");
  });

  it("B when one name is Latin and the other is not", () => {
    expect(classifyGroup(["三國演義", "The Rising Dynasty"], "三國演義")).toBe("B");
  });

  it("C when one name contains the other", () => {
    expect(classifyGroup(["大明英雄傳 龍騰天下", "大明英雄傳"], "大明英雄傳：龍騰天下")).toBe(
      "C"
    );
  });

  it("D when two unrelated Chinese names meet", () => {
    expect(classifyGroup(["夢幻遊樂園", "千禧新樂園"], "模擬樂園")).toBe("D");
  });
});

describe("yearsDiverge", () => {
  it("flags spans three years or more apart", () => {
    expect(yearsDiverge([[1989, 1990], [1999, 1999]])).toBe(true);
  });

  it("leaves overlapping or adjacent spans alone", () => {
    expect(yearsDiverge([[1990, 1991], [1990, 1990]])).toBe(false);
    expect(yearsDiverge([[1990, 1992], [1993, 1994]])).toBe(false);
  });

  it("needs two spans to say anything", () => {
    expect(yearsDiverge([[1990, 1990]])).toBe(false);
  });
});
