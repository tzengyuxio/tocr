import { parseCsvFile } from "@/lib/csv/parse-magazines-issues";

function csv(body: string): File {
  return new File([body], "import.csv", { type: "text/csv" });
}

describe("parseCsvFile", () => {
  it("splits alt_numbers on semicolons, as the other multi-value columns do", async () => {
    const result = await parseCsvFile(
      csv(
        [
          "magazine_name,issue_number,alt_numbers,publish_date",
          "電玩通,468,HK VOL 308; 1月30日號 ;,2014-01-30",
        ].join("\n")
      )
    );

    expect(result.errors).toEqual([]);
    expect(result.magazines[0].issues[0].altNumbers).toEqual([
      "HK VOL 308",
      "1月30日號",
    ]);
  });

  it("leaves altNumbers off an issue that has none", async () => {
    const result = await parseCsvFile(
      csv(
        [
          "magazine_name,issue_number,alt_numbers,publish_date",
          "電玩通,469,,2014-02-13",
        ].join("\n")
      )
    );

    expect(result.magazines[0].issues[0].altNumbers).toBeUndefined();
  });

  // Files made from the template before 2026-08-20 carry this name; the value
  // used to be dropped without a word.
  it("still reads the original name from the old column heading", async () => {
    const result = await parseCsvFile(
      csv(
        [
          "magazine_name,magazine_name_en,issue_number,publish_date",
          "電玩通,ファミ通,468,2014-01-30",
        ].join("\n")
      )
    );

    expect(result.magazines[0].nameOriginal).toBe("ファミ通");
  });
});
