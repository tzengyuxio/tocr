/**
 * `Game.platforms` 的平台代號，以及各來源的寫法怎麼對到代號。
 *
 * 代號是**純代號**：沒有斜線、沒有中文別名，顯示名是前台的事。這條規矩是被
 * `PLATFORM` 標籤逼出來的——那邊沒收斂過，`FC/紅白機` 與 `紅白機` 並存、
 * `SFC`／`SFC/超任`／`超級任天堂` 三種寫法指同一台。
 *
 * **存細的、顯示粗的**：`DOS`／`WIN`／`PC98`／`APPLE2` 各自存著，前台用
 * `PLATFORM_FAMILIES` 收斂成「PC」。這個站自己只需要 PC，但長期目標是一個
 * 統一的遊戲／雜誌／書籍資料庫由它產生三站的資料，那一邊會需要細的；寫入時
 * 收斂省不了多少事，卻再也回不去。判準與取捨見 docs/backlog/game-platforms.md。
 */

export const PLATFORM_CODES = [
  // 任天堂
  "FC", "SFC", "N64", "GC", "WII", "WIIU", "GB", "GBA", "NDS", "3DS",
  // 索尼
  "PS", "PS2", "PS3", "PS4", "PSP", "PSV",
  // 世嘉
  "MD", "MCD", "SS", "DC", "SMS", "GG",
  // 微軟
  "XBOX", "X360", "XONE",
  // 其他主機與機台
  "PCE", "NG", "NGP", "ARCADE",
  // 電腦
  "DOS", "WIN", "PC98", "APPLE2", "PC",
  // 隨身裝置與網頁
  "IOS", "ANDROID", "PALM", "WEB",
] as const;

export type PlatformCode = (typeof PLATFORM_CODES)[number];

/**
 * 三份來源的寫法 → 代號。
 *
 * 一個來源值可以對到多個代號（cdosgame 的 `DOS、Windows、Sega Saturn`），所以
 * 值是陣列。查表前先 `normalise()`，大小寫與空白的差異不必各列一條。
 */
const FROM_SOURCE: Record<string, PlatformCode[]> = {
  // ---- 任天堂
  "fc": ["FC"], "fc/紅白機": ["FC"], "紅白機": ["FC"], "familycomputer": ["FC"],
  "sfc": ["SFC"], "sfc/超任": ["SFC"], "超級任天堂": ["SFC"],
  "n64": ["N64"], "nintendo64": ["N64"],
  "gc": ["GC"], "gamecube": ["GC"],
  "wii": ["WII"],
  "wiiu": ["WIIU"],
  "gb": ["GB"], "gameboy": ["GB"],
  "gba": ["GBA"],
  "nds": ["NDS"], "nintendods": ["NDS"], "ds": ["NDS"],
  "3ds": ["3DS"], "nintendo3ds": ["3DS"],

  // ---- 索尼
  "ps": ["PS"], "playstation": ["PS"],
  "ps2": ["PS2"], "playstation2": ["PS2"],
  "ps3": ["PS3"], "playstation3": ["PS3"],
  "ps4": ["PS4"], "playstation4": ["PS4"],
  "psp": ["PSP"], "playstationportable": ["PSP"],
  "psv": ["PSV"], "psvita": ["PSV"], "playstationvita": ["PSV"],

  // ---- 世嘉
  "md": ["MD"], "md/megadrive": ["MD"], "megadrive": ["MD"],
  "mcd": ["MCD"], "mega-cd": ["MCD"], "megacd": ["MCD"],
  "ss": ["SS"], "segasaturn": ["SS"], "saturn": ["SS"],
  "dc": ["DC"], "dreamcast": ["DC"],
  "sms": ["SMS"], "sms/mastersystem": ["SMS"], "mastersystem": ["SMS"],
  "gg": ["GG"], "gg/gamegear": ["GG"], "gamegear": ["GG"],

  // ---- 微軟。XBOX 與 X360 是兩台主機，不是寫法差異。
  "xbox": ["XBOX"],
  "xbox360": ["X360"], "x360": ["X360"],
  "xboxone": ["XONE"],

  // ---- 其他主機與機台
  "pce": ["PCE"], "pcengine": ["PCE"], "pce/pcengine": ["PCE"],
  "neogeo": ["NG"],
  "neogeopocket": ["NGP"],
  "arcade": ["ARCADE"], "大型電玩": ["ARCADE"],

  // ---- 電腦。cdosgame 把 Windows 分到版本，全部收在 WIN。
  "dos": ["DOS"], "dos/v": ["DOS"],
  "windows": ["WIN"], "win3.1": ["WIN"], "win9x": ["WIN"],
  "winxp": ["WIN"], "win64": ["WIN"],
  "pc-98": ["PC98"], "pc98": ["PC98"],
  "appleii": ["APPLE2"], "apple2": ["APPLE2"],
  "pc": ["PC"], "pc/個人電腦": ["PC"], "個人電腦": ["PC"],

  // ---- 隨身裝置與網頁
  "ios": ["IOS"],
  "android": ["ANDROID"],
  "palm": ["PALM"], "palmos": ["PALM"],
  "web": ["WEB"], "網頁遊戲": ["WEB"], "網頁": ["WEB"],
};

/**
 * 認得出來、但**刻意不對到任何代號**的值。
 *
 * 前四個是載體不是平台（磁片版與光碟版是同一個平台的兩種版本），`DDR` 是遊戲名，
 * `MegaDisc` 推測是某本雜誌附送的光碟、還沒查證，`手機遊戲` 太籠統——那個年代
 * 可能是 feature phone、也可能是 iOS/Android，要看文章才判得出來。
 *
 * 列出來而不是讓它們落進「不認得」，是為了讓真正的新寫法在報表上顯眼。
 */
