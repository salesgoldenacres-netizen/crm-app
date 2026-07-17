export type AnalyticsErrorCode =
  | "PROVIDER_UNAVAILABLE"
  | "SUMMARY_NOT_FOUND"
  | "COUNT_FAILED"
  | "PROJECT_SCOPE_REQUIRED"
  | "PERMISSION_DENIED";

export class AnalyticsError extends Error {
  public code: AnalyticsErrorCode;

  constructor(code: AnalyticsErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = "AnalyticsError";
    Object.setPrototypeOf(this, AnalyticsError.prototype);
  }
}
