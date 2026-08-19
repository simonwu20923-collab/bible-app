// Which set of daily_bread rows a calendar year should read.
//
// The Google Doc carried three years of material, but only two of them were
// filled in enough to stand alone, so the devotional runs on a two-year cycle:
//
//   2026            its own set, left as it was
//   2027, 2029, ... the 2027 set
//   2028, 2030, ... the 2028 set
//
// Anything earlier than 2027 falls back to 2026, which is the only set that
// covers those dates.

export const CYCLE_START = 2027;
export const CYCLE_LENGTH = 2;

export function devotionalYearFor(dateStr) {
  const year = Number(String(dateStr).slice(0, 4));
  if (!Number.isFinite(year) || year < CYCLE_START) return 2026;
  return CYCLE_START + ((year - CYCLE_START) % CYCLE_LENGTH);
}