const NOT_A_PLATFORM = new Set([
  "cd-rom", "光碟", "dvd", "megadisc", "ddr", "手機遊戲",
]);

/** 顯示與篩選用。存的是細代號，給人看的是這一層。 */
export const PLATFORM_FAMILIES: Record<string, PlatformCode[]> = {
  PC: ["DOS", "WIN", "PC98", "APPLE2", "PC"],
  任天堂: ["FC", "SFC", "N64", "GC", "WII", "WIIU", "GB", "GBA", "NDS", "3DS"],
  索尼: ["PS", "PS2", "PS3", "PS4", "PSP", "PSV"],
  世嘉: ["MD", "MCD", "SS", "DC", "SMS", "GG"],
  微軟: ["XBOX", "X360", "XONE"],
  隨身裝置: ["IOS", "ANDROID", "PALM"],
  網頁: ["WEB"],
  其他: ["PCE", "NG", "NGP", "ARCADE"],
};

/**
 * 每一族一個色相，給遊戲索引的平台籌碼用。
 *
 * **上色的單位是家族不是代號**：`PS`／`PS2`／`PSP` 是同一條線上的東西，各給一個
 * 顏色只會變成一排彩虹，看不出誰跟誰有關。分到家族之後，一排籌碼掃過去就讀得出
 * 「這幾顆是任天堂、那幾顆是索尼」。
 *
 * 明度一律 0.45：籌碼上的字只有 12px，未選取時是彩色字配白底、選取時是白字配
 * 彩色底，兩個方向都要有 4.5:1 以上，壓在同一個明度最省事。彩度各自調整——紅色
 * 在同明度下看起來比青色重，全部給同一個值會讓某幾顆特別搶。
 *
 * 「其他」刻意留成近乎無彩：它裝的是 PCE／NG／ARCADE 這些湊在一起的代號，
 * 本來就不是一條產品線，給它一個鮮明的顏色是在宣稱一個不存在的共同點。
 */
export const PLATFORM_FAMILY_COLORS: Record<string, string> = {
  PC: "oklch(0.45 0.12 45)",
  任天堂: "oklch(0.45 0.17 25)",
  索尼: "oklch(0.45 0.15 265)",
  世嘉: "oklch(0.45 0.11 200)",
  微軟: "oklch(0.45 0.14 145)",
  隨身裝置: "oklch(0.45 0.12 310)",
  網頁: "oklch(0.45 0.11 340)",
  其他: "oklch(0.45 0.02 260)",
};

/** 這個顯示代號該用什麼顏色。認不得的落到「其他」那個近乎無彩的值。 */
export function platformColor(code: string): string {
  const family =
    code === "PC" ? "PC" : familyOf(code as PlatformCode) ?? "其他";
  return PLATFORM_FAMILY_COLORS[family] ?? PLATFORM_FAMILY_COLORS.其他;
}

function normalise(raw: string): string {
  return raw.normalize("NFKC").toLowerCase().replace(/\s+/g, "");
}

/**
 * 一個來源欄位 → 代號。
 *
 * cdosgame 用「、」串多個平台（`DOS、Win9x`），《電玩通》索引一列只有一個。
 * 認不得的寫法回在 `unknown` 裡，不猜——猜錯會把一款遊戲標到沒出過的主機上。
 */
export function toPlatformCodes(raw: string): {
  codes: PlatformCode[];
  unknown: string[];
} {
  // 整串先查。斜線與空白是寫法的一部分，不是分隔符——`PC/個人電腦`、`DOS/V`、
  // `PS Vita` 拆開之後每一半都認不得，而 `PS Vita` 的前半還會誤中 `PS`。
  const whole = normalise(raw);
  if (NOT_A_PLATFORM.has(whole)) return { codes: [], unknown: [] };
  if (FROM_SOURCE[whole]) return { codes: [...FROM_SOURCE[whole]], unknown: [] };

  const codes = new Set<PlatformCode>();
  const unknown: string[] = [];

  for (const part of raw.split(/[、,]/).map((p) => p.trim()).filter(Boolean)) {
    const key = normalise(part);
    if (NOT_A_PLATFORM.has(key)) continue;

    const mapped = FROM_SOURCE[key];
    if (mapped) mapped.forEach((c) => codes.add(c));
    else unknown.push(part);
  }

  return { codes: [...codes], unknown };
}

/** 代號屬於哪一族；沒列進 PLATFORM_FAMILIES 的回 undefined。 */
export function familyOf(code: PlatformCode): string | undefined {
  return Object.entries(PLATFORM_FAMILIES).find(([, codes]) =>
    (codes as string[]).includes(code)
  )?.[0];
}

/**
 * 給人看的平台列表：`DOS`／`WIN`／`PC98`／`APPLE2` 併成一個「PC」。
 *
 * 這是「存細的、顯示粗的」的顯示那半。**只收斂 PC 家族**——其餘代號本身就是
 * 讀者認得的寫法（`PS3`、`3DS`、`DC`），把它們換成家族名會變成「索尼」「任天堂」，
 * 那是廠商不是平台。家族表的其他分組是給篩選與分類用的，不是拿來顯示的。
 *
 * 保持原本的順序，PC 出現在第一個 PC 家族代號的位置。
 */
export function displayPlatforms(codes: string[]): string[] {
  const pcFamily = new Set<string>(PLATFORM_FAMILIES.PC);
  const shown: string[] = [];

  for (const code of codes) {
    const label = pcFamily.has(code) ? "PC" : code;
    if (!shown.includes(label)) shown.push(label);
  }

  return shown;
}
