import {
  activeCountByYear,
  buildTrack,
  makeScale,
  packCallouts,
  packLanes,
  stackLabels,
  YEAR_HEIGHT,
  type TimelineMagazineInput,
  type TimelineTail,
} from "@/lib/timeline";

const TODAY = new Date("2026-09-08T00:00:00Z");

function magazine(over: Partial<TimelineMagazineInput> = {}): TimelineMagazineInput {
  return {
    id: "m1",
    name: "測試刊",
    slug: "test",
    nameParallel: null,
    publisher: null,
    categories: [],
    foundedDate: "1995-03",
    endedDate: null,
    isActive: false,
    knownIssueCount: null,
    issues: [],
    titles: [],
    ...over,
  };
}

function issue(over: Partial<TimelineMagazineInput["issues"][number]>) {
  return {
    id: "i",
    slug: "1",
    issueNumber: "第1期",
    kind: "REGULAR" as const,
    publishDate: null,
    coverImage: null,
    order: 0,
    ...over,
  };
}

describe("buildTrack", () => {
  it("查不到任何日期時畫不出線", () => {
    expect(buildTrack(magazine({ foundedDate: null }), TODAY)).toBeNull();
  });

  it("沒有 foundedDate 就退回最早那一期本刊", () => {
    const track = buildTrack(
      magazine({
        foundedDate: null,
        issues: [issue({ publishDate: "1994-05-01", order: 0 })],
      }),
      TODAY
    )!;
    expect(track.foundedAt.toISOString().slice(0, 7)).toBe("1994-05");
  });

  it("試刊期在創刊之前才成立", () => {
    const track = buildTrack(
      magazine({
        foundedDate: "1998-07",
        issues: [
          issue({ id: "p", slug: "pilot", kind: "PILOT", publishDate: "1998-03", order: 0 }),
          issue({ id: "a", publishDate: "1998-07", order: 1 }),
        ],
      }),
      TODAY
    )!;
    expect(track.start.toISOString().slice(0, 7)).toBe("1998-03");
    expect(track.markers.some((m) => m.kind === "pilot")).toBe(true);
  });

  it("試刊日期晚於創刊時不畫試刊段", () => {
    const track = buildTrack(
      magazine({
        foundedDate: "1998-07",
        issues: [issue({ kind: "PILOT", publishDate: "1999-01", order: 0 })],
      }),
      TODAY
    )!;
    expect(track.start).toEqual(track.foundedAt);
    expect(track.markers.some((m) => m.kind === "pilot")).toBe(false);
  });

  it("endedDate 只有年份時收在那一年的年底", () => {
    const track = buildTrack(
      magazine({ foundedDate: "1993-06", endedDate: "2003" }),
      TODAY
    )!;
    expect(track.solidEnd.getUTCFullYear()).toBe(2003);
    expect(track.solidEnd.getUTCMonth()).toBe(11);
    expect(track.tail).toBeNull();
  });

  it("沒有 endedDate 又沒在發行，尾端是不確定", () => {
    const track = buildTrack(
      magazine({ issues: [issue({ publishDate: "1997-08", order: 0 })] }),
      TODAY
    )!;
    expect(track.tail).toEqual<TimelineTail>({ kind: "unknown" });
    expect(track.solidEnd.toISOString().slice(0, 7)).toBe("1997-08");
  });

  it("仍在發行的刊，實線只畫到已知最後一期", () => {
    const track = buildTrack(
      magazine({ isActive: true, issues: [issue({ publishDate: "2019-12", order: 0 })] }),
      TODAY
    )!;
    expect(track.tail).toEqual<TimelineTail>({ kind: "active" });
    expect(track.solidEnd.toISOString().slice(0, 7)).toBe("2019-12");
  });

  it("只出過一兩期的刊仍有最小長度", () => {
    const track = buildTrack(
      magazine({ foundedDate: "1992-06-10", endedDate: "1992-07-10" }),
      TODAY
    )!;
    const days = (track.solidEnd.getTime() - track.foundedAt.getTime()) / 86_400_000;
    expect(days).toBeGreaterThanOrEqual(120);
  });

  it("首個刊名時期不是改名事件", () => {
    const titles = [
      {
        id: "t1",
        title: "電視遊樂情報",
        titleParallel: null,
        note: null,
        startIssue: {
          id: "a",
          slug: "1",
          issueNumber: "第1期",
          publishDate: "1987-11",
          coverImage: null,
          order: 0,
        },
      },
      {
        id: "t2",
        title: "電視遊樂報導",
        titleParallel: null,
        note: null,
        startIssue: {
          id: "b",
          slug: "19",
          issueNumber: "創刊號",
          publishDate: "1989-05",
          coverImage: null,
          order: 18,
        },
      },
    ];
    const track = buildTrack(magazine({ foundedDate: "1987-11", titles }), TODAY)!;
    const renames = track.markers.filter((m) => m.kind === "rename");
    expect(renames).toHaveLength(1);
    expect(renames[0].label).toBe("改名為《電視遊樂報導》");
  });

  it("有 endedDate 才說停刊，否則只說已知最後一期", () => {
    const withEnded = buildTrack(magazine({ endedDate: "2006-22" }), TODAY)!;
    expect(withEnded.markers.find((m) => m.kind === "ended")!.label).toBe("停刊");

    const withoutEnded = buildTrack(
      magazine({ issues: [issue({ publishDate: "2001-04", order: 0 })] }),
      TODAY
    )!;
    expect(withoutEnded.markers.find((m) => m.kind === "ended")!.label).toBe("已知最後一期");
  });
});

