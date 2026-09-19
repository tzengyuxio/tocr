import { gameNameKeys, nameKey, tagNameKey } from "@/lib/name-match";

describe("nameKey", () => {
  it("folds the punctuation two catalogues spelled differently", () => {
    // Both exist on production as separate games.
    expect(nameKey("蝙蝠俠。電影版")).toBe(nameKey("蝙蝠俠·電影版"));
    expect(nameKey("P.47")).toBe(nameKey("P-47"));
  });

  it("folds full-width forms and roman numerals", () => {
    expect(nameKey("幻想空間Ⅱ")).toBe(nameKey("幻想空間II"));
    expect(nameKey("工人物語２")).toBe(nameKey("工人物語2"));
  });

  // A table of contents spaces a title however it likes, and both spellings
  // appear across issues of the same magazine.
  it("folds the separators a slug would keep", () => {
    expect(nameKey("銀河飛將 II")).toBe(nameKey("銀河飛將II"));
    expect(nameKey("Dragon Quest")).toBe(nameKey("DragonQuest"));
  });

  it("ignores case", () => {
    expect(nameKey("Zelda")).toBe(nameKey("zelda"));
  });

  it("keeps genuinely different names apart", () => {
    expect(nameKey("幻想空間Ⅱ")).not.toBe(nameKey("幻想空間Ⅲ"));
    expect(nameKey("古墓奇兵（1996）")).not.toBe(nameKey("古墓奇兵（2013）"));
  });

  // Kana and Hangul are letters, and stripping them deleted the name: twenty
  // games were keyed on nothing at all and slugged game-2 … game-20.
  it("keeps kana, so a kana-only name still has a key", () => {
    expect(nameKey("ぷりんせすでんじゃあ")).toBe("ぷりんせすでんじゃあ");
    expect(nameKey("カスタムメイト・2")).toBe("カスタムメイト2");
    expect(nameKey("ガングリフォンII")).not.toBe(nameKey("コラムスII"));
  });

  it("keeps hangul, which used to fold the same way", () => {
    expect(nameKey("임진록2")).toBe("임진록2");
    expect(nameKey("임진록2")).not.toBe(nameKey("코룸 2"));
  });

  // 三國志リターンズ used to key as 三國志 and collide with KOEI's own series,
  // which is why the original names could not be recorded at all.
  it("no longer folds a kana title onto its chinese stem", () => {
    expect(nameKey("三國志リターンズ")).not.toBe(nameKey("三國志"));
  });

  // The long vowel spells the word; the middle dot is punctuation.
  it("keeps ー and drops ・", () => {
    expect(nameKey("ムーンドラゴン")).toBe("ムーンドラゴン");
    expect(nameKey("かえるにょ・ぱにょ")).toBe("かえるにょぱにょ");
  });

  // A colon is how one table of contents writes what another writes with a
  // dash. Both spellings are on production for the same game.
  it("still folds the colon, half-width and full-width alike", () => {
    expect(nameKey("三國風雲2：風雲再起")).toBe(nameKey("三國風雲2-風雲再起"));
    expect(nameKey("三國志：風雲再起")).toBe(nameKey("三國志風雲再起"));
  });

  it("is empty for a name with nothing to key on", () => {
    expect(nameKey("---")).toBe("");
  });
});

describe("gameNameKeys", () => {
  it("keys every name the game answers to", () => {
    const keys = gameNameKeys({
      name: "P-47",
      nameEn: "P-47 Thunderbolt",
      nameOriginal: null,
      aliases: ["P.47"],
    });

    expect(keys).toContain("p47");
    expect(keys).toContain("p47thunderbolt");
    // The alias folds onto the main name, and one key is enough.
    expect(keys.filter((key) => key === "p47")).toHaveLength(1);
  });

  it("drops the columns that are not filled in", () => {
    const keys = gameNameKeys({ name: "新遊戲", nameEn: null, nameOriginal: null, aliases: [] });

    expect(keys).toEqual(["新遊戲"]);
  });

  it("survives a name that keys to nothing", () => {
    expect(gameNameKeys({ name: "!!!", nameEn: null, nameOriginal: null, aliases: [] })).toEqual([]);
  });
});

describe("tagNameKey", () => {
  it("uses the same ruler as games", () => {
    expect(tagNameKey("Ｒ Ｐ Ｇ")).toBe(nameKey("RPG"));
  });
});
