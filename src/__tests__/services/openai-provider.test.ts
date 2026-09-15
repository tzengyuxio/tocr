import { OpenAIOcrProvider } from "@/services/ai/providers/openai.provider";

/**
 * 串流回應的組裝。這支 provider 的失敗形狀是**安靜的**——少收幾個 chunk 或
 * 提早結束，看起來都像「這張目錄頁沒有東西」，所以這裡測的不是快樂路徑的
 * 內容，而是「有沒有把不完整的回應說出來」。
 */

const create = jest.fn();

jest.mock("openai", () => ({
  __esModule: true,
  default: class {
    chat = { completions: { create } };
  },
}));

/** 把 delta 字串攤成 SDK 那樣的 async iterable。 */
function streamOf(
  deltas: string[],
  finishReason: string | null = "stop",
  { usageChunk = true } = {}
) {
  const chunks = deltas.map((content) => ({
    choices: [{ delta: { content }, finish_reason: null }],
  }));
  chunks.push({
    choices: [{ delta: {}, finish_reason: finishReason }],
  } as (typeof chunks)[number]);
  // 最後一包只有 usage，choices 是空陣列——include_usage 開著時一定會來。
  if (usageChunk) {
    chunks.push({ choices: [] } as unknown as (typeof chunks)[number]);
  }
  return {
    async *[Symbol.asyncIterator]() {
      for (const chunk of chunks) yield chunk;
    },
  };
}

const IMAGE = [{ base64: "AAAA", mimeType: "image/jpeg" }];

beforeEach(() => {
  create.mockReset();
  process.env.OPENAI_API_KEY = "test-key";
});

describe("OpenAIOcrProvider", () => {
  it("joins the deltas back into one response before parsing", async () => {
    create.mockResolvedValue(
      streamOf(['{"artic', 'les": [{"title": "封面', '故事", "pageStart": 4}]}'])
    );

    const result = await new OpenAIOcrProvider().extractTableOfContents(IMAGE);

    expect(result.parseError).toBeUndefined();
    expect(result.articles).toHaveLength(1);
    expect(result.articles[0].title).toBe("封面故事");
    expect(result.articles[0].pageStart).toBe(4);
  });

  it("asks for a stream and for the usage that only comes when requested", async () => {
    create.mockResolvedValue(streamOf(['{"articles": []}']));

    await new OpenAIOcrProvider().extractTableOfContents(IMAGE);

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        stream: true,
        stream_options: { include_usage: true },
        // 轉錄只有一個正確答案，抽樣自由度只會讓同一張圖每次辨識出的篇數不同。
        temperature: 0,
      })
    );
  });

  it("reports a run that was cut off at max_tokens instead of parsing it", async () => {
    create.mockResolvedValue(
      streamOf(['{"articles": [{"title": "半截'], "length")
    );

    const result = await new OpenAIOcrProvider().extractTableOfContents(IMAGE);

    expect(result.articles).toEqual([]);
    expect(result.parseError).toContain("finish_reason=length");
    // 原始回應仍然留著：那是事後判斷模型講了什麼的唯一證據。
    expect(result.rawText).toBe('{"articles": [{"title": "半截');
  });

  it("still parses when the endpoint never reports a finish_reason", async () => {
    create.mockResolvedValue(streamOf(['{"articles": []}'], null));

    const result = await new OpenAIOcrProvider().extractTableOfContents(IMAGE);

    expect(result.parseError).toBeUndefined();
    expect(result.articles).toEqual([]);
  });
});
