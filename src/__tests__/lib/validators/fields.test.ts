import { gameUpdateSchema } from "@/lib/validators/game";
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
