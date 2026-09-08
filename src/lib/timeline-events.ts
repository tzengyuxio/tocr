/**
 * 年代軸上的事件。
 *
 * 分兩類，因為它們回答的是兩個不同的問題：
 *
 * - **外部事件**（`EXTERNAL_EVENTS`）：主機上市、作業系統改版、著作權法與美國
 *   特別 301。這些事對每一本刊都一樣，是讀者問「為什麼 1998 年一口氣冒出七本
 *   雜誌」時要看的東西。它們不在資料庫裡，也不該進去——`Magazine` 那張表存的是
 *   刊物，不是產業史。
 * - **雜誌事件**（`MAGAZINE_EVENTS`）：授權關係與刊期的變動。改名不在這裡，
 *   那個有 `MagazineTitle` 撐著，由 `buildTrack` 自己長出來；這裡放的是模型還
 *   沒有欄位、目前只寫在 `Magazine.description` 裡的那幾件事。
 *
 * **每一筆都要有 `source`。** 這批日期沒有一個是推得出來的，全部得查；
 * 沒有出處的條目就是站上憑空多出來的斷言，寧可不放。查到相衝的說法時把兩邊都
 * 寫進 `note`，不要挑一個看起來順的。
 *
 * 日期用 EDTF（同 `Magazine.foundedDate`）：查得到哪一天就寫到哪一天，只查得到
 * 月份就停在月份，不要為了畫面整齊補一個 01 上去。
 *
 * **標題與 `note` 各最多兩行**（左欄一行約 19 個中文字寬，`timeline-events.test.ts`
 * 會擋）。左欄的標註是往下推著排的，多一行就把後面整疊推遠一點，四十筆累積起來，
 * 最後幾筆會漂離自己的年份好幾年——所以能一行講完的就一行講完，寫不完的細節留給
 * `source` 或 backlog，不要靠 `note` 交代。
 */
import { edtfSortDate } from "./edtf";

export interface ExternalEventInput {
  /** EDTF。 */
  at: string;
  title: string;
  /** 一句補充，通常是「為什麼這件事跟雜誌有關」。 */
  note?: string;
  /** 對這批雜誌影響特別大的，畫面上加粗。省著用，全部加粗等於都沒加粗。 */
  emphasis?: boolean;
  source: string;
}

export interface MagazineEventInput {
  magazineSlug: string;
  at: string;
  title: string;
  note?: string;
  source: string;
}

export type ExternalEvent = ExternalEventInput & { date: Date };
export type MagazineEvent = MagazineEventInput & { date: Date };

// ==================== 外部事件 ====================

/**
 * 挑選的準則是「這件事會不會改變雜誌上寫的東西」，不是「這件事重不重要」。
 * 所以主機記的是**台灣**買得到的日子（查不到才退回日本首發並註明），作業系統
 * 記的是**繁體中文版**上市——雜誌報導的是讀者手上的機器。
 *
 * **另有幾筆「時代座標」**（首任民選總統、香港主權移交、921、911）不影響雜誌內容，
 * 放進來是為了讓讀者定位年份——一整欄都是主機與法規時，1999 那一格看起來與 1998
 * 沒有差別。它們刻意不寫「與雜誌的關係」，因為那個關係要查才知道，猜不得。
 *
 * 著作權法與特別 301 只留**看得出後果**的那幾筆。法規變動對這批刊確實關鍵——
 * 相當一部分是翻印或授權中文版，1994 年的六一二大限與 1993 年起《電視遊樂報導》
 * 封面上出現的授權標示是同一件事的兩面——但條文公布、協定生效、名單升降這類
 * 程序性的日子在圖上只是多一行字，讀者對不回任何一本刊的變化，所以拿掉
 * （2026-09-08 移除四筆：1992 全文修正、1993 台美協定生效、2005 名單降級、
 * 2009 名單除名）。
 *
 * **四個查不到的日期刻意不放**：紅白機、初代 PlayStation、Dreamcast 的台灣上市
 * 日，以及 Windows 3.1 繁體中文版的上市日。那幾年台灣市場實際上是水貨與相容機
 * 的天下，沒有可引用的單一日期，編一個進去只會讓整張表的可信度一起打折。
 */
