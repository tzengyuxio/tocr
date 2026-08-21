import { slugify } from "./slugify";

/**
 * The one ruler for "is this the same name?".
 *
 * Writing and searching used to measure differently: the OCR path compared the
 * three name columns for exact equality, while the search API also looked at
 * `aliases`. So a name that could be *found* by searching would still be
 * *created* a second time by recognition -- and 蝙蝠俠。電影版 / 蝙蝠俠·電影版
 * and 幻想空間Ⅱ / 幻想空間II are on production because of it.
 *
 * Built on `slugify` -- NFKC, case folding, punctuation -- but not the same
 * thing, because the two have different jobs:
 *
 * - A slug is an **address**. It has to be unique, so it carries a "-2" suffix
 *   when it collides, and it keeps its separators because people read it.
 * - A key is an **identity**. It must not be unique -- two rows colliding on a
 *   key is the signal, not a problem to paper over -- and it drops separators
 *   too, because a table of contents spaces a title however it likes:
 *   「銀河飛將 II」 and 「銀河飛將II」 are one game, and slugs alone keep them
 *   apart.
 *
 * So never read a key off `slug`. See docs/data-conventions.md.
 */
export function nameKey(name: string): string {
  return slugify(name).replace(/-/g, "");
}

/** The columns a game can be recognised by. Aliases included -- see below. */
export interface GameNames {
  name: string;
  nameEn?: string | null;
  nameOriginal?: string | null;
  aliases?: string[];
}

/**
 * Every key a game answers to, for `Game.nameKeys`.
 *
 * Aliases carry the weight here: they hold the translations that lost, the
 * bare name when a disambiguating suffix was added, and -- from
 * `merge-game.ts` -- the name of every entry merged into this one. Keying them
 * is what stops a merged-away spelling from coming back as a new row the next
 * time an issue's table of contents uses it.
 */
export function gameNameKeys(game: GameNames): string[] {
  const names = [
    game.name,
    game.nameEn,
    game.nameOriginal,
    ...(game.aliases ?? []),
  ];

  return [...new Set(names.map((name) => nameKey(name ?? "")).filter(Boolean))];
}

/** A tag has one name, so it has one key. Same ruler as games. */
export function tagNameKey(name: string): string {
  return nameKey(name);
}
