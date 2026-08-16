import { formatInTimeZone } from "date-fns-tz";
import { zhTW } from "date-fns/locale";

/**
 * Timestamps are stored in UTC and shown in Taipei time.
 *
 * `date-fns`'s plain `format()` follows whatever timezone the code happens to
 * run in, which is not one timezone but two: a server component renders in the
 * Vercel function's zone (UTC, since no TZ is set) while a client component
 * renders in the reader's browser (UTC+8 here). The same edit therefore read
 * 03:20 on /admin/edit-logs and 11:20 on /admin/users, and before 08:00 Taipei
 * time even the dates disagreed.
 *
 * Naming the zone here rather than setting TZ on the deployment keeps the two
 * ends in step wherever the code runs -- local, preview, production -- and
 * survives a platform move or a forgotten environment variable.
 */
export const DISPLAY_TIME_ZONE = "Asia/Taipei";

/** A UTC instant as Taipei local time. `pattern` is a date-fns format string. */
export function formatTaipei(value: Date | string | number, pattern: string): string {
  return formatInTimeZone(value, DISPLAY_TIME_ZONE, pattern, { locale: zhTW });
}
