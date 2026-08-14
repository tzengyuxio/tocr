const MAX_VALUE_LENGTH = 40;

/**
 * Render one side of a field diff.
 *
 * null and "" are printed differently on purpose. Both mean "nothing there",
 * but a row reading `nameEn （空） → （空）` looks like a log of nothing at all,
 * when what happened is that an absent value was overwritten with an empty
 * string. Naming the two states is what makes such a row readable -- and the
 * old rows are still in the table, so this is the only place left to say it.
 */
export function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "（未設定）";
  if (value === "") return "（空字串）";
  if (Array.isArray(value)) {
    return value.length === 0 ? "（空）" : value.join("、");
  }
  const text = typeof value === "object" ? JSON.stringify(value) : String(value);
  return text.length > MAX_VALUE_LENGTH
    ? `${text.slice(0, MAX_VALUE_LENGTH)}…`
    : text;
}
