import {
  articleCreateSchema,
  articleUpdateSchema,
  articleBatchCreateSchema,
} from "@/lib/validators/article";

describe("articleCreateSchema", () => {
  it("should validate a valid article with required fields", () => {
    const input = {
      issueId: "issue-123",
      title: "遊戲評測：薩爾達傳說",
    };
    const result = articleCreateSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.issueId).toBe("issue-123");
      expect(result.data.title).toBe("遊戲評測：薩爾達傳說");
      expect(result.data.authors).toEqual([]); // default value
      expect(result.data.sortOrder).toBe(0); // default value
    }
  });

  it("should validate a complete article with all fields", () => {
    const input = {
      issueId: "issue-123",
      title: "遊戲評測：薩爾達傳說",
      subtitle: "王國之淚完整攻略",
      authors: ["王小明", "李大華"],
      category: "遊戲評測",
      pageStart: 10,
      pageEnd: 25,
      summary: "本期封面故事",
      content: "詳細評測內容...",
      sortOrder: 1,
    };
    const result = articleCreateSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).toBe("遊戲評測：薩爾達傳說");
      expect(result.data.authors).toEqual(["王小明", "李大華"]);
      expect(result.data.pageStart).toBe(10);
      expect(result.data.pageEnd).toBe(25);
    }
  });

  it("should fail when issueId is empty", () => {
    const input = {
      issueId: "",
      title: "測試文章",
    };
    const result = articleCreateSchema.safeParse(input);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("期數 ID 為必填");
    }
  });

  it("should fail when title is empty", () => {
    const input = {
      issueId: "issue-123",
      title: "",
    };
    const result = articleCreateSchema.safeParse(input);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("標題為必填");
    }
  });

  it("should coerce pageStart from string to number", () => {
    const input = {
      issueId: "issue-123",
      title: "測試文章",
      pageStart: "15",
    };
    const result = articleCreateSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.pageStart).toBe(15);
    }
  });

  it("should coerce sortOrder from string to number", () => {
    const input = {
      issueId: "issue-123",
      title: "測試文章",
      sortOrder: "5",
    };
    const result = articleCreateSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.sortOrder).toBe(5);
    }
  });

  it("should fail when pageStart is negative", () => {
    const input = {
      issueId: "issue-123",
      title: "測試文章",
      pageStart: -1,
    };
    const result = articleCreateSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("should fail when pageStart is zero", () => {
    const input = {
      issueId: "issue-123",
      title: "測試文章",
      pageStart: 0,
    };
    const result = articleCreateSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("should accept null for optional fields", () => {
    const input = {
      issueId: "issue-123",
      title: "測試文章",
      subtitle: null,
      category: null,
      pageStart: null,
      pageEnd: null,
      summary: null,
      content: null,
    };
    const result = articleCreateSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it("should validate multiple authors", () => {
    const input = {
      issueId: "issue-123",
      title: "測試文章",
      authors: ["作者1", "作者2", "作者3"],
    };
    const result = articleCreateSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.authors).toHaveLength(3);
    }
  });
});

describe("articleUpdateSchema", () => {
  it("should validate partial updates", () => {
    const input = {
      title: "新標題",
    };
    const result = articleUpdateSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it("should allow empty object", () => {
    const input = {};
    const result = articleUpdateSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it("should not include issueId in update schema", () => {
    const input = {
      issueId: "new-issue-id",
      title: "新標題",
    };
    const result = articleUpdateSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      // issueId should be stripped/ignored
      expect(result.data).not.toHaveProperty("issueId");
    }
  });

  it("should validate authors update only", () => {
    const input = {
      authors: ["新作者"],
    };
    const result = articleUpdateSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.authors).toEqual(["新作者"]);
    }
  });
});

describe("articleBatchCreateSchema", () => {
  it("should validate a batch of articles", () => {
    const input = {
      issueId: "issue-123",
      articles: [
        { title: "文章1", pageStart: 1 },
        { title: "文章2", pageStart: 10 },
        { title: "文章3", pageStart: 20 },
      ],
    };
    const result = articleBatchCreateSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.articles).toHaveLength(3);
    }
  });

  it("should validate articles with suggested games and tags", () => {
    const input = {
      issueId: "issue-123",
      articles: [
        {
          title: "薩爾達傳說評測",
          pageStart: 10,
          suggestedGames: ["薩爾達傳說", "薩爾達傳說：王國之淚"],
          suggestedTags: ["任天堂", "動作冒險"],
        },
      ],
    };
    const result = articleBatchCreateSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.articles[0].suggestedGames).toEqual([
        "薩爾達傳說",
        "薩爾達傳說：王國之淚",
      ]);
      expect(result.data.articles[0].suggestedTags).toEqual(["任天堂", "動作冒險"]);
    }
  });

  it("should fail when issueId is empty", () => {
    const input = {
      issueId: "",
      articles: [{ title: "文章1" }],
    };
    const result = articleBatchCreateSchema.safeParse(input);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("期數 ID 為必填");
    }
  });

  it("should fail when article title is empty", () => {
    const input = {
      issueId: "issue-123",
      articles: [{ title: "" }],
    };
    const result = articleBatchCreateSchema.safeParse(input);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("標題為必填");
    }
  });

  it("should validate empty articles array", () => {
    const input = {
      issueId: "issue-123",
      articles: [],
    };
    const result = articleBatchCreateSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.articles).toHaveLength(0);
    }
  });

  it("should validate articles with all fields", () => {
    const input = {
      issueId: "issue-123",
      articles: [
        {
          title: "完整文章",
          subtitle: "副標題",
          authors: ["作者1", "作者2"],
          category: "評測",
          pageStart: 10,
          pageEnd: 20,
          summary: "摘要",
          sortOrder: 1,
          suggestedGames: ["遊戲1"],
          suggestedTags: ["標籤1"],
        },
      ],
    };
    const result = articleBatchCreateSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      const article = result.data.articles[0];
      expect(article.title).toBe("完整文章");
      expect(article.subtitle).toBe("副標題");
      expect(article.authors).toEqual(["作者1", "作者2"]);
      expect(article.category).toBe("評測");
      expect(article.pageStart).toBe(10);
      expect(article.pageEnd).toBe(20);
      expect(article.sortOrder).toBe(1);
    }
  });

  it("should use default values for optional fields", () => {
    const input = {
      issueId: "issue-123",
      articles: [{ title: "最小文章" }],
    };
    const result = articleBatchCreateSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      const article = result.data.articles[0];
      expect(article.authors).toEqual([]);
      expect(article.sortOrder).toBe(0);
    }
  });
});
