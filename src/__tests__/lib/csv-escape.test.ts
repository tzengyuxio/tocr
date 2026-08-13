import { escapeCsvField } from "@/lib/csv/escape";

describe("escapeCsvField", () => {
  it("returns empty string for null, undefined and empty input", () => {
    expect(escapeCsvField(null)).toBe("");
    expect(escapeCsvField(undefined)).toBe("");
    expect(escapeCsvField("")).toBe("");
  });

  it("passes plain values through untouched", () => {
    expect(escapeCsvField("電腦玩家")).toBe("電腦玩家");
  });

  it("quotes fields containing a comma, a quote or a newline", () => {
    expect(escapeCsvField("a,b")).toBe('"a,b"');
    expect(escapeCsvField('say "hi"')).toBe('"say ""hi"""');
    expect(escapeCsvField("line1\nline2")).toBe('"line1\nline2"');
  });

  describe("formula injection", () => {
    it.each(["=", "+", "-", "@", "\t", "\r"])(
      "prefixes a field starting with %j",
      (prefix) => {
        expect(escapeCsvField(`${prefix}foo`)).toBe(`'${prefix}foo`);
      }
    );

    it("neutralises a formula that would otherwise execute", () => {
      expect(escapeCsvField("=1+1")).toBe("'=1+1");
      expect(escapeCsvField("=cmd|'/c calc'!A1")).toBe("'=cmd|'/c calc'!A1");
    });

    it("still quotes when the neutralised value also needs quoting", () => {
      expect(escapeCsvField("=SUM(A1,B1)")).toBe('"\'=SUM(A1,B1)"');
    });

    it("leaves the character alone when it is not leading", () => {
      expect(escapeCsvField("Final Fantasy VII")).toBe("Final Fantasy VII");
      expect(escapeCsvField("a=b")).toBe("a=b");
    });
  });
});
