/**
 * @jest-environment node
 */
import {
  POST,
  searchQueries,
  toCandidates,
} from "@/app/api/games/search-cover/route";
import { requireEditor } from "@/lib/require-editor";
import { NextRequest } from "next/server";

// The authorisation layer pulls in next-auth, which is ESM and cannot be loaded
// here. These cases are about which name gets sent to RAWG; the layer itself is
// covered in require-editor.test.ts.
jest.mock("@/lib/require-editor", () => ({
  requireEditor: jest.fn().mockResolvedValue(null),
}));

const requireEditorMock = requireEditor as jest.Mock;

function requestWith(body: Record<string, unknown>) {
  return new NextRequest(
    new URL("http://localhost:3000/api/games/search-cover"),
    { method: "POST", body: JSON.stringify(body) }
  );
}

/** What RAWG answers for a hit; only the fields the route reads. */
function hit(...names: string[]) {
  return {
    ok: true,
    json: async () => ({
      results: names.map((name) => ({
        name,
        background_image: `https://rawg.example/${name}.jpg`,
        released: "1997-01-31",
      })),
    }),
  };
}

const miss = { ok: true, json: async () => ({ results: [] }) };

/** The `search=` value of every RAWG call, in order. */
function queriesSent(fetchMock: jest.Mock): string[] {
  return fetchMock.mock.calls.map(
    (call) => new URL(call[0] as string).searchParams.get("search") as string
  );
}

describe("searchQueries", () => {
  it("asks with the English name first and the Chinese one last", () => {
    expect(
      searchQueries({
        name: "太空戰士VII",
        nameEn: "Final Fantasy VII",
        nameOriginal: "ファイナルファンタジーVII",
      })
    ).toEqual([
      "Final Fantasy VII",
      "ファイナルファンタジーVII",
      "太空戰士VII",
    ]);
  });

  it("keeps the Chinese name when it is the only one", () => {
    expect(searchQueries({ name: "仙劍奇俠傳" })).toEqual(["仙劍奇俠傳"]);
  });

  it("does not send the same query twice", () => {
    expect(searchQueries({ name: "Doom", nameEn: "Doom" })).toEqual(["Doom"]);
  });

  it("ignores blank and non-string fields", () => {
    expect(
      searchQueries({ name: "Doom", nameEn: "   ", nameOriginal: null })
    ).toEqual(["Doom"]);
  });

  it("is empty when nothing is filled in", () => {
    expect(searchQueries({})).toEqual([]);
  });
});

describe("toCandidates", () => {
  const row = (name: string, extra: Record<string, unknown> = {}) => ({
    name,
    background_image: `https://rawg.example/${name}.jpg`,
    ...extra,
  });

  it("drops results with no image -- a coverless candidate wastes a slot", () => {
    const candidates = toCandidates(
      [{ name: "No Art", background_image: null }, row("Has Art")],
      { name: "Whatever" }
    );

    expect(candidates.map((c) => c.rawgName)).toEqual(["Has Art"]);
  });

  it("keeps only the year -- month and day do not help pick a cover", () => {
    const [candidate] = toCandidates([row("Doom", { released: "1993-12-10" })], {
      name: "Doom",
    });

    expect(candidate.released).toBe("1993");
  });

  it("has no year when RAWG gives none", () => {
    const [candidate] = toCandidates([row("Doom")], { name: "Doom" });

    expect(candidate.released).toBeNull();
  });

  it("marks a name that matches any of the game's names", () => {
    const candidates = toCandidates(
      [row("Final Fantasy VII"), row("Final Fantasy VIII")],
      { name: "太空戰士VII", nameEn: "Final Fantasy VII" }
    );

    expect(candidates.map((c) => c.exact)).toEqual([true, false]);
  });

  it("matches on the same ruler as recognition, not on raw equality", () => {
    // nameKey() folds case, punctuation and spacing -- see lib/name-match.ts.
    const [candidate] = toCandidates([row("Wing Commander II")], {
      name: "銀河飛將 II",
      nameEn: "wing commander ii",
    });

    expect(candidate.exact).toBe(true);
  });

  it("survives a shape RAWG did not promise", () => {
    expect(toCandidates(undefined, { name: "Doom" })).toEqual([]);
    expect(toCandidates([null, 7, {}], { name: "Doom" })).toEqual([]);
  });
});

describe("POST /api/games/search-cover", () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    requireEditorMock.mockResolvedValue(null);
    global.fetch = fetchMock as unknown as typeof fetch;
    process.env.RAWG_API_KEY = "test-key";
  });

  it("stops at the English name rather than spending quota on the rest", async () => {
    fetchMock.mockResolvedValueOnce(hit("Final Fantasy VII"));

    const res = await POST(
      requestWith({ name: "太空戰士VII", nameEn: "Final Fantasy VII" })
    );

    expect(await res.json()).toMatchObject({
      candidates: [expect.objectContaining({ rawgName: "Final Fantasy VII" })],
      matchedQuery: "Final Fantasy VII",
    });
    expect(queriesSent(fetchMock)).toEqual(["Final Fantasy VII"]);
  });

  it("falls through to the Chinese name for a game RAWG only knows by it", async () => {
    fetchMock
      .mockResolvedValueOnce(miss)
      .mockResolvedValueOnce(hit("Chinese Paladin"));

    const res = await POST(
      requestWith({ name: "仙劍奇俠傳", nameEn: "Sword and Fairy" })
    );

    expect(await res.json()).toMatchObject({ matchedQuery: "仙劍奇俠傳" });
    expect(queriesSent(fetchMock)).toEqual(["Sword and Fairy", "仙劍奇俠傳"]);
  });

  it("reports no candidates once every name has missed", async () => {
    fetchMock.mockResolvedValue(miss);

    const res = await POST(
      requestWith({ name: "查無此作", nameEn: "Nothing Here" })
    );

    expect(await res.json()).toEqual({ candidates: [], matchedQuery: null });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("hands back every candidate rather than picking one", async () => {
    // What RAWG actually answered for 《A-6入侵者》 on 2026-08-22: a confident
    // first result that is a different game entirely. Choosing for the editor
    // is exactly the bug.
    fetchMock.mockResolvedValueOnce(
      hit("Avernum 6", "Resident Evil 6", "Tekken 6 (PSP)")
    );

    const res = await POST(requestWith({ name: "A-6入侵者" }));
    const body = await res.json();

    expect(body.candidates.map((c: { rawgName: string }) => c.rawgName)).toEqual(
      ["Avernum 6", "Resident Evil 6", "Tekken 6 (PSP)"]
    );
    expect(body).not.toHaveProperty("coverImage");
  });

  it("says RAWG failed rather than reporting a miss", async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, json: async () => ({}) });

    const res = await POST(requestWith({ name: "Doom" }));

    expect(res.status).toBe(502);
    // No fall-through: a 502 on the first name must not burn the others.
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("rejects a request with no usable name", async () => {
    const res = await POST(requestWith({ name: "  ", nameEn: "" }));

    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
