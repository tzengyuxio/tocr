import { TAG_TYPES } from "./tag-colors";

export interface TagInput {
  name: string;
  type: string;
}

const KNOWN_TYPES = new Set<string>(TAG_TYPES.map((t) => t.value));

/**
 * Tags are typed as `TYPE:name` -- the type first, like a GitLab scoped label.
 *
 * The type goes in front so a name containing a colon survives: splitting on
 * the first colon leaves the rest of the string intact, whereas a trailing
 * `name:TYPE` had to guess which colon was the separator.
 */
export function formatTagInput(tags: TagInput[] | undefined): string {
  return (tags ?? [])
    .map((tag) => (tag.type === "GENERAL" ? tag.name : `${tag.type}:${tag.name}`))
    .join(", ");
}

export function parseTagInput(value: string): TagInput[] {
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const separator = entry.indexOf(":");
      if (separator === -1) return { name: entry, type: "GENERAL" };

      const prefix = entry.slice(0, separator).trim().toUpperCase();
      // Only a known type counts as a prefix; anything else is part of a name
      // that happens to contain a colon, such as "Panzer Dragoon: Orta".
      if (!KNOWN_TYPES.has(prefix)) return { name: entry, type: "GENERAL" };

      const name = entry.slice(separator + 1).trim();
      return name ? { name, type: prefix } : { name: entry, type: "GENERAL" };
    });
}
