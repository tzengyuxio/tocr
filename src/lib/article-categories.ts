/**
 * The controlled vocabulary for an article's column type.
 *
 * Stored as a key, shown in Chinese: the wording was revised twice, and each
 * revision needed a data migration while the label was the stored value. One
 * source for the OCR prompt and the editing UI, which drifted apart once and
 * left the same column recorded under several names.
 */
/**
 * Declared here rather than imported from @prisma/client: this module is used
 * by client components, and the generated client is a server runtime. A test
 * asserts the two lists stay in step.
 */
export const ARTICLE_CATEGORY_VALUES = [
  "FEATURE",
  "PREVIEW",
  "REVIEW",
  "WALKTHROUGH",
  "NEWS",
  "INTERVIEW",
  "HARDWARE",
  "COMIC",
  "RANKING",
  "RELEASE_SCHEDULE",
  "READER",
  "SERIAL",
  "OTHER",
] as const;

export type ArticleCategory = (typeof ARTICLE_CATEGORY_VALUES)[number];

export interface ArticleCategoryOption {
  value: ArticleCategory;
  label: string;
  /** Shown to the model so it can tell neighbouring categories apart. */
  hint: string;
}

export const ARTICLE_CATEGORIES: ArticleCategoryOption[] = [
  {
    value: "FEATURE",
    label: "特輯",
    hint: "大篇幅主題報導，如專題企劃、封面物語、專題報導",
  },
  {
    value: "PREVIEW",
    label: "新作預覽",
    hint: "尚未上市作品的搶先介紹，如「先睹為快」「遊戲情報網」「每月新Game」",
  },
  {
    value: "REVIEW",
    label: "遊戲評測",
    hint: "已上市作品的評分與評論，如「遊戲評析」「新片評鑑」「比較評論」",
  },
  {
    value: "WALKTHROUGH",
    label: "攻略",
    hint: "遊戲攻略、密技、過關法",
  },
  { value: "NEWS", label: "新聞", hint: "業界消息、新作發表" },
  {
    value: "INTERVIEW",
    label: "訪談",
    hint: "製作人或業界人士專訪",
  },
  {
    value: "HARDWARE",
    label: "硬體",
    hint: "主機、周邊設備介紹",
  },
  { value: "COMIC", label: "漫畫", hint: "漫畫作品，如「漫畫街」" },
  { value: "RANKING", label: "排行榜", hint: "銷售或人氣排行" },
  {
    value: "RELEASE_SCHEDULE",
    label: "預定發售表",
    hint: "近期發售預定一覽",
  },
  {
    value: "READER",
    label: "讀者投稿",
    hint: "讀者來信、投稿園地、意見調查",
  },
  { value: "SERIAL", label: "連載", hint: "分期連載的文字專欄" },
  {
    value: "OTHER",
    label: "其他",
    hint: "無法歸類的欄目，如編輯室手記",
  },
];

const LABELS = new Map(ARTICLE_CATEGORIES.map((c) => [c.value, c.label]));

/** Falls back to the raw key so an unmapped value is visible, not blank. */
export function categoryLabel(
  category: ArticleCategory | null | undefined
): string {
  if (!category) return "";
  return LABELS.get(category) ?? category;
}

export function isArticleCategory(value: unknown): value is ArticleCategory {
  return (
    typeof value === "string" &&
    (ARTICLE_CATEGORY_VALUES as readonly string[]).includes(value)
  );
}
