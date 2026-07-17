import { getIstDateString } from "./automation";

export type DateValidationResult =
  | { valid: true }
  | {
      valid: false;
      code: "INVALID_FORMAT" | "INVALID_CALENDAR_DATE" | "DATE_IN_PAST";
      reason: string;
    };

/**
 * Validates a date string in YYYY-MM-DD format against calendar validity and today's date in IST.
 */
export function validateYmdDate(
  ymd: string,
  options?: {
    todayYmd?: string;
    allowPast?: boolean;
  }
): DateValidationResult {
  const trimmed = String(ymd || "").trim();
  const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return {
      valid: false,
      code: "INVALID_FORMAT",
      reason: `Date "${ymd}" must match YYYY-MM-DD format.`,
    };
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (month < 1 || month > 12) {
    return {
      valid: false,
      code: "INVALID_CALENDAR_DATE",
      reason: `Month "${month}" must be between 01 and 12.`,
    };
  }

  // Use UTC Date construction to avoid timezone issues when checking calendar validity
  const date = new Date(Date.UTC(year, month - 1, day));
  const isRealDate =
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day;

  if (!isRealDate) {
    return {
      valid: false,
      code: "INVALID_CALENDAR_DATE",
      reason: `Date "${trimmed}" is not a valid calendar date.`,
    };
  }

  if (!options?.allowPast) {
    const today = options?.todayYmd || getIstDateString();
    if (trimmed < today) {
      return {
        valid: false,
        code: "DATE_IN_PAST",
        reason: `Date "${trimmed}" cannot be in the past relative to today (${today}).`,
      };
    }
  }

  return { valid: true };
}