const EXTERNAL: ExternalEventInput[] = [
  {
    at: "1985-07-10",
    title: "著作權法改採創作保護主義",
    note: "電腦程式首度列為受保護的著作類別。",
    source: "全國法規資料庫 著作權法沿革",
  },
  {
    at: "1988-01-01",
    title: "報禁解除",
    note: "結束 37 年的報紙登記與張數管制。雜誌不在報禁之內，但出版環境自此鬆綁。",
    emphasis: true,
    source: "維基百科「報禁」；新聞局 1987-12-01 公告自元旦起受理登記",
  },
  {
    at: "1990-11-21",
    title: "Super Famicom 發售（日）",
    source: "ファミ通",
  },
  {
    at: "1991-01-14",
    title: "任天堂在台設立溥天",
    note: "在此之前是博優經銷與未授權相容機。",
    source: "維基百科「任天堂溥天」",
  },
  {
    at: "1991-12-03",
    title: "台灣接上網際網路",
    note: "TANet 骨幹啟用，經專線連上 JvNCNet。",
    source: "維基百科「台灣網際網路」",
  },
  {
    at: "1992-04-06",
    title: "Windows 3.1（國際版）",
    note: "繁體中文版約在 1993 年，確切日期查不到。",
    source: "維基百科「Windows 3.1家族」",
  },
  {
    at: "1994-06-12",
    title: "六一二大限",
    note: "未授權的翻譯重製物自此不得再銷售。",
    emphasis: true,
    source: "1992 年著作權法第 112 條；維基百科「六一二大限」",
  },
  {
    at: "1994-11-22",
    title: "SEGA Saturn 發售（日）",
    source: "SEGA 官方",
  },
  {
    at: "1994-12-03",
    title: "PlayStation 發售（日）",
    note: "台灣無正式上市日，當時尚無 SCE 據點。",
    source: "電撃オンライン",
  },
  {
    at: "1995-04",
    title: "HiNet 撥接開始商業營運",
    source: "中國時報 2025-04-01「HiNet 推出 30 年」（維基記 1994 年成立）",
  },
  {
    at: "1995-11-28",
    title: "Windows 95 在台上市",
    note: "英文版 8/24；PC 遊戲讀者群換了一批。",
    emphasis: true,
    source: "報時光／聯合報",
  },
  {
    at: "1996-06-23",
    title: "NINTENDO 64 發售（日）",
    source: "nippon.com、GAME Watch",
  },
  {
    at: "1998-07-31",
    title: "Windows 98 在台上市",
    note: "距英文版只差一個月，Win95 當年差了三個月。",
    source: "iThome 1998-07-31",
  },
  {
    at: "1998-11-27",
    title: "Dreamcast 發售（日）",
    note: "台灣上市日查不到；亞洲版 HKT-3010 涵蓋港台韓。",
    source: "日文維基百科「ドリームキャスト」",
  },
  {
    at: "1999",
    title: "ADSL 寬頻開始取代撥接",
    source: "維基百科「台灣網際網路」",
  },
  {
    at: "2000-03-04",
    title: "PlayStation 2 發售（日）",
    source: "日文維基百科「PlayStation 2」",
  },
  {
    at: "2000-07-01",
    title: "《天堂》台灣正式營運",
    note: "遊戲橘子代理；雜誌版面跟著換。",
    emphasis: true,
    source: "維基百科「天堂（遊戲）」；Gamania G!VOICE",
  },
  {
    at: "2000-09-20",
    title: "Windows Me 中文版在台上市",
    source: "iThome 2000-07-31（上市前公告）",
  },
  {
    at: "2001-09-14",
    title: "Nintendo GameCube 發售（日）",
    source: "電ファミニコゲーマー",
  },
  {
    at: "2001-10-30",
    title: "Windows XP 在台上市",
    note: "全球版 10 月 25 日，只差五天。",
    source: "iThome 2001-09-05（上市前公告）",
  },
  {
    at: "2001-11-15",
    title: "Xbox 發售（美）",
    source: "維基百科「Xbox」",
  },
  {
    at: "2002-01-01",
    title: "台灣加入 WTO",
    note: "以台澎金馬個別關稅領域名義入會。",
    source: "經濟部國際貿易署",
  },
  {
    at: "2002-01-24",
    title: "PlayStation 2 台灣上市",
    source: "維基百科「PlayStation 2」「台灣索尼」（單一來源）",
  },
  {
    at: "2002-11-29",
    title: "Xbox 台灣上市",
    source: "維基百科「Xbox」（單一來源）",
  },
  {
    at: "2006-03-16",
    title: "Xbox 360 台灣上市",
    source: "維基百科「Xbox 360」（另有 03-02 一說）",
  },
  {
    at: "2006-11-17",
    title: "PlayStation 3 台灣上市",
    note: "60GB 版 NT$17,980，與北美同步。",
    source: "巴哈姆特 GNN",
  },
  {
    at: "2008-07-12",
    title: "Wii 台灣上市",
    source: "維基百科「Wii」（單一來源）",
  },
  {
    at: "2017-12-01",
    title: "Nintendo Switch 台灣公司貨上市",
    note: "全球首發 3 月 3 日。",
    source: "Cool3c",
  },
  {
    at: "1996-03-23",
    title: "首任民選總統",
    note: "第九任總統首度由公民直選產生。",
    source: "中央選舉委員會選舉資料庫",
  },
  {
    at: "1997-07-01",
    title: "香港主權移交",
    source: "維基百科「香港回歸」",
  },
  {
    at: "1999-09-21",
    title: "921 大地震",
    note: "中部災情最重；出版與通路都受影響。",
    emphasis: true,
    source: "中央氣象署地震測報中心",
  },
  {
    at: "2001-09-11",
    title: "911 事件",
    source: "維基百科「九一一襲擊事件」",
  },
  {
    at: "2003-09-12",
    title: "Steam 服務上線",
    note: "數位發行的起點；台灣普及要再等十年。",
    emphasis: true,
    source: "Valve；維基百科「Steam」",
  },
  {
    at: "2005-11-08",
    title: "《魔獸世界》台港澳上市",
    note: "10/5 公測；代理商智凡迪是智冠子公司。",
    emphasis: true,
    source: "維基百科「智凡迪科技」「魔獸世界」（單一來源）",
  },
  {
    at: "2007-06-29",
    title: "iPhone 發售（美）",
    note: "智慧型手機改寫了日常，也改寫了遊戲的形狀。",
    emphasis: true,
    source: "Apple 新聞稿（1st gen，美國首賣日）",
  },
  {
    at: "1998-03",
    title: "Palm III 上市",
    note: "接續 PalmPilot 的暢銷機；Palm V 隔年。",
    source: "維基百科「Palm III」「Palm V」（單一來源）",
  },
  {
    at: "2002-10",
    title: "《仙境傳說》台灣營運",
    note: "遊戲新幹線代理；6/29 起公測。",
    source: "巴哈姆特哈啦板整理；維基百科「仙境傳說」（未見一手公告）",
  },
  {
    at: "2008-07-10",
    title: "App Store 上線",
    note: "手機遊戲的起點，隨 iPhone OS 2.0 開張。",
    source: "Apple 新聞稿",
  },
  {
    at: "2013-12-18",
    title: "PlayStation 4 台灣上市",
    note: "北美早一個月，11 月 15 日首發。",
    source: "維基百科「PlayStation 4」；SIET 公告",
  },
  {
    at: "2014-09-23",
    title: "Xbox One 台灣上市",
    note: "含 Kinect 版 15,980 元。",
    source: "巴哈姆特 GNN 2014-06（E3 14 微軟公布）",
  },
  {
    at: "2016-03",
    title: "AlphaGo 擊敗李世乭",
    note: "五番棋 4:1；深度學習進入大眾視野。",
    source: "DeepMind；維基百科「AlphaGo 對戰李世乭」",
  },
  {
    at: "2020-11-19",
    title: "PlayStation 5 台灣上市",
    note: "全球首發 11/12，台灣晚一週。",
    source: "PlayStation Blog 2020-09-17",
  },
  {
    at: "2022-11-30",
    title: "ChatGPT 上線",
    note: "生成式 AI 進入日常的起點。",
    source: "OpenAI 部落格",
  },
  {
    at: "1996-10-28",
    title: "巴哈姆特創站",
    note: "台灣第一個電玩 BBS；2000 年轉為網站。",
    source: "維基百科「巴哈姆特電玩資訊站」（單一來源）",
  },
  {
    at: "2000-11-16",
    title: "遊戲基地上線",
    note: "《電腦玩家》的出版社所辦；2004 年流量高峰。",
    source: "維基百科「遊戲基地」（單一來源）",
  },
  {
    at: "2005-02-14",
    title: "YouTube 創站",
    note: "同年 12 月正式營運；影音攻略的開端。",
    source: "維基百科「YouTube」",
  },
  {
    at: "2026-01-08",
    title: "大宇資訊更名光聚晶電聯合",
    note: "遊戲部門留用大宇資訊之名，轉為子公司。",
    source: "巴哈姆特 GNN 2026-01（經濟部核准變更登記）",
  },
];

