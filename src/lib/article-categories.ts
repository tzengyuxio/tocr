/**
 * The controlled vocabulary for a article's column type.
 *
 * One source for both the OCR prompt and the editing UI: the two drifted apart
 * once already, leaving the same column recorded under several names.
 */
export interface ArticleCategory {
  value: string;
  /** Shown to the model, and as the option's hint in the UI. */
  hint: string;
}

export const ARTICLE_CATEGORIES: ArticleCategory[] = [
  { value: "特輯", hint: "大篇幅主題報導，如專題企劃、封面物語、專題報導" },
  {
    value: "新作預覽",
    hint: "尚未上市作品的搶先介紹，如「先睹為快」「遊戲情報網」「每月新Game」",
  },
  {
    value: "遊戲評測",
    hint: "已上市作品的評分與評論，如「遊戲評析」「新片評鑑」「比較評論」",
  },
  { value: "攻略", hint: "遊戲攻略、密技、過關法" },
  { value: "新聞", hint: "業界消息、新作發表" },
  { value: "訪談", hint: "製作人或業界人士專訪" },
  { value: "硬體", hint: "主機、周邊設備介紹" },
  { value: "漫畫", hint: "漫畫作品，如「漫畫街」" },
  { value: "排行榜", hint: "銷售或人氣排行" },
  { value: "預定發售表", hint: "近期發售預定一覽" },
  { value: "讀者投稿", hint: "讀者來信、投稿園地、意見調查" },
  { value: "連載", hint: "分期連載的文字專欄" },
  { value: "其他", hint: "無法歸類的欄目，如編輯室手記" },
];

export const CATEGORY_VALUES = ARTICLE_CATEGORIES.map((c) => c.value);

export function isKnownCategory(value: string | null | undefined): boolean {
  return !!value && CATEGORY_VALUES.includes(value);
}
