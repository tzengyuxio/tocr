import { formatValue } from "@/lib/edit-log-format";

describe("formatValue", () => {
  // The production log has rows where six fields went null -> "". Printing both
  // sides as the same word made them read as a save that changed nothing.
  it("tells an absent value apart from an empty string", () => {
    expect(formatValue(null)).toBe("（未設定）");
    expect(formatValue(undefined)).toBe("（未設定）");
    expect(formatValue("")).toBe("（空字串）");
    expect(formatValue(null)).not.toBe(formatValue(""));
  });

  it("joins arrays and marks an empty one", () => {
    expect(formatValue(["PC", "PS5"])).toBe("PC、PS5");
    expect(formatValue([])).toBe("（空）");
  });

  it("truncates a long value", () => {
    expect(formatValue("x".repeat(50))).toBe(`${"x".repeat(40)}…`);
  });

  it("passes short scalars through", () => {
    expect(formatValue("Sierra")).toBe("Sierra");
    expect(formatValue(1999)).toBe("1999");
    expect(formatValue(false)).toBe("false");
  });
});
