/**
 * 把《電玩通》封底裡的「遊戲索引」轉錄成 data/famitsu-game-index.csv 的列。
 *
 * 那一頁是編輯部自己統一過的譯名表（頁上註明「均為編輯部參考各式相關資料後研討
 * 做成」），所以它是 `Game.name` 與 `PLATFORM` 標籤的基準，不是目錄頁的報導標題。
 * 欄位與用法見 README 的「data/famitsu-game-index.csv」。
 *
 * **不走 /api/ocr**：那條路是拿目錄頁餵 TOC_EXTRACTION_PROMPT，索引頁送進去會被
 * 當成目錄，每一列生出一篇假文章（VOL.181 生了 62 篇）。這裡直接打 OPENAI_BASE_URL
 * 指的那個端點，用索引頁自己的提示詞。
 *
 * 用法：
 *   npx tsx --env-file=.env.local scripts/read-game-index.ts <c3.jpg> <期號>
 *
 * 印出 CSV 列到 stdout，**不自己接到檔案後面**——索引雖然是平鋪清單、辨識比目錄頁
 * 可靠，仍要人對過圖再貼進去。JPEG 才行，自架後端解不開 WebP。
 */
import { readFileSync } from "fs";
import OpenAI from "openai";

const PROMPT = `這是台灣《電玩通週刊》封底裡的「遊戲索引」頁。請逐列轉錄，不要摘要、不要合併、不要補充頁上沒有的東西。

頁面依平台分區，每一區有一條色帶標題（如 PlayStation2、NINTENDO DS、Xbox 360、Wii、ARCADE），底下每一列是「遊戲名稱」加右側的頁碼。有些區分成左右兩欄，兩欄都要讀。

以 JSON 回答，形狀如下，不要加任何說明文字：
{"sections":[{"platform":"色帶上印的字，原樣照抄","games":[{"name":"遊戲名稱，原樣照抄（包含（暫定）與未翻譯的日文原名）","pages":[32,66]}]}]}

注意：
- 同一列印成「32、66」時，pages 寫成 [32, 66]
- 平台欄頭照印的大小寫抄，不要正規化（PlayStation2 與 PLAYSTATION3 是兩種印法）
- 頁碼是整數，不要補前導零`;

/**
 * 補上沒有收尾的括號。
 *
 * 自架後端答完最後一列之後就停了，`finish_reason` 說 `stop`，但結尾少一個 `}`
 * 並拖著一長串空白（VOL.184 每次都一樣）。少的是收尾，資料本身是完整的——直接
 * 解析會得到一個看起來像模型亂答的語法錯誤。只補結尾，字串內的括號不算。
 */
function closeBrackets(json: string): string {
  const stack: string[] = [];
  let inString = false;
  let escaped = false;
  for (const ch of json) {
    if (escaped) { escaped = false; continue; }
    if (ch === "\\") { escaped = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === "{" || ch === "[") stack.push(ch);
    else if (ch === "}" || ch === "]") stack.pop();
  }
  return json + stack.reverse().map((ch) => (ch === "{" ? "}" : "]")).join("");
}

const [file, issue] = process.argv.slice(2);

async function main() {
  if (!file || !issue) {
    console.error("用法：read-game-index.ts <c3.jpg> <期號>");
    process.exitCode = 1;
    return;
  }

  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: process.env.OPENAI_BASE_URL,
  });

  const base64 = readFileSync(file).toString("base64");

  // 與 openai.provider.ts 同一組設定：temperature 0（轉錄只有一個正確答案），
  // 串流（自架後端在 Cloudflare 後面，100 秒上限會把長回應攔腰切掉）。
  const stream = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4o",
    max_tokens: Number(process.env.OPENAI_MAX_TOKENS) || 8192,
    temperature: 0,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: { url: `data:image/jpeg;base64,${base64}`, detail: "high" },
          },
          { type: "text", text: PROMPT },
        ],
      },
    ],
    stream: true,
  });

  let content = "";
  let finishReason: string | null = null;
  for await (const chunk of stream) {
    const choice = chunk.choices[0];
    if (!choice) continue;
    content += choice.delta?.content ?? "";
    if (choice.finish_reason) finishReason = choice.finish_reason;
  }

  // 說出來，不要讓截斷的回應以 JSON 解析錯誤的面目出現——那個訊息看起來像模型
  // 亂答，實際上是答對了但被切掉。`length` 是撞到 max_tokens，調 OPENAI_MAX_TOKENS。
  if (finishReason && finishReason !== "stop") {
    console.error(`模型的回應沒有正常結束（finish_reason=${finishReason}）`);
    console.error(content);
    process.exitCode = 1;
    return;
  }

  const json = content.match(/```json\n?([\s\S]*?)\n?```/)?.[1] ?? content;
  const parsed = JSON.parse(closeBrackets(json.trim())) as {
    sections: { platform: string; games: { name: string; pages: number[] }[] }[];
  };

  for (const section of parsed.sections) {
    for (const game of section.games) {
      // platform_tag 留空：對應到站上哪個 PLATFORM 標籤是人的判斷，而且新平台
      // （PS Vita、3DS、Wii U…）第一次出現時本來就要決定叫什麼。
      console.log(
        [issue, section.platform, "", game.name, game.pages.join(";")].join(",")
      );
    }
  }
}

main();
