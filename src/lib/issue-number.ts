/**
 * Issue numbers are stored as written on the cover, and most of them are bare
 * digits -- 544 of 549. On its own "216" does not read as an issue number, so
 * the digits get the surrounding words back at display time.
 *
 * Anything that is not purely digits is left alone: 創刊號, 試刊號 and 70+71 are
 * already sentences, and an unfamiliar shape from a magazine that has not been
 * imported yet passes through rather than being guessed at.
 *
 * Not Vol. / No.: the former collides with the separate volumeNumber field, the
 * latter is not how these magazines number themselves.
 */
export function formatIssueNumber(issueNumber: string): string {
  return /^\d+$/.test(issueNumber) ? `第 ${issueNumber} 期` : issueNumber;
}
