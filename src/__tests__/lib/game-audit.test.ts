import {
  auditGames,
  looseKey,
  splitTrailingLatinParen,
  type AuditGame,
} from "@/lib/game-audit";

function game(overrides: Partial<AuditGame> & { name: string }): AuditGame {
  return {
    id: overrides.name,
    slug: overrides.name,
    nameEn: null,
    nameOriginal: null,
    aliases: [],
    nameKeys: [],
    platforms: [],
    genres: [],
    releaseDate: null,
    developer: null,
    publisher: null,
    coverImage: null,
    description: null,
    articleCount: 1,
    ...overrides,
  };
}

function check(games: AuditGame[], key: string) {
  const found = auditGames(games).find((c) => c.key === key);
  if (!found) throw new Error(`no check named ${key}`);
  return found;
}

describe("splitTrailingLatinParen", () => {
  it("拆出結尾括號裡的英文原名", () => {
    expect(splitTrailingLatinParen("銀河飛將 II (Wing Commander II)")).toEqual({
      base: "銀河飛將 II",
      paren: "Wing Commander II",
    });
  });

  it("全形括號與長副標一樣拆得開", () => {
    expect(
      splitTrailingLatinParen("新宇宙傳奇 I（Space Quest I: Roger Wilco）")?.base
    ).toBe("新宇宙傳奇 I");
  });

  it("分篇標記不是原名，不能剝掉", () => {
    expect(splitTrailingLatinParen("小辣椒的時空冒險(上)")).toBeNull();
    expect(splitTrailingLatinParen("創世紀8 異教徒(二)")).toBeNull();
  });

  it("括號不在結尾就不算", () => {
    expect(splitTrailingLatinParen("上海 II (Shang Hai II) 續篇")).toBeNull();
  });

  it("沒有括號的名稱原樣留著", () => {
    expect(splitTrailingLatinParen("新絕代雙驕")).toBeNull();
    expect(looseKey("新絕代雙驕")).toBe(looseKey("新絕代雙驕"));
  });
});

describe("auditGames", () => {
  it("把同一款的不同抄法收進同一組", () => {
    const rows = check(
      [
        game({ name: "銀河飛將 II" }),
        game({ name: "銀河飛將II" }),
        game({ name: "銀河飛將 II (Wing Commander II)" }),
        game({ name: "新絕代雙驕" }),
      ],
      "loose-dup"
    ).rows;

    expect(rows).toHaveLength(3);
    expect(new Set(rows.map((r) => r.group)).size).toBe(1);
    expect(rows.map((r) => r.name)).not.toContain("新絕代雙驕");
  });

  it("分篇不會被併成一組", () => {
    expect(
      check(
        [
          game({ name: "小辣椒的時空冒險(上)" }),
          game({ name: "小辣椒的時空冒險(下)" }),
        ],
        "loose-dup"
      ).rows
    ).toHaveLength(0);
  });

  it("同名異作照樣入列，括號留在 note 上供人判斷", () => {
    const rows = check(
      [
        game({ name: "洪荒帝國 (Dune)" }),
        game({ name: "洪荒帝國 (Savage Empire)" }),
      ],
      "loose-dup"
    ).rows;

    expect(rows.map((r) => r.note)).toEqual(["Dune", "Savage Empire"]);
  });

  it("只有一筆的鍵不成組", () => {
    expect(check([game({ name: "大富翁五" })], "loose-dup").rows).toHaveLength(0);
  });

  it("nameKeys 撞在一起的分成一組", () => {
    const rows = check(
      [
        game({ name: "幻想空間 II", nameKeys: ["幻想空間ii"] }),
        game({ name: "幻想空間Ⅱ", nameKeys: ["幻想空間ii"] }),
        game({ name: "小蜜蜂88", nameKeys: ["小蜜蜂88"] }),
      ],
      "key-dup"
    ).rows;

    expect(rows.map((r) => r.name)).toEqual(["幻想空間 II", "幻想空間Ⅱ"]);
  });

  it("挑出假名、超長名與沒人引用的條目", () => {
    const games = [
      game({ name: "カスタムメイト・2" }),
      game({ name: "米".repeat(26) }),
      game({ name: "大富翁五", articleCount: 0 }),
    ];

    expect(check(games, "kana").rows.map((r) => r.name)).toEqual([
      "カスタムメイト・2",
    ]);
    expect(check(games, "long").rows).toHaveLength(1);
    expect(check(games, "orphan").rows.map((r) => r.name)).toEqual(["大富翁五"]);
  });

  it("欄位填寫率算的是有值的筆數", () => {
    const summary = check(
      [game({ name: "A", nameEn: "A" }), game({ name: "B" })],
      "fields"
    ).summary;

    expect(summary.find((line) => line.startsWith("nameEn"))).toContain(
      "1 / 2（50.0%）"
    );
  });
});