// ==================== 雜誌事件 ====================

/**
 * 授權與刊期的變動。內容取自各刊 `Magazine.description` 已經寫下的判讀，
 * 出處欄指回那裡——同一件事不在兩個地方各講一次，改的時候只改一邊。
 */
const MAGAZINE: MagazineEventInput[] = [
  {
    magazineSlug: "tvgame-report",
    at: "1993-07-16",
    title: "起見《ファミコン通信》授權中文版標示",
    note: "No.114 封面已標，No.106（1993-03-22）還沒有；標示延續到改名後的《Super Gamer》時期。",
    source: "Magazine.description（電視遊樂報導）",
  },
  {
    magazineSlug: "game-paradise-ex",
    at: "1997-02",
    title: "改版，封面不再標《ファミマガ》授權",
    note: "《Game天堂!》的改版，期號從創刊號重編，刊期由雙週改月刊。授權關係的改變可能正是改版的原因。",
    source: "Magazine.description（Game天堂EX）",
  },
  {
    magazineSlug: "next-tw",
    at: "1998-08-01",
    title: "引進美國《Next Generation》版權創刊",
    note: "協和國際多媒體發行，台灣第一本電腦遊戲半月刊，每月 1 日與 16 日出刊。",
    source: "Magazine.description（次世代遊戲情報）",
  },
  {
    magazineSlug: "next-tw",
    at: "1999-02-25",
    title: "第 14 期起半月刊改月刊",
    source: "Magazine.description（次世代遊戲情報）",
  },
  {
    magazineSlug: "softstar",
    at: "1990",
    title: "第 5 期起月刊改雙月刊",
    note: "第 6 期之後大致每季一期。",
    source: "Magazine.description（軟體之星）",
  },
  {
    magazineSlug: "famitsu-tw",
    at: "2004-10",
    title: "雙週刊改週刊",
    note: "第 22、23 期之間。",
    source: "Magazine.description（電玩通）",
  },
  {
    magazineSlug: "fashion-game",
    at: "1998",
    title: "自《疾風快報》分家",
    note: "部分疾風人員因經營理念不同出走自創；試刊號原名《疾風飛訊》，出版者登記為疾風出版有限公司。",
    source: "〈你我所知道的疾風快報~〉巴哈姆特哈啦板（論壇自述）；國家圖書館期刊指南",
  },
  {
    magazineSlug: "ace",
    at: "1996-11",
    title: "英文名改掛 PC GAMER",
    note: "第 64 期起；62 期封面仍是 ACE，63 期未見。",
    source: "第 62、64 期封面（yuxio 2026-09-08 覆核實物）",
  },
  {
    magazineSlug: "city-boy",
    at: "1993-08",
    title: "改版，後續期數不詳",
    note: "1993 年 6 月發行滿 24 期；創刊時免費贈閱，之後改為收費。",
    source: "Magazine.description（城市少年）",
  },
];

