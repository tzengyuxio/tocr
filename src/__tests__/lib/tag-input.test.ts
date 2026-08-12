import { formatTagInput, parseTagInput } from "@/lib/tag-input";
import { formatTagLabel } from "@/lib/tag-colors";

describe("formatTagInput", () => {
  it("puts the type in front and leaves general tags bare", () => {
    expect(
      formatTagInput([
        { name: "Panzer Dragoon", type: "SERIES" },
        { name: "SEGA", type: "COMPANY" },
        { name: "回顧", type: "GENERAL" },
      ])
    ).toBe("SERIES:Panzer Dragoon, COMPANY:SEGA, 回顧");
  });

  it("renders nothing for an empty list", () => {
    expect(formatTagInput([])).toBe("");
    expect(formatTagInput(undefined)).toBe("");
  });
});

describe("parseTagInput", () => {
  it("reads the type prefix back", () => {
    expect(parseTagInput("SERIES:Panzer Dragoon, COMPANY:SEGA")).toEqual([
      { name: "Panzer Dragoon", type: "SERIES" },
      { name: "SEGA", type: "COMPANY" },
    ]);
  });

  it("treats an untyped entry as GENERAL", () => {
    expect(parseTagInput("回顧")).toEqual([{ name: "回顧", type: "GENERAL" }]);
  });

  it("accepts a lowercase prefix", () => {
    expect(parseTagInput("series:太空戰士")).toEqual([
      { name: "太空戰士", type: "SERIES" },
    ]);
  });

  it("keeps a colon that belongs to the name", () => {
    expect(parseTagInput("Panzer Dragoon: Orta")).toEqual([
      { name: "Panzer Dragoon: Orta", type: "GENERAL" },
    ]);
  });

  it("keeps a colon in the name of a typed tag", () => {
    expect(parseTagInput("SERIES:Panzer Dragoon: Orta")).toEqual([
      { name: "Panzer Dragoon: Orta", type: "SERIES" },
    ]);
  });

  it("does not lose a name when the type has no value after it", () => {
    expect(parseTagInput("SERIES:")).toEqual([
      { name: "SERIES:", type: "GENERAL" },
    ]);
  });

  it("drops blank entries and trims whitespace", () => {
    expect(parseTagInput("  回顧 , , COMPANY: SEGA  ")).toEqual([
      { name: "回顧", type: "GENERAL" },
      { name: "SEGA", type: "COMPANY" },
    ]);
  });

  it("round-trips through format", () => {
    const tags = [
      { name: "李蒨蓉", type: "PERSON" },
      { name: "PlayStation", type: "PLATFORM" },
      { name: "封面", type: "GENERAL" },
    ];
    expect(parseTagInput(formatTagInput(tags))).toEqual(tags);
  });
});

describe("formatTagLabel", () => {
  it("reveals the type in parentheses", () => {
    expect(formatTagLabel({ name: "SEGA", type: "COMPANY" })).toBe("SEGA (公司)");
    expect(formatTagLabel({ name: "Panzer Dragoon", type: "SERIES" })).toBe(
      "Panzer Dragoon (系列)"
    );
  });

  it("leaves a general tag bare, since GENERAL is the absence of a type", () => {
    expect(formatTagLabel({ name: "作弊", type: "GENERAL" })).toBe("作弊");
  });
});
