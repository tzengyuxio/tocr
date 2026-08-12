import { diffChanges } from "@/lib/edit-log-diff";

describe("diffChanges", () => {
  it("records the previous and the new value of a changed field", () => {
    const changes = diffChanges({ name: "電擊王" }, { name: "電玩通" });

    expect(changes).toEqual({ name: { from: "電擊王", to: "電玩通" } });
  });

  it("skips fields that did not change", () => {
    const changes = diffChanges(
      { name: "Famitsu", publisher: "KADOKAWA" },
      { name: "Famitsu", publisher: "ASCII" }
    );

    expect(changes).toEqual({ publisher: { from: "KADOKAWA", to: "ASCII" } });
  });

  it("skips bookkeeping columns", () => {
    const changes = diffChanges(
      { id: "mag-1", updatedAt: new Date("2026-01-01"), name: "A" },
      { id: "mag-1", updatedAt: new Date("2026-08-12"), name: "A" }
    );

    expect(changes).toEqual({});
  });

  it("treats a missing previous row as an empty one", () => {
    expect(diffChanges(null, { name: "Famitsu" })).toEqual({
      name: { from: null, to: "Famitsu" },
    });
  });

  it("compares dates by value, not by identity", () => {
    const changes = diffChanges(
      { publishSort: new Date("1994-05-01") },
      { publishSort: new Date("1994-05-01") }
    );

    expect(changes).toEqual({});
  });

  it("serialises dates so the log can store them", () => {
    const changes = diffChanges(
      { tocReviewedAt: null },
      { tocReviewedAt: new Date("2026-08-12T00:00:00.000Z") }
    );

    expect(changes).toEqual({
      tocReviewedAt: { from: null, to: "2026-08-12T00:00:00.000Z" },
    });
  });

  it("compares arrays element by element", () => {
    expect(diffChanges({ aliases: ["A"] }, { aliases: ["A"] })).toEqual({});
    expect(diffChanges({ aliases: ["A"] }, { aliases: ["A", "B"] })).toEqual({
      aliases: { from: ["A"], to: ["A", "B"] },
    });
  });

  it("stringifies Decimal columns", () => {
    // Stand-in for Decimal.js, which is detected by its toFixed method.
    const price = { toFixed: () => "380.00", toString: () => "380" };

    expect(diffChanges({ price: null }, { price })).toEqual({
      price: { from: null, to: "380" },
    });
  });
});
