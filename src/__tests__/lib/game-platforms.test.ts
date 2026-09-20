import {
  PLATFORM_CODES,
  PLATFORM_FAMILIES,
  PLATFORM_FAMILY_COLORS,
  displayPlatforms,
  familyOf,
  platformColor,
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

  // 表上唯一沒有現有值可抄的代號，所以寫法是先備著的，測試把它們釘住。
  it("Switch 的幾種寫法都對到 NS", () => {
    for (const raw of ["NS", "Switch", "Nintendo Switch", "NSW"]) {
      expect(toPlatformCodes(raw).codes).toEqual(["NS"]);
    }
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

describe("displayPlatforms", () => {
  it("把 PC 家族併成一個 PC", () => {
    expect(displayPlatforms(["DOS", "WIN"])).toEqual(["PC"]);
    expect(displayPlatforms(["DOS", "WIN", "PC98", "APPLE2", "PC"])).toEqual(["PC"]);
  });

  // 換成家族名會變成「索尼」「任天堂」，那是廠商不是平台。
  it("主機代號原樣顯示，不換成家族名", () => {
    expect(displayPlatforms(["PS3", "X360", "3DS"])).toEqual(["PS3", "X360", "3DS"]);
  });

  it("混著的時候 PC 出現在第一個 PC 家族代號的位置", () => {
    expect(displayPlatforms(["PS2", "DOS", "WIN", "SS"])).toEqual(["PS2", "PC", "SS"]);
  });

  it("空的還是空的", () => {
    expect(displayPlatforms([])).toEqual([]);
  });
});

describe("platformColor", () => {
  // 上色的單位是家族：PS／PS2／PSP 是同一條產品線，各給一個顏色只會變成彩虹。
  it("gives every code in a family the same colour", () => {
    expect(platformColor("PS2")).toBe(platformColor("PSP"));
    expect(platformColor("FC")).toBe(platformColor("3DS"));
  });

  it("gives different families different colours", () => {
    expect(platformColor("PS2")).not.toBe(platformColor("FC"));
    expect(platformColor("PC")).not.toBe(platformColor("DC"));
  });

  // 顯示層的「PC」不是 PLATFORM_CODES 裡任何一族的成員名，得自己對上。
  it("colours the display-only PC label as the PC family", () => {
    expect(platformColor("PC")).toBe(platformColor("DOS"));
    expect(platformColor("PC")).toBe(PLATFORM_FAMILY_COLORS.PC);
  });

  // 網址或資料裡冒出沒見過的代號時，不要丟例外，落到近乎無彩的那一個。
  it("falls back to the neutral colour for a code it does not know", () => {
    expect(platformColor("NEWBOX")).toBe(PLATFORM_FAMILY_COLORS.其他);
  });
});
