/**
 * 把一段文字切成「文字」與「網址」兩種片段，好讓呼叫端把後者渲染成連結。
 *
 * 這裡只認寫全的 `http://` 與 `https://`——裸網域（`gnn.gamer.com.tw`）不算。
 * 描述裡出現的網域多半是被談論的對象而不是要點開的東西，猜錯的代價是把一段
 * 普通文字變成壞掉的連結。
 *
 * **難的不是找出網址，是決定它在哪裡結束**。這些欄位是中文寫的，網址後面幾乎
 * 一定跟著全形標點或中文：`（https://例）；該篇另載……`。用 `\S+` 抓，整串
 * 全形括號、分號與後面的中文都會被收進 href。所以比對時就把 CJK 與全形字元
 * 排除在外，再從尾端剝掉半形的句讀。
 */

// 網址裡不會出現的字：CJK 標點與假名、漢字、全形英數與符號。
const NOT_IN_URL = "\\u3000-\\u30ff\\u3400-\\u4dbf\\u4e00-\\u9fff\\uff00-\\uffef";
const URL_PATTERN = new RegExp(`https?://[^\\s${NOT_IN_URL}]+`, "g");

/** 句子的標點，不是網址的一部分。 */
const TRAILING_PUNCTUATION = ".,;:!?'\"";

function occurrences(text: string, character: string): number {
  let n = 0;
  for (const c of text) if (c === character) n += 1;
  return n;
}

/**
 * 剝掉黏在網址尾巴的句讀。
 *
 * 右括號要數過才能剝：`https://例/a_(b)` 的括號是網址自己的，而
 * `（見 https://例/a）` 的不是。左右數量對不上時，多出來的那個才是句子的。
 */
function trimTrailing(url: string): string {
  let end = url.length;
  for (; end > 0; ) {
    const last = url[end - 1];
    if (TRAILING_PUNCTUATION.includes(last)) {
      end -= 1;
      continue;
    }
    const kept = url.slice(0, end);
    if (last === ")" && occurrences(kept, ")") > occurrences(kept, "(")) {
      end -= 1;
      continue;
    }
    break;
  }
  return url.slice(0, end);
}

export interface Segment {
  type: "text" | "link";
  value: string;
}

/**
 * 依序回傳文字與網址片段。沒有網址時就是一個文字片段；空字串回空陣列，
 * 呼叫端因此不必為「什麼都沒有」多寫一個分支。
 */
export function splitLinks(text: string): Segment[] {
  const segments: Segment[] = [];
  let cursor = 0;

  for (const match of text.matchAll(URL_PATTERN)) {
    const url = trimTrailing(match[0]);
    // 全是標點的「網址」不存在，但整串被剝光時 url 會是空的，跳過比較安全。
    if (!url) continue;

    const start = match.index;
    if (start > cursor) {
      segments.push({ type: "text", value: text.slice(cursor, start) });
    }
    segments.push({ type: "link", value: url });
    cursor = start + url.length;
  }

  if (cursor < text.length) {
    segments.push({ type: "text", value: text.slice(cursor) });
  }

  return segments;
}

/**
 * 網址的顯示形式。點得開的仍是原網址，這裡只管畫面上那一行有多長。
 *
 * 這些欄位裡的網址是出處而不是內容，讀者要的是「這條連到哪個站」，不是把
 * 商品編號讀完。留下網域與路徑的開頭就夠認人，尾巴截掉——不截的話，一條
 * 露天商品頁就能把整個側欄撐出水平捲軸。
 */
export function shortenUrl(url: string, max = 32): string {
  const bare = url
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/$/, "");
  return bare.length <= max ? bare : `${bare.slice(0, max - 1)}…`;
}