// ==================== 匯出 ====================

/**
 * EDTF 轉成定位用的日期。查不到日期的條目直接丟掉——放不上圖的事件留在陣列裡
 * 只會在畫面某個角落堆成一疊。
 */
function withDates<T extends { at: string }>(items: T[]): (T & { date: Date })[] {
  return items
    .flatMap((item) => {
      const date = edtfSortDate(item.at);
      return date ? [{ ...item, date }] : [];
    })
    .sort((a, b) => a.date.getTime() - b.date.getTime());
}

// ==================== 版面上的關係 ====================

/**
 * 要排在鄰近欄位的刊。**這是版面，不是資料**——放在這裡是因為「哪幾本該挨著」
 * 的理由與事件一樣是編輯判斷，不是資料庫算得出來的東西。
 *
 * 同一組的刊優先排在一起：時間不重疊就共用同一欄（讀起來像一條線的接力），
 * 重疊就落在相鄰的欄。組與組之間不保證順序，剩下的刊照原本的貪心法填空隙。
 */
export const LANE_GROUPS: string[][] = [
  // 同一本日本原刊《ファミリーコンピュータMagazine》的兩次落地：1986 年華泰的
  // 未授權翻印，1994 年尖端的授權中文版。兩段不重疊，會接成同一欄。
  ["huatai-miji", "game-paradise"],
  // 尖端的兩本姊妹刊要挨著；《電視遊樂報導》後期是 ASCII《ファミコン通信》
  // 授權中文版，《電玩通》則是《ファミ通》的中文版，接在同一條脈絡上。
  // 雜誌與報導同時在架，佔兩欄；電玩通晚十年，接在其中一欄後面。
  ["tvgame-magazine", "tvgame-report", "famitsu-tw"],
  // 台灣最後一本單機遊戲雜誌，與十年後那本寫這批雜誌的雜誌。兩段不重疊。
  // 《新遊戲時代》擺在《電腦玩家》右邊：九〇年代中期兩本並存的 PC 遊戲刊，
  // 讀者當年是拿它們互相比較的，分開排就看不出這件事。兩段重疊，佔相鄰兩欄。
  ["ace", "sgm", "retro-game-time"],
  // 智冠的兩本 PC 刊，最後一本併進另一本（2004-09）。並存十三年，佔相鄰兩欄。
  ["swm", "cgw-tw"],
  // 分家：1998 年部分疾風人員出走另創飛訊。兩者並存，會落在相鄰兩欄，
  // 中間由 MAGAZINE_LINKS 那條線接起來。
  ["wolf", "fashion-game"],
  // 青文的電擊系（日本 Media Works 一整個雜誌家族）。三本互相重疊，佔三欄。
  ["dengeki-ss-tw", "dengeki-ps-tw", "dengeki-oh-tw"],
];

export interface MagazineLink {
  /** 從哪一本刊拉出來。 */
  from: string;
  /** 拉到哪一本刊——線畫在被指的那本刊的起點高度。 */
  to: string;
  label: string;
  source: string;
}

/**
 * 刊與刊之間的一次性關係，畫成一條虛線。
 *
 * **與改名（`MagazineTitle`）不同**：改名是同一條刊系內部的事，資料庫有結構；
 * 這裡的是兩條刊系之間的關係，模型沒有欄位，而且每一條的性質都不一樣，
 * 不值得為了三五筆長一張表。
 */
export const MAGAZINE_LINKS: MagazineLink[] = [
  {
    from: "wolf",
    to: "fashion-game",
    label: "分家",
    source: "〈你我所知道的疾風快報~〉巴哈姆特哈啦板（論壇自述）；國圖記飛訊出版者為疾風出版有限公司",
  },
];

export const EXTERNAL_EVENTS: ExternalEvent[] = withDates(EXTERNAL);
export const MAGAZINE_EVENTS: MagazineEvent[] = withDates(MAGAZINE);
