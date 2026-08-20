import {
  periodicalJsonLd,
  publicationIssueJsonLd,
} from "@/lib/structured-data";

const ORIGIN = "https://tocr.example";

const magazine = {
  name: "電腦玩家",
  slug: "pc-gamer-tw",
};

describe("periodicalJsonLd", () => {
  it("names the magazine at its canonical URL", () => {
    const data = periodicalJsonLd(ORIGIN, magazine);

    expect(data["@type"]).toBe("Periodical");
    expect(data.name).toBe("電腦玩家");
    expect(data.url).toBe("https://tocr.example/magazines/pc-gamer-tw");
  });

  it("percent-encodes a Chinese slug, as the sitemap does", () => {
    const data = periodicalJsonLd(ORIGIN, { name: "軟體世界", slug: "軟體世界" });

    expect(data.url).toBe(
      `https://tocr.example/magazines/${encodeURIComponent("軟體世界")}`
    );
  });

  it("leaves empty fields out rather than emitting null", () => {
    const data = periodicalJsonLd(ORIGIN, {
      ...magazine,
      description: null,
      issn: null,
      logoImage: null,
      aliases: [],
    });

    expect(Object.keys(data)).toEqual(["@context", "@type", "name", "url"]);
  });

  it("collects every other name the magazine is known by", () => {
    const data = periodicalJsonLd(ORIGIN, {
      ...magazine,
      nameEn: "PC Gamer Taiwan",
      aliases: ["電腦玩家雜誌"],
    });

    expect(data.alternateName).toEqual(["PC Gamer Taiwan", "電腦玩家雜誌"]);
  });

  it("wraps the publisher as an Organization", () => {
    const data = periodicalJsonLd(ORIGIN, { ...magazine, publisher: "第三波" });

    expect(data.publisher).toEqual({ "@type": "Organization", name: "第三波" });
  });

  it("carries founding and closing dates as the series start and end", () => {
    const data = periodicalJsonLd(ORIGIN, {
      ...magazine,
      foundedDate: "1994",
      endedDate: "2003-12",
    });

    expect(data.startDate).toBe("1994");
    expect(data.endDate).toBe("2003-12");
  });
});

describe("publicationIssueJsonLd", () => {
  const issue = {
    issueNumber: "96",
    slug: "96",
    publishDate: "1999-05",
  };

  it("belongs to the magazine and sits at the two-segment URL", () => {
    const data = publicationIssueJsonLd(ORIGIN, magazine, issue);

    expect(data["@type"]).toBe("PublicationIssue");
    expect(data.issueNumber).toBe("96");
    expect(data.url).toBe(
      "https://tocr.example/magazines/pc-gamer-tw/issues/96"
    );
    expect(data.isPartOf).toMatchObject({
      "@type": "Periodical",
      name: "電腦玩家",
    });
  });

  it("names itself after the magazine and issue when the issue has no title", () => {
    expect(publicationIssueJsonLd(ORIGIN, magazine, issue).name).toBe(
      "電腦玩家 96"
    );
    expect(
      publicationIssueJsonLd(ORIGIN, magazine, { ...issue, title: "大宇特輯" })
        .name
    ).toBe("大宇特輯");
  });

  // EDTF is wider than ISO 8601, and datePublished is read as ISO 8601.
  it.each(["1999-05-08", "1999-05", "1994"])(
    "publishes %s as a date, since ISO 8601 reads it the same way",
    (publishDate) => {
      const data = publicationIssueJsonLd(ORIGIN, magazine, {
        ...issue,
        publishDate,
      });

      expect(data.datePublished).toBe(publishDate);
    }
  );

  it.each(["1994-22", "1999-05?", "1999-05~", "1999-05/1999-06"])(
    "reports no date for %s rather than one ISO 8601 would misread",
    (publishDate) => {
      const data = publicationIssueJsonLd(ORIGIN, magazine, {
        ...issue,
        publishDate,
      });

      expect(data.datePublished).toBeUndefined();
    }
  );

  it("carries the table of contents as the issue's parts", () => {
    const data = publicationIssueJsonLd(ORIGIN, magazine, {
      ...issue,
      articles: [
        {
          title: "仙劍奇俠傳完全攻略",
          subtitle: "下篇",
          authors: ["蔡明宏", "編輯部"],
          pageStart: 96,
          pageEnd: 110,
        },
      ],
    });

    expect(data.hasPart).toEqual([
      {
        "@type": "Article",
        headline: "仙劍奇俠傳完全攻略",
        alternativeHeadline: "下篇",
        author: [
          { "@type": "Person", name: "蔡明宏" },
          { "@type": "Person", name: "編輯部" },
        ],
        pageStart: 96,
        pageEnd: 110,
        // Articles have no URL of their own, so they point at the issue.
        isPartOf: {
          "@type": "PublicationIssue",
          "@id": "https://tocr.example/magazines/pc-gamer-tw/issues/96",
        },
      },
    ]);
  });

  it("omits hasPart entirely for an issue with no catalogue yet", () => {
    const data = publicationIssueJsonLd(ORIGIN, magazine, {
      ...issue,
      articles: [],
    });

    expect(data.hasPart).toBeUndefined();
  });
});
