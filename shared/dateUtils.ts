/**
 * Format a Date as a calendar date in the user's local timezone.
 *
 * Date-only filters represent calendar days, not UTC instants. Using
 * toISOString() for these values can shift the date by one day in timezones
 * east or west of UTC, so format the local date components explicitly.
 */
export function formatLocalDate(date: Date): string {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    throw new TypeError("Invalid date");
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}
