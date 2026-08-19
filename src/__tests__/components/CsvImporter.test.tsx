import { CSV_TEMPLATE_HEADERS } from "@/components/import/CsvImporter";
import { csvRowSchema } from "@/lib/validators/csv-import";

describe("the CSV template", () => {
  // The template is where every hand-made import file starts, so a column it
  // names that the parser does not read is a value silently dropped from every
  // one of them.
  it("names only columns the parser reads", () => {
    const known = Object.keys(csvRowSchema.shape);

    expect(CSV_TEMPLATE_HEADERS.filter((h) => !known.includes(h))).toEqual([]);
  });

  // The parser reads two columns the template deliberately does not offer.
  // Both are accepted so files that already have them still import; neither is
  // something a new file should be taught to write.
  const NOT_OFFERED = [
    // The template shipped this name; the parser reads magazine_name_original.
    "magazine_name_en",
    // Off the admin form since 2026-08-20 -- see docs/data-conventions.md.
    "volume_number",
  ];

  it("offers every column the parser reads, bar the ones it should not teach", () => {
    const known = Object.keys(csvRowSchema.shape).filter(
      (key) => !NOT_OFFERED.includes(key)
    );

    expect(known.filter((k) => !CSV_TEMPLATE_HEADERS.includes(k))).toEqual([]);
  });

  it("does not offer the columns it should not teach", () => {
    expect(CSV_TEMPLATE_HEADERS.filter((h) => NOT_OFFERED.includes(h))).toEqual(
      []
    );
  });
});
