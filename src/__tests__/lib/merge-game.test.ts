import { planGameMerge, suggestKeeper, type MergeCandidate } from "@/lib/merge-game";

function candidate(over: Partial<MergeCandidate> & { id: string }): MergeCandidate {
  return {
    name: `game-${over.id}`,
    slug: `game-${over.id}`,
    aliases: [],
    createdAt: new Date("2026-01-01"),
    links: [],
    ...over,
  };
}

/** Article links, primary first when `primary` names one of them. */
function links(articleIds: string[], primary?: string) {
  return articleIds.map((articleId) => ({ articleId, isPrimary: articleId === primary }));
}

describe("planGameMerge", () => {
  it("moves the links the keeper does not already have", () => {
    const plan = planGameMerge(
      candidate({ id: "keeper", links: links(["a1"]) }),
      candidate({ id: "loser", links: links(["a1", "a2", "a3"]) })
    );

    expect(plan.movedArticleIds).toEqual(["a2", "a3"]);
    // a1 is on both sides; one of the two rows has to go, and the keeper's stays.
    expect(plan.discardedLinkCount).toBe(1);
  });

  it("keeps the losing spelling as an alias", () => {
    const plan = planGameMerge(
      candidate({ id: "keeper", name: "1990世界杯足球賽" }),
      candidate({ id: "loser", name: "1990世界盃足球賽", aliases: ["世界盃足球賽"] })
    );

    expect(plan.mergedAliases).toEqual(["1990世界盃足球賽", "世界盃足球賽"]);
  });

  it("does not list the keeper's own name as an alias of itself", () => {
    const plan = planGameMerge(
      candidate({ id: "keeper", name: "快打旋風" }),
      candidate({ id: "loser", name: "快打旋風", aliases: ["快打旋風", "Street Fighter"] })
    );

    expect(plan.mergedAliases).toEqual(["Street Fighter"]);
  });

  it("does not duplicate an alias both sides already carry", () => {
    const plan = planGameMerge(
      candidate({ id: "keeper", aliases: ["Street Fighter"] }),
      candidate({ id: "loser", name: "x", aliases: ["Street Fighter"] })
    );

    expect(plan.mergedAliases).toEqual(["Street Fighter", "x"]);
  });

  it("plans nothing to move when the keeper already covers every article", () => {
    const plan = planGameMerge(
      candidate({ id: "keeper", links: links(["a1", "a2"]) }),
      candidate({ id: "loser", links: links(["a1"]) })
    );

    expect(plan.movedArticleIds).toEqual([]);
    expect(plan.discardedLinkCount).toBe(1);
  });

  it("keeps the article's primary game when the losing row was the primary one", () => {
    // The keeper's row survives and the loser's is cascaded away, so without
    // this the article ends up with no primary game at all.
    const plan = planGameMerge(
      candidate({ id: "keeper", links: links(["a1"]) }),
      candidate({ id: "loser", links: links(["a1"], "a1") })
    );

    expect(plan.promotedArticleIds).toEqual(["a1"]);
  });

  it("promotes nothing when the keeper's row is already the primary one", () => {
    const plan = planGameMerge(
      candidate({ id: "keeper", links: links(["a1"], "a1") }),
      candidate({ id: "loser", links: links(["a1"], "a1") })
    );

    expect(plan.promotedArticleIds).toEqual([]);
  });

  it("does not promote for a link that moves across unchanged", () => {
    // Moving the row keeps its own isPrimary, so there is nothing to correct.
    const plan = planGameMerge(
      candidate({ id: "keeper", links: [] }),
      candidate({ id: "loser", links: links(["a1"], "a1") })
    );

    expect(plan.movedArticleIds).toEqual(["a1"]);
    expect(plan.promotedArticleIds).toEqual([]);
  });

  it("refuses to merge an entry into itself", () => {
    const same = candidate({ id: "g1" });
    expect(() => planGameMerge(same, same)).toThrow();
  });
});

describe("suggestKeeper", () => {
  // docs/data-conventions.md: keep the entry that was created first, so the id
  // that other data has been accumulating against is the one that survives.
  it("picks the entry created first", () => {
    const older = { id: "older", createdAt: new Date("2026-01-01"), articleCount: 0 };
    const newer = { id: "newer", createdAt: new Date("2026-06-01"), articleCount: 9 };

    expect(suggestKeeper(newer, older).id).toBe("older");
    expect(suggestKeeper(older, newer).id).toBe("older");
  });

  it("falls back to the better documented entry when both were created at once", () => {
    // A backfill can create both in the same batch, and then "earlier" says
    // nothing. More articles means more of the catalogue already points there.
    const stamp = new Date("2026-01-01");
    const sparse = { id: "sparse", createdAt: stamp, articleCount: 1 };
    const rich = { id: "rich", createdAt: stamp, articleCount: 2 };

    expect(suggestKeeper(sparse, rich).id).toBe("rich");
    expect(suggestKeeper(rich, sparse).id).toBe("rich");
  });
});
