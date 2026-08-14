import { gameCreateSchema, gameUpdateSchema } from "@/lib/validators/game";
import { magazineUpdateSchema } from "@/lib/validators/magazine";
import { issueUpdateSchema } from "@/lib/validators/issue";
import { articleUpdateSchema } from "@/lib/validators/article";
import { tagUpdateSchema } from "@/lib/validators/tag";

// An admin form posts "" for every optional field the user left alone. Stored
// as "", each of those is a genuine write over the null already there, and the
// edit log faithfully reports six fields "changed" on a save that changed
// nothing anyone typed.
describe("blank optional text becomes null", () => {
  it("normalises the game fields that a blank form sends", () => {
    const parsed = gameUpdateSchema.parse({
      nameEn: "",
      nameOriginal: "",
      developer: "",
      publisher: "",
      description: "",
      coverImage: "",
    });

    expect(parsed).toMatchObject({
      nameEn: null,
      nameOriginal: null,
      developer: null,
      publisher: null,
      description: null,
      coverImage: null,
    });
  });

  it("normalises magazine, issue, article and tag fields too", () => {
    expect(magazineUpdateSchema.parse({ nameOriginal: "", publisher: "" })).toMatchObject({
      nameOriginal: null,
      publisher: null,
    });
    expect(issueUpdateSchema.parse({ volumeNumber: "", notes: "" })).toMatchObject({
      volumeNumber: null,
      notes: null,
    });
    expect(articleUpdateSchema.parse({ subtitle: "", summary: "" })).toMatchObject({
      subtitle: null,
      summary: null,
    });
    expect(tagUpdateSchema.parse({ description: "" })).toMatchObject({
      description: null,
    });
  });

  it("leaves a real value alone", () => {
    expect(gameUpdateSchema.parse({ developer: "Sierra" })).toMatchObject({
      developer: "Sierra",
    });
  });

  it("still accepts an explicit null", () => {
    expect(gameUpdateSchema.parse({ developer: null })).toMatchObject({
      developer: null,
    });
  });

  it("leaves an omitted field omitted", () => {
    expect(gameUpdateSchema.parse({ name: "大富翁" })).not.toHaveProperty(
      "developer"
    );
  });
});

// .partial() makes a field optional but keeps its .default(), so a PUT that
// omits the field arrives at Prisma carrying the default and overwrites what
// is stored. Confirmed the hard way: a PUT sending only gameIds reset an
// article's sortOrder from 19 to 0.
describe("update schemas do not resurrect create-time defaults", () => {
  it("leaves the game arrays out when the caller omits them", () => {
    const parsed = gameUpdateSchema.parse({ name: "大富翁" });

    expect(parsed).not.toHaveProperty("platforms");
    expect(parsed).not.toHaveProperty("genres");
  });

  it("leaves authors and sortOrder out when the caller omits them", () => {
    const parsed = articleUpdateSchema.parse({ title: "編輯室報告" });

    expect(parsed).not.toHaveProperty("authors");
    expect(parsed).not.toHaveProperty("sortOrder");
  });

  it("leaves the tag type out when the caller omits it", () => {
    expect(tagUpdateSchema.parse({ name: "攻略" })).not.toHaveProperty("type");
  });

  it("keeps the issue and magazine schemas that already did this", () => {
    expect(issueUpdateSchema.parse({ title: "夏季號" })).not.toHaveProperty(
      "tocImages"
    );
    expect(magazineUpdateSchema.parse({ name: "電腦玩家" })).not.toHaveProperty(
      "aliases"
    );
  });

  it("still applies the defaults on create", () => {
    expect(
      gameCreateSchema.parse({ name: "大富翁", slug: "da-fu-weng" })
    ).toMatchObject({ platforms: [], genres: [] });
  });

  it("still accepts the fields when the caller does send them", () => {
    expect(
      gameUpdateSchema.parse({ platforms: ["PC"], genres: ["RPG"] })
    ).toMatchObject({ platforms: ["PC"], genres: ["RPG"] });
    expect(articleUpdateSchema.parse({ sortOrder: 19 })).toMatchObject({
      sortOrder: 19,
    });
  });
});
