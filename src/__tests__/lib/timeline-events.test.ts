import { EXTERNAL_EVENTS, LANE_GROUPS, MAGAZINE_LINKS } from "@/lib/timeline-events";

/** 中文字寬為 1，半形字約 0.55——與 TimelineChart 的 `labelHeight` 同一套估算。 */
function cjkWidth(text: string): number {
  return [...text].reduce((w, ch) => w + (/[\x00-\xFF]/.test(ch) ? 0.55 : 1), 0);
}

describe("EXTERNAL_EVENTS", () => {
  // 左欄寬 300px、11px 字，一行放得下約 24 個中文字。換行會把下面整疊標註往下
  // 推——三十幾筆累積起來，最後幾筆會漂離自己的年份好幾年——所以一行是原則，
  // 兩行是上限，而且只給前後沒有別的事件擠著的那幾筆。
  it("每一則的補充說明最多兩行（48 個中文字寬）", () => {
    const tooLong = EXTERNAL_EVENTS.filter((e) => e.note && cjkWidth(e.note) > 48).map(
      (e) => `${e.at} ${e.title}：${e.note}`
    );
    expect(tooLong).toEqual([]);
  });

  it("寫到兩行的是少數", () => {
    const twoLines = EXTERNAL_EVENTS.filter((e) => e.note && cjkWidth(e.note) > 24);
    expect(twoLines.map((e) => e.title)).toEqual(["報禁解除"]);
  });

  it("標題同樣不超過一行", () => {
    const tooLong = EXTERNAL_EVENTS.filter((e) => cjkWidth(`${e.at}　${e.title}`) > 24).map(
      (e) => `${e.at} ${e.title}`
    );
    expect(tooLong).toEqual([]);
  });

  it("每一則都有出處", () => {
    expect(EXTERNAL_EVENTS.filter((e) => !e.source.trim())).toEqual([]);
  });

  it("依日期排序", () => {
    const times = EXTERNAL_EVENTS.map((e) => e.date.getTime());
    expect([...times].sort((a, b) => a - b)).toEqual(times);
  });
});

describe("LANE_GROUPS", () => {
  it("一本刊只出現在一組裡", () => {
    const seen = new Set<string>();
    const twice = LANE_GROUPS.flat().filter((slug) => {
      const dup = seen.has(slug);
      seen.add(slug);
      return dup;
    });
    // 重複的那本會被第二組默默丟掉（見 packLanes），排出來的版面因此與這份
    // 清單讀起來的意思不同。
    expect(twice).toEqual([]);
  });

  it("每組至少兩本", () => {
    expect(LANE_GROUPS.filter((group) => group.length < 2)).toEqual([]);
  });
});

describe("MAGAZINE_LINKS", () => {
  it("關係線的標籤短到放得進兩欄之間", () => {
    expect(MAGAZINE_LINKS.filter((link) => cjkWidth(link.label) > 6)).toEqual([]);
  });
});
