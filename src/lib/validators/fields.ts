import { z } from "zod";

/**
 * A form sends an untouched optional field as "", but "no value" is already
 * spelled null in the database. Storing both means the same absence has two
 * representations, and the first save of any record rewrites every blank field
 * from null to "" -- a real write, which the edit log then reports as a change.
 */
export const blankToNull = (value: unknown) => (value === "" ? null : value);

/** An optional free-text column: blank in, null stored. */
export const optionalText = z.preprocess(
  blankToNull,
  z.string().nullable().optional()
);
