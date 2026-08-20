import { parseOcrResponse } from "@/services/ai/ocr.utils";

function envelope(articles: string) {
  return `{\n  "articles": [\n${articles}\n  ],\n  "metadata": {}\n}`;
}

const GOOD = envelope(
  `    {\n      "title": "囂張拳王",\n      "pageStart": 12,\n      "confidence": 0.95\n    }`
);

// The self-hosted qwen-tw backend drops the opening quote of a string value.
// 軟體世界 35 and 36 hit it on the same title seven runs in a row, each one
// silently returning zero articles.
const MISSING_QUOTE = envelope(
  `    {\n      "title":囂張拳王",\n      "pageStart": 12,\n      "confidence": 0.95\n    }`
);

describe("parseOcrResponse", () => {
  it("reads a well-formed response", () => {
    const result = parseOcrResponse(GOOD);

    expect(result.articles).toHaveLength(1);
    expect(result.articles[0].title).toBe("囂張拳王");
    expect(result.parseError).toBeUndefined();
  });

  it("reads a response wrapped in a fenced code block", () => {
    const result = parseOcrResponse("```json\n" + GOOD + "\n```");

    expect(result.articles).toHaveLength(1);
    expect(result.parseError).toBeUndefined();
  });

  it("repairs a string value that lost its opening quote", () => {
    const result = parseOcrResponse(MISSING_QUOTE);

    expect(result.articles).toHaveLength(1);
    expect(result.articles[0].title).toBe("囂張拳王");
    expect(result.articles[0].pageStart).toBe(12);
    expect(result.parseError).toBeUndefined();
  });

  it("reports what it could not parse instead of returning no articles", () => {
    const result = parseOcrResponse('{ "articles": [ {{{ ] }');

    expect(result.articles).toHaveLength(0);
    expect(result.parseError).toBeTruthy();
    expect(result.rawText).toBe('{ "articles": [ {{{ ] }');
  });

  it("reports a response that is not JSON at all", () => {
    const result = parseOcrResponse("這張圖看不出目錄內容。");

    expect(result.articles).toHaveLength(0);
    expect(result.parseError).toBeTruthy();
  });

  it("leaves a numeric or null value alone while repairing", () => {
    const result = parseOcrResponse(
      envelope(
        `    {\n      "title":快打旋風",\n      "subtitle": null,\n      "pageStart": 7,\n      "confidence": 1.0\n    }`
      )
    );

    expect(result.articles[0].title).toBe("快打旋風");
    expect(result.articles[0].subtitle).toBeUndefined();
    expect(result.articles[0].pageStart).toBe(7);
  });
});
