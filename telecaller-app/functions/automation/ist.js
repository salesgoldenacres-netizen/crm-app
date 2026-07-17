/**
 * IST (Asia/Kolkata) date/time helpers for Cloud Functions automation.
 * Prefer these over `new Date().toISOString().split('T')[0]` (UTC) in cron jobs.
 */

const IST_TIME_ZONE = "Asia/Kolkata";

/**
 * @param {Date | number | string} [input]
 * @returns {string} YYYY-MM-DD in Asia/Kolkata
 */
function getIstDateString(input) {
  const date = input == null ? new Date() : new Date(input);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid date for IST formatting: ${input}`);
  }
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: IST_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/**
 * Shift an IST calendar date by N days (date-only arithmetic, no DST edge surprises).
 * @param {string} ymd YYYY-MM-DD
 * @param {number} deltaDays
 * @returns {string} YYYY-MM-DD
 */
function addIstDays(ymd, deltaDays) {
  const match = String(ymd || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    throw new Error(`Expected YYYY-MM-DD, got: ${ymd}`);
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  // Noon UTC avoids previous/next-day ambiguity when formatting back to IST.
  const utc = Date.UTC(year, month - 1, day + Number(deltaDays), 12, 0, 0);
  return getIstDateString(utc);
}

/**
 * Compare two YYYY-MM-DD strings lexicographically (safe for ISO dates).
 * @param {string} a
 * @param {string} b
 * @returns {number} negative if a < b, 0 if equal, positive if a > b
 */
function compareYmd(a, b) {
  return String(a || "").localeCompare(String(b || ""));
}

/**
 * @param {string} ymd
 * @param {string} [todayYmd]
 * @returns {boolean}
 */
function isYmdBefore(ymd, todayYmd) {
  return compareYmd(ymd, todayYmd || getIstDateString()) < 0;
}

/**
 * @param {string} ymd
 * @param {string} [todayYmd]
 * @returns {boolean}
 */
function isYmdToday(ymd, todayYmd) {
  return compareYmd(ymd, todayYmd || getIstDateString()) === 0;
}

/**
 * Hours since an ISO timestamp, using wall clock (timezone-agnostic duration).
 * @param {string | Date | number | null | undefined} iso
 * @param {Date} [now]
 * @returns {number | null}
 */
function hoursSince(iso, now) {
  if (iso == null || iso === "") return null;
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return null;
  const base = now || new Date();
  return (base.getTime() - then.getTime()) / (1000 * 60 * 60);
}

/**
 * Whole calendar days between two YYYY-MM-DD strings (b - a).
 * @param {string} fromYmd
 * @param {string} toYmd
 * @returns {number}
 */
function calendarDaysBetween(fromYmd, toYmd) {
  const a = String(fromYmd || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const b = String(toYmd || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!a || !b) return NaN;
  const utcA = Date.UTC(Number(a[1]), Number(a[2]) - 1, Number(a[3]));
  const utcB = Date.UTC(Number(b[1]), Number(b[2]) - 1, Number(b[3]));
  return Math.round((utcB - utcA) / (1000 * 60 * 60 * 24));
}

module.exports = {
  IST_TIME_ZONE,
  getIstDateString,
  addIstDays,
  compareYmd,
  isYmdBefore,
  isYmdToday,
  hoursSince,
  calendarDaysBetween,
};
