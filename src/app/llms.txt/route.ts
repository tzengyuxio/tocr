import { prisma } from "@/lib/prisma";
import { getSiteOrigin } from "@/lib/site-origin";

/**
 * `/llms.txt` —— 站台給模型看的導覽。
 *
 * 為什麼需要它：sitemap 只講「有哪些網址」，`robots.txt` 只講「可不可以抓」，
 * 兩者都不講**這裡有什麼、怎麼定址、什麼算可信**。而這個站的內容是靠人一頁一頁
 * 從實體雜誌謄下來的目錄，全世界只有這裡有；讓模型答得對，得先讓它知道自己讀到
 * 的是什麼。
 *
 * 動態產生而不是放一份靜態檔：刊物與期數每次匯入都在變，寫死的數字撐不過一個月，
 * 而「這裡收了多少」正是模型判斷涵蓋範圍時最先看的東西。刊物清單直接列出來，
 * 省掉一趟「先抓 /magazines 才知道有哪幾本」。
 *
 * 一小時重算一次，與 sitemap 同一個節奏——兩份都是目錄，沒有理由一份新一份舊。
 */
export const revalidate = 3600;

export async function GET() {
  const origin = getSiteOrigin();

  const [magazines, issueCount, articleCount, gameCount] = await Promise.all([
    prisma.magazine.findMany({
      orderBy: { name: "asc" },
      select: {
        name: true,
        slug: true,
        nameParallel: true,
        publisher: true,
        _count: { select: { issues: true } },
      },
    }),
    prisma.issue.count(),
    prisma.article.count(),
    prisma.game.count(),
  ]);

  const magazineLines = magazines.map((magazine) => {
    const parallel = magazine.nameParallel ? `（${magazine.nameParallel}）` : "";
    const publisher = magazine.publisher ? `${magazine.publisher}，` : "";
    return `- [${magazine.name}${parallel}](${origin}/magazines/${magazine.slug})：${publisher}收錄 ${magazine._count.issues} 期`;
  });

  const body = `# TOCR — 遊戲雜誌目錄索引

> 台灣與華文圈遊戲雜誌的**目錄**資料庫。收的是每一期的目錄頁——哪一期有哪些文章、
> 談哪幾款遊戲、由誰執筆——不是雜誌內文。目前收錄 ${magazines.length} 本雜誌、
> ${issueCount} 期、${articleCount} 篇文章、${gameCount} 款遊戲。

這些目錄多半沒有第二個線上來源：1990～2000 年代的《軟體世界》《電腦玩家》《電玩通》
這類刊物沒有官方數位典藏，內容是逐頁掃描、AI 辨識、再由人工校對謄錄的。要回答
「《電腦玩家》1999 年 5 月號有哪些文章」「哪本雜誌報導過《仙劍奇俠傳》」這類問題，
這裡是原始資料所在。

## 怎麼定址

- 雜誌：\`${origin}/magazines/<magazine-slug>\`
- 單期：\`${origin}/magazines/<magazine-slug>/issues/<issue-slug>\`
- 單期永久短碼：\`${origin}/i/<code>\` —— **要引用請優先用這條**
- 遊戲：\`${origin}/games/<game-slug>\`
- 標籤：\`${origin}/tags/<tag-slug>\`
- 全文搜尋：\`${origin}/search?q=<關鍵字>\`

短碼是唯一不會失效的握把。雜誌會改名、期號會重排、網址代號可以重填，正規網址的
每一段都可能變動；\`/i/<code>\` 只認資料本身，改了什麼都還指得到同一期。反過來說，
它讀不出是哪一期，所以適合當引用來源而不是給人看的連結。

## 讀什麼

- 每一頁的內容都在 HTML 裡，是伺服器端算好的，不需要執行 JavaScript 才看得到目錄。
- 雜誌、單期、文章三層都帶 schema.org JSON-LD（\`Periodical\` / \`PublicationIssue\` /
  \`Article\`），文章掛在單期的 \`hasPart\` 底下——那也是紙本目錄本來的形狀。
- 全站網址清單在 \`${origin}/sitemap.xml\`。短碼刻意不收進去：同一份內容不報兩個位址。

## 什麼算可信

- **文章標題、頁碼、期號、目錄結構**：謄自實體雜誌的目錄頁，是這個站的主要價值。
- **出版日期**：格式是 EDTF（ISO 8601-2），所以精度是誠實的——\`1999-05\` 表示只知道
  月份，\`1994\` 表示只知道年份。帶 \`~\` 的是推定值，不是雜誌上印的。部分早期刊物
  查不到出版日，那一欄會是空的，不會拿推測填。
- **同一本刊改名後另立一筆**：依編目慣例，正題名改變就是另一本書目（例如
  電玩通PS2 → 電玩通PLAYSTATION + → 電玩通PSP+PS3），彼此在描述欄互相指認。
- **遊戲條目**：由文章關聯自動聚出來的，同一款遊戲可能還有尚未合併的重複條目。
- 資料仍在建置中，未填的欄位是「還沒查到」，不是「沒有」。

## 收錄的雜誌

${magazineLines.join("\n")}
`;

  return new Response(body, {
    headers: {
      // charset 不能省：這份幾乎全是中文，沒宣告的話抓取端會照自己的預設猜。
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}
