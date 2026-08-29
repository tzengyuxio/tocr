import { sortTitlePeriods } from "./magazine-title";

/** 與 components/magazine/MagazineGallery 的 GalleryImage 同形。 */
export interface GalleryImage {
  url: string;
  note?: string;
}

export interface GalleryTitlePeriod {
  title: string;
  logoImage: string | null;
  startIssue: { order: number };
}

export interface MagazineGalleryInput {
  name: string;
  logoImage: string | null;
  photos: string[];
  titles: GalleryTitlePeriod[];
  /** 一張刊頭都沒有時頂替的最早一期封面；見刊系頁的說明。 */
  standIn?: { url: string; note: string } | null;
}

/**
 * 刊系頁那一欄要放的圖，與進頁時停在第幾張。
 *
 * 改過名的刊有不只一個刊頭，順序照時期的先後排——讀者看到的是這本刊長相的演變，
 * 而不是一疊沒有前後關係的圖。但**進來時停在代表圖**：那是這本刊現在的名字，
 * 開在創刊期的舊名上會讓人以為找錯了刊。
 *
 * `Magazine.logoImage` 沒有欄位說它屬於哪個時期，用 `Magazine.name` 去比對——
 * 正題名就是主要時期的名字。比對不到（刊名全改過、或 titles 沒建齊）就排第一，
 * 那也是它在沒有 titles 時的位置。
 */
export function buildMagazineGallery(input: MagazineGalleryInput): {
  images: GalleryImage[];
  initialIndex: number;
} {
  const mastheads: GalleryImage[] = [];
  let initialIndex = 0;
  let claimed = false;

  for (const period of sortTitlePeriods(input.titles)) {
    // 同名時期一旦有自己的刊頭，就由它代表這個時期，代表圖不再另外出現一次：
    // 兩張同時期的刊頭並排，讀者無從判斷差在哪。
    const isNamesake = period.title === input.name;
    const url = period.logoImage ?? (isNamesake ? input.logoImage : null);
    if (!url) continue;
    if (isNamesake) {
      claimed = true;
      initialIndex = mastheads.length;
    }
    mastheads.push({ url, note: `${period.title} 刊頭` });
  }

  // 代表圖沒被任何時期認領：刊名全改過、或 titles 沒建齊。
  if (input.logoImage && !claimed) {
    mastheads.unshift({ url: input.logoImage, note: `${input.name} 刊頭` });
    initialIndex = 0;
  }

  // 只有一張刊頭就不標 note：沒有第二張要跟它區分，寫上刊名只是重複頁首。
  // 四十本沒有 titles 的刊走的是這條，顯示與加這個功能之前一樣。
  if (mastheads.length === 1) delete mastheads[0].note;

  const images = mastheads.length ? mastheads : input.standIn ? [input.standIn] : [];
  images.push(...input.photos.map((url) => ({ url, note: "藏書照" })));
  return { images, initialIndex };
}
