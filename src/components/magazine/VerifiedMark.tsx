/** 圖示佔紅框的比例，以及讓它置中的平移量（viewBox 是 24）。 */
const ICON_SCALE = 0.78;
const ICON_OFFSET = (24 - 24 * ICON_SCALE) / 2;

/**
 * 資料校訂過的那枚小印。
 *
 * **整枚印是一個 SVG**：紅底方塊與圖示在同一個座標系裡，圖示先縮放再置中平移，
 * 所以任何尺寸都同心。先前是「flex 盒子裝一個百分比大小的 icon」，算出來的邊
 * 長是小數（例如 13.92px），子像素一進位就偏一格，越小越明顯。
 *
 * 用圖示不用漢字「校」：那要靠楷體才像印章，而**楷體在網頁上拿不到**——Safari
 * 只把一份固定的系統字體清單暴露給網頁（反指紋追蹤），楷體在 macOS 是可下載的
 * 選配字體、不在清單裡；改自帶子集字體又被 Tailwind 的 CSS 管線把 @font-face
 * 整條丟掉。圖示不需要任何字體，各瀏覽器畫出來都一樣。
 *
 * 尺寸用 em，**跟著旁邊那行字縮放**：標題旁 0.62em、卡片 0.9em（卡片的字本來
 * 就小，同一個比例會縮到看不出形狀）。呼叫端要確保這個元素落在正確的字級脈絡
 * 裡——它繼承的是父層字級，不是視覺上鄰接的那行字。
 *
 * 尺寸走 inline style 不走 `h-[0.9em]` 這種任意值類別：那類別要 Tailwind 掃到
 * 才會產生 CSS，而寫在呼叫端的 `0.9em` 沒被產生過——類別掛上去了、規則不存在，
 * SVG 於是攤成預設大小（實測 160px）。
 *
 * 二態，不是後台那三態：核對過就標，其餘一律不標。「完備・已變更」是內部待辦，
 * 讀者看到只會困惑；沒有標記也不需要解釋——沒標不代表有錯。三態的那一個在
 * components/magazine/CompleteBadge.tsx，只給後台用。
 */
export function VerifiedMark({
  verified,
  sizeEm = 0.62,
  className,
}: {
  verified: boolean;
  /** 邊長，單位是 em——相對於它所在的字級。 */
  sizeEm?: number;
  className?: string;
}) {
  if (!verified) return null;

  return (
    <svg
      viewBox="0 0 24 24"
      role="img"
      aria-label="資料已校訂"
      style={{ width: `${sizeEm}em`, height: `${sizeEm}em` }}
      className={`inline-block shrink-0 align-middle${className ? ` ${className}` : ""}`}
    >
      <title>資料已校訂</title>
      <rect width="24" height="24" className="fill-red-600" />
      {/* 翻開的書＋勾（lucide 的 book-open-check，ISC）。純勾在小尺寸會被讀成
          「已完成」的核取方塊，而這裡說的是「這一期的著錄校訂過」。 */}
      <g
        transform={`translate(${ICON_OFFSET} ${ICON_OFFSET}) scale(${ICON_SCALE})`}
        fill="none"
        className="stroke-white"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 21V7" />
        <path d="m16 12 2 2 4-4" />
        <path d="M22 6V4a1 1 0 0 0-1-1h-5a4 4 0 0 0-4 4 4 4 0 0 0-4-4H3a1 1 0 0 0-1 1v13a1 1 0 0 0 1 1h6a3 3 0 0 1 3 3 3 3 0 0 1 3-3h6a1 1 0 0 0 1-1v-1.3" />
      </g>
    </svg>
  );
}