describe("packLanes", () => {
  const t = (start: string, end: string, tail: TimelineTail = null) => ({
    start: new Date(start),
    solidEnd: new Date(end),
    tail,
  });

  it("時間不重疊的線共用一欄", () => {
    const packed = packLanes([t("1990-01-01", "1992-01-01"), t("1996-01-01", "1998-01-01")], 0, TODAY);
    expect(packed.map((p) => p.lane)).toEqual([0, 0]);
  });

  it("重疊的線各佔一欄", () => {
    const packed = packLanes([t("1990-01-01", "1999-01-01"), t("1995-01-01", "2000-01-01")], 0, TODAY);
    expect(packed.map((p) => p.lane)).toEqual([0, 1]);
  });

  it("間距不足時不共用一欄，免得看起來像同一條線", () => {
    const gap = 365 * 86_400_000;
    const packed = packLanes(
      [t("1990-01-01", "1992-01-01"), t("1992-03-01", "1994-01-01")],
      gap,
      TODAY
    );
    expect(packed.map((p) => p.lane)).toEqual([0, 1]);
  });

  it("仍在發行的線一路佔用到今天", () => {
    const packed = packLanes(
      [t("1990-01-01", "1992-01-01", { kind: "active" }), t("2000-01-01", "2001-01-01")],
      0,
      TODAY
    );
    expect(packed.map((p) => p.lane)).toEqual([0, 1]);
  });

  describe("lane groups", () => {
    const g = (slug: string, start: string, end: string) => ({ ...t(start, end), slug });
    const laneOf = (packed: { slug?: string; lane: number }[], slug: string) =>
      packed.find((p) => p.slug === slug)!.lane;

    it("同一組但時間不重疊的刊共用一欄", () => {
      const packed = packLanes(
        [
          g("other", "1988-01-01", "2005-01-01"),
          g("a", "1986-01-01", "1987-06-01"),
          g("b", "1994-07-01", "1997-01-01"),
        ],
        0,
        TODAY,
        [["a", "b"]]
      );
      expect(laneOf(packed, "a")).toBe(laneOf(packed, "b"));
      // 整組先排，所以佔到最左邊那一欄，沒分組的往右讓。
      expect(laneOf(packed, "a")).toBe(0);
      expect(laneOf(packed, "other")).toBe(1);
    });

    it("同一組但時間重疊的刊落在相鄰的欄", () => {
      const packed = packLanes(
        [g("a", "1996-07-01", "2002-06-01"), g("b", "1998-12-01", "2001-12-01")],
        0,
        TODAY,
        [["a", "b"]]
      );
      expect(Math.abs(laneOf(packed, "a") - laneOf(packed, "b"))).toBe(1);
    });

    it("三本一組時，組內不重疊的兩本仍會共用一欄", () => {
      const packed = packLanes(
        [
          g("x", "1998-02-01", "1998-12-01"),
          g("y", "1998-08-01", "2001-09-01"),
          g("z", "2000-12-01", "2003-12-01"),
        ],
        0,
        TODAY,
        [["x", "y", "z"]]
      );
      // x（1998 上半）與 z（2000 之後）不重疊，共用一欄；y 貫穿兩者，另佔一欄。
      // 三本仍然擠在相鄰的兩欄裡，這正是「要靠近」的意思。
      expect(laneOf(packed, "x")).toBe(laneOf(packed, "z"));
      expect(Math.abs(laneOf(packed, "y") - laneOf(packed, "x"))).toBe(1);
    });

    it("組裡只剩一本時當作沒分組", () => {
      const packed = packLanes([g("a", "1990-01-01", "1992-01-01")], 0, TODAY, [["a", "missing"]]);
      expect(packed.map((p) => p.lane)).toEqual([0]);
    });

    it("一本刊只會被算進第一個提到它的組", () => {
      const packed = packLanes(
        [
          g("a", "1986-01-01", "1987-06-01"),
          g("b", "1994-07-01", "1997-01-01"),
          g("c", "1999-01-01", "2001-01-01"),
        ],
        0,
        TODAY,
        [
          ["a", "b"],
          ["b", "c"],
        ]
      );
      expect(packed).toHaveLength(3);
      expect(laneOf(packed, "a")).toBe(laneOf(packed, "b"));
    });
  });
});

