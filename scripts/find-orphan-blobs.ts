/**
 * 列出 blob store 裡沒有任何資料列指向的圖。
 *
 * 換過的圖不會自己消失：`/api/upload` 每次都產新檔名，欄位改指新網址之後舊檔就
 * 留在 store 裡。本機測試上傳的垃圾檔也一樣（`.env.local` 的 token 指向正式站
 * 那個 store）。逐次手記換掉了哪幾張不是辦法——會漏，而漏掉的沒有第二份記錄。
 *
 * **這支只列清單，不刪任何東西。** Vercel Blob 沒有版本歷史，刪掉就是刪掉，而
 * 圖片鏡像是每週一跑的增量，剛上傳又剛被判為孤兒的檔案可能還沒進備份。
 *
 * ⚠️ **資料庫與 store 必須是同一個環境**。`.env.local` 的 `BLOB_READ_WRITE_TOKEN`
 * 指向正式站那個 store，而 `DATABASE_URL` 指向本機的 dev 庫——那樣算出來的「孤兒」
 * 其實是正式站正在用的圖。所以 `DATABASE_URL` 指著 localhost 時預設拒跑。
 *
 * 用法：npx tsx --env-file=.env.local scripts/find-orphan-blobs.ts
 *      npx tsx --env-file=.env.local scripts/find-orphan-blobs.ts --allow-local-db
 */
import { list } from "@vercel/blob";
import { prisma } from "../src/lib/prisma";

/**
 * 每一個存得下 blob 網址的欄位。
 *
 * 漏掉一欄的代價是把還在用的圖報成孤兒，所以這份清單寧可多不可少：`users.image`
 * 多半是 OAuth 頭像那種外部網址，對不上任何 blob，列進來也只是白比一次。
 *
 * backlog 當初只點名了期刊與單期那四欄，但 `games.cover_image` 與
 * `ocr_records.image_url` 同樣存網址——少了它們，遊戲封面與辨識過的目錄圖會整批
 * 被誤判。
 */
async function referencedUrls(): Promise<string[]> {
  const [magazines, issues, photos, games, ocrRecords, users] = await Promise.all([
    prisma.magazine.findMany({ select: { logoImage: true } }),
    prisma.issue.findMany({ select: { coverImage: true, tocImages: true } }),
    // 額外圖片。原本是 magazines.photos 那一欄，2026-08-31 起自己一張表，
    // 而且掛得到單期——漏掉它會把整批藏書照與佐證圖報成孤兒。
    prisma.photo.findMany({ select: { url: true } }),
    prisma.game.findMany({ select: { coverImage: true } }),
    prisma.ocrRecord.findMany({ select: { imageUrl: true } }),
    prisma.user.findMany({ select: { image: true } }),
  ]);

  return [
    ...magazines.map((m) => m.logoImage),
    ...issues.flatMap((i) => [i.coverImage, ...i.tocImages]),
    ...photos.map((p) => p.url),
    ...games.map((g) => g.coverImage),
    ...ocrRecords.map((r) => r.imageUrl),
    ...users.map((u) => u.image),
  ].filter((url): url is string => Boolean(url));
}

/**
 * 網址 → store 裡的路徑。
 *
 * 比對走路徑而不是整條網址：同一個 blob 的網址帶不帶查詢字串、走哪個網域都可能
 * 不同，路徑才是它在 store 裡的身分。認不得的（`data:`、外部網址）回 null。
 */
function toPathname(url: string): string | null {
  try {
    return decodeURIComponent(new URL(url).pathname.replace(/^\//, "")) || null;
  } catch {
    return null;
  }
}

/** store 裡的每一個 blob，跟著 cursor 走到底。 */
async function listBlobs() {
  const blobs: { pathname: string; size: number; uploadedAt: Date }[] = [];
  let cursor: string | undefined;
  do {
    const page = await list({ cursor, limit: 1000 });
    blobs.push(
      ...page.blobs.map((b) => ({
        pathname: b.pathname,
        size: b.size,
        uploadedAt: b.uploadedAt,
      }))
    );
    cursor = page.cursor;
  } while (cursor);
  return blobs;
}

function mb(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/**
 * 本機資料庫配上正式站的 store，會把正式站在用的圖全部報成孤兒。
 *
 * 這支的輸出就是「準備刪掉的清單」，所以錯的清單比沒有清單更危險——寧可擋下來，
 * 要看機制跑不跑得動再自己加旗標。
 */
function assertSameEnvironment() {
  const url = process.env.DATABASE_URL ?? "";
  const isLocal = /@(localhost|127\.0\.0\.1)/.test(url);
  if (isLocal && !process.argv.includes("--allow-local-db")) {
    throw new Error(
      "DATABASE_URL 指向本機資料庫，但 blob store 多半是正式站那個。\n" +
        "兩邊不同環境時，算出來的孤兒清單是錯的。\n" +
        "只是想看腳本跑不跑得動的話，加上 --allow-local-db。"
    );
  }
}

async function main() {
  assertSameEnvironment();
  const [blobs, urls] = await Promise.all([listBlobs(), referencedUrls()]);

  const referenced = new Set(
    urls.map(toPathname).filter((p): p is string => p !== null)
  );
  const inStore = new Set(blobs.map((b) => b.pathname));

  const orphans = blobs
    .filter((b) => !referenced.has(b.pathname))
    .sort((a, b) => a.pathname.localeCompare(b.pathname));

  console.log(
    `store ${blobs.length} 個物件，資料庫指向 ${referenced.size} 個路徑\n`
  );

  if (orphans.length === 0) {
    console.log("沒有孤兒圖。");
  } else {
    console.log(`孤兒 ${orphans.length} 個，共 ${mb(orphans.reduce((n, b) => n + b.size, 0))}：\n`);
    for (const blob of orphans) {
      const uploaded = blob.uploadedAt.toISOString().slice(0, 10);
      console.log(`  ${blob.pathname}  ${mb(blob.size)}  ${uploaded}`);
    }
  }

  // 反向的那一半：資料列指著 store 裡沒有的路徑，也就是壞掉的圖。同一組資料算得
  // 出來，而它是另一種問題——孤兒是留著沒人用，這是有人用但東西不在。
  const missing = [...referenced].filter((p) => !inStore.has(p)).sort();
  if (missing.length > 0) {
    console.log(`\n資料庫指向但 store 裡沒有的路徑 ${missing.length} 個：\n`);
    for (const pathname of missing) console.log(`  ${pathname}`);
  }

  console.log("\n這支腳本不刪除任何東西。刪之前先確認備份涵蓋得到。");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
