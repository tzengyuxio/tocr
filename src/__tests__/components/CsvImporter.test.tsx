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

  it("offers every column the parser reads", () => {
    const known = Object.keys(csvRowSchema.shape).filter(
      // Kept only so files made from the old template still import.
      (key) => key !== "magazine_name_en"
    );

    expect(known.filter((k) => !CSV_TEMPLATE_HEADERS.includes(k))).toEqual([]);
  });
});