describe("stackLabels", () => {
  it("重疊的標籤往下推，錨點留在原地", () => {
    const stacked = stackLabels([10, 12, 40], (n) => n, 20);
    expect(stacked.map((s) => s.anchorY)).toEqual([10, 12, 40]);
    expect(stacked.map((s) => s.labelY)).toEqual([10, 30, 50]);
  });

  it("間距夠時不動", () => {
    const stacked = stackLabels([0, 100], (n) => n, 20);
    expect(stacked.map((s) => s.labelY)).toEqual([0, 100]);
  });
});

describe("packCallouts", () => {
  const opts = { height: 50, gap: 5, columns: 3 };

  it("不重疊時全部留在第一欄的錨點上", () => {
    const packed = packCallouts([0, 100, 200], (n) => n, opts);
    expect(packed.map((p) => p.column)).toEqual([0, 0, 0]);
    expect(packed.map((p) => p.top)).toEqual([0, 100, 200]);
  });

  it("擠在一起時往右開新欄，錨點不動", () => {
    const packed = packCallouts([0, 10, 20], (n) => n, opts);
    expect(packed.map((p) => p.column)).toEqual([0, 1, 2]);
    expect(packed.map((p) => p.top)).toEqual([0, 10, 20]);
    expect(packed.map((p) => p.anchorY)).toEqual([0, 10, 20]);
  });

  it("每一欄都放不下時，接在最低的那一欄後面", () => {
    const packed = packCallouts([0, 10, 20, 30], (n) => n, opts);
    expect(packed[3]).toMatchObject({ column: 0, top: 55, anchorY: 30 });
  });

  it("空出來的欄會再被用到", () => {
    const packed = packCallouts([0, 10, 20, 60], (n) => n, opts);
    // 第一欄到 50 就空了，60 放得回去，不必再往下推。
    expect(packed[3]).toMatchObject({ column: 0, top: 60 });
  });

  it("依錨點排序，輸入順序不影響結果", () => {
    const a = packCallouts([20, 0, 10], (n) => n, opts);
    const b = packCallouts([0, 10, 20], (n) => n, opts);
    expect(a).toEqual(b);
  });
});

describe("makeScale", () => {
  it("一年一格，起始年落在頂端", () => {
    const scale = makeScale(1986, 1995);
    expect(scale.height).toBe(10 * YEAR_HEIGHT);
    expect(scale.y(new Date("1986-01-01T00:00:00Z"))).toBe(0);
    expect(scale.y(new Date("1987-01-01T00:00:00Z"))).toBeCloseTo(YEAR_HEIGHT, 0);
    expect(scale.years).toHaveLength(10);
  });
});

describe("activeCountByYear", () => {
  it("該年有任何一天在架就算一本", () => {
    const counts = activeCountByYear(
      [
        { start: new Date("1996-11-01"), solidEnd: new Date("1997-01-15") },
        { start: new Date("1990-01-01"), solidEnd: new Date("1999-12-31") },
      ],
      [1995, 1996, 1997, 1998]
    );
    expect(counts.get(1995)).toBe(1);
    expect(counts.get(1996)).toBe(2);
    expect(counts.get(1997)).toBe(2);
    expect(counts.get(1998)).toBe(1);
  });
});
