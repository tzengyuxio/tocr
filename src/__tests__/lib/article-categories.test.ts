/**
 * @jest-environment node
 */
import { ArticleCategory as PrismaArticleCategory } from "@prisma/client";
import {
  ARTICLE_CATEGORIES,
  ARTICLE_CATEGORY_VALUES,
  categoryLabel,
  isArticleCategory,
} from "@/lib/article-categories";

describe("the category list", () => {
  // The keys are declared by hand so client components do not pull in the
  // generated Prisma client; nothing but this test keeps the two in step.
  it("matches the enum the column actually accepts", () => {
    expect([...ARTICLE_CATEGORY_VALUES].sort()).toEqual(
      Object.values(PrismaArticleCategory).sort()
    );
  });

  it("gives every key a label and a hint", () => {
    expect(ARTICLE_CATEGORIES.map((c) => c.value)).toEqual([
      ...ARTICLE_CATEGORY_VALUES,
    ]);
    for (const category of ARTICLE_CATEGORIES) {
      expect(category.label).not.toBe("");
      expect(category.hint).not.toBe("");
    }
  });
});

describe("categoryLabel", () => {
  it("shows the Chinese name", () => {
    expect(categoryLabel("REVIEW")).toBe("遊戲評測");
    expect(categoryLabel("RELEASE_SCHEDULE")).toBe("預定發售表");
  });

  it("renders nothing for an unset category", () => {
    expect(categoryLabel(null)).toBe("");
    expect(categoryLabel(undefined)).toBe("");
  });
});

describe("isArticleCategory", () => {
  it("accepts a key and rejects anything else", () => {
    expect(isArticleCategory("PREVIEW")).toBe(true);
    // The label is not the key -- this is the mistake the enum exists to stop.
    expect(isArticleCategory("新作預覽")).toBe(false);
    expect(isArticleCategory("")).toBe(false);
    expect(isArticleCategory(null)).toBe(false);
  });
});
