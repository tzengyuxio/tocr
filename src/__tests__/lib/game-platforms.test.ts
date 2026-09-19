import {
  familyOf,
  PLATFORM_CODES,
  PLATFORM_FAMILIES,
  toPlatformCodes,
} from "@/lib/game-platforms";

describe("toPlatformCodes", () => {
  it("把 cdosgame 串在一起的平台拆開", () => {
    expect(toPlatformCodes("DOS、Windows、Sega Saturn").codes).toEqual([
      "DOS",
      "WIN",
      "SS",
    ]);
  });

  it("Windows 的各種版本都收在 WIN", () => {
    for (const raw of ["Windows", "Win3.1", "Win9x", "WinXP", "Win64"]) {
      expect(toPlatformCodes(raw).codes).toEqual(["WIN"]);
    }
  });

  it("同一台主機的多種寫法對到同一個代號", () => {
    for (const raw of ["FC/紅白機", "紅白機", "FC"]) {
      expect(toPlatformCodes(raw).codes).toEqual(["FC"]);
    }
    for (const raw of ["SFC", "SFC/超任", "超級任天堂"]) {
      expect(toPlatformCodes(raw).codes).toEqual(["SFC"]);
    }
  });

  it("XBOX 與 Xbox 360 是兩台主機", () => {
    expect(toPlatformCodes("XBOX").codes).toEqual(["XBOX"]);
    expect(toPlatformCodes("Xbox 360").codes).toEqual(["X360"]);
  });

  it("帶空白或斜線的寫法整串認，不會被拆成兩半誤中", () => {
    // PS Vita 拆開之後前半會誤中 PS，吐出兩個代號。
    expect(toPlatformCodes("PS Vita").codes).toEqual(["PSV"]);
    expect(toPlatformCodes("PC/個人電腦").codes).toEqual(["PC"]);
    expect(toPlatformCodes("DOS/V").codes).toEqual(["DOS"]);
  });

  it("重複的來源值只出現一次", () => {
    expect(toPlatformCodes("DOS、DOS/V").codes).toEqual(["DOS"]);
  });

  it("載體與遊戲名不是平台，不對到任何代號也不算不認得", () => {
    for (const raw of ["CD-ROM", "光碟", "DVD", "MegaDisc", "DDR", "手機遊戲"]) {
      expect(toPlatformCodes(raw)).toEqual({ codes: [], unknown: [] });
    }
  });

  it("認不得的寫法回報出來，不猜", () => {
    expect(toPlatformCodes("3DO").unknown).toEqual(["3DO"]);
    expect(toPlatformCodes("3DO").codes).toEqual([]);
  });

  it("認得的部分照收，只有認不得的那一段進 unknown", () => {
    const { codes, unknown } = toPlatformCodes("DOS、3DO");
    expect(codes).toEqual(["DOS"]);
    expect(unknown).toEqual(["3DO"]);
  });

  it("《電玩通》索引那 15 個平台全部認得", () => {
    const tags = [
      "PS3", "PSP", "Xbox 360", "3DS", "NDS", "PS Vita", "Wii", "PS2",
      "Wii U", "Arcade", "iOS", "PC", "Android", "Xbox One", "PS4",
    ];
    for (const tag of tags) {
      expect(toPlatformCodes(tag)).toMatchObject({ unknown: [] });
      expect(toPlatformCodes(tag).codes).toHaveLength(1);
    }
  });
});

describe("PLATFORM_FAMILIES", () => {
  it("每個代號都屬於某一族", () => {
    const missing = PLATFORM_CODES.filter((code) => !familyOf(code));
    expect(missing).toEqual([]);
  });

  it("沒有代號被分到兩族", () => {
    const seen = Object.values(PLATFORM_FAMILIES).flat();
    expect(new Set(seen).size).toBe(seen.length);
  });

  it("PC 家族收得住四種電腦寫法", () => {
    expect(PLATFORM_FAMILIES.PC).toEqual(["DOS", "WIN", "PC98", "APPLE2", "PC"]);
  });
});
