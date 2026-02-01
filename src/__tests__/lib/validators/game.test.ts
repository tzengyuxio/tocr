import { gameCreateSchema, gameUpdateSchema } from "@/lib/validators/game";

describe("gameCreateSchema", () => {
  it("should validate a valid game with required fields only", () => {
    const input = {
      name: "薩爾達傳說",
      slug: "zelda",
    };
    const result = gameCreateSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("薩爾達傳說");
      expect(result.data.slug).toBe("zelda");
      expect(result.data.platforms).toEqual([]); // default value
      expect(result.data.genres).toEqual([]); // default value
    }
  });

  it("should validate a complete game with all fields", () => {
    const input = {
      name: "薩爾達傳說：王國之淚",
      nameOriginal: "ゼルダの伝説 ティアーズ オブ ザ キングダム",
      nameEn: "The Legend of Zelda: Tears of the Kingdom",
      slug: "zelda-totk",
      releaseDate: "2023-05-12",
      platforms: ["Nintendo Switch"],
      developer: "任天堂",
      publisher: "任天堂",
      genres: ["動作冒險", "開放世界"],
      coverImage: "https://example.com/zelda-totk.jpg",
      description: "薩爾達傳說系列最新作",
    };
    const result = gameCreateSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("薩爾達傳說：王國之淚");
      expect(result.data.nameOriginal).toBe("ゼルダの伝説 ティアーズ オブ ザ キングダム");
      expect(result.data.platforms).toEqual(["Nintendo Switch"]);
      expect(result.data.genres).toEqual(["動作冒險", "開放世界"]);
      expect(result.data.releaseDate).toBeInstanceOf(Date);
    }
  });

  it("should fail when name is empty", () => {
    const input = {
      name: "",
      slug: "test",
    };
    const result = gameCreateSchema.safeParse(input);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("遊戲名稱為必填");
    }
  });

  it("should fail when slug is empty", () => {
    const input = {
      name: "測試遊戲",
      slug: "",
    };
    const result = gameCreateSchema.safeParse(input);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Slug 為必填");
    }
  });

  it("should accept slug with Chinese characters", () => {
    const input = {
      name: "測試遊戲",
      slug: "測試遊戲-2023",
    };
    const result = gameCreateSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it("should fail when slug contains uppercase letters", () => {
    const input = {
      name: "測試遊戲",
      slug: "TestGame",
    };
    const result = gameCreateSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("should validate multiple platforms", () => {
    const input = {
      name: "跨平台遊戲",
      slug: "cross-platform",
      platforms: ["PlayStation 5", "Xbox Series X", "PC", "Nintendo Switch"],
    };
    const result = gameCreateSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.platforms).toHaveLength(4);
    }
  });

  it("should validate multiple genres", () => {
    const input = {
      name: "動作角色扮演",
      slug: "action-rpg",
      genres: ["動作", "角色扮演", "開放世界"],
    };
    const result = gameCreateSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.genres).toHaveLength(3);
    }
  });

  it("should coerce date string to Date object", () => {
    const input = {
      name: "測試遊戲",
      slug: "test",
      releaseDate: "2023-12-25",
    };
    const result = gameCreateSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.releaseDate).toBeInstanceOf(Date);
      expect(result.data.releaseDate?.getFullYear()).toBe(2023);
      expect(result.data.releaseDate?.getMonth()).toBe(11); // December is 11
    }
  });

  it("should accept null for optional fields", () => {
    const input = {
      name: "測試遊戲",
      slug: "test",
      nameOriginal: null,
      nameEn: null,
      developer: null,
      publisher: null,
      coverImage: null,
      description: null,
    };
    const result = gameCreateSchema.safeParse(input);
    expect(result.success).toBe(true);
  });
});

describe("gameUpdateSchema", () => {
  it("should validate partial updates", () => {
    const input = {
      name: "新遊戲名稱",
    };
    const result = gameUpdateSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it("should allow empty object", () => {
    const input = {};
    const result = gameUpdateSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it("should validate platforms update only", () => {
    const input = {
      platforms: ["PC", "PlayStation 5"],
    };
    const result = gameUpdateSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.platforms).toEqual(["PC", "PlayStation 5"]);
    }
  });

  it("should validate genres update only", () => {
    const input = {
      genres: ["射擊", "多人線上"],
    };
    const result = gameUpdateSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.genres).toEqual(["射擊", "多人線上"]);
    }
  });
});
