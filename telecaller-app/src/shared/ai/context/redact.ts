/**
 * PII minimization for AI context packs.
 * Default: omit phone / email / address; optional last-4 for phone.
 */

/** Digits-only phone; empty when none. */
export function digitsOnly(value: string | null | undefined): string {
  return String(value ?? "").replace(/\D/g, "");
}

/** Last 4 digits, or empty when fewer than 4 digits. */
export function phoneLast4(value: string | null | undefined): string {
  const digits = digitsOnly(value);
  if (digits.length < 4) return "";
  return digits.slice(-4);
}

/** Mask to `***1234` style; empty when not enough digits. */
export function redactPhone(
  value: string | null | undefined,
  mode: "omit" | "last4" = "omit",
): string {
  if (mode === "omit") return "";
  const last = phoneLast4(value);
  return last ? `***${last}` : "";
}

/** Always omit full email from context packs. */
export function redactEmail(_value: string | null | undefined): string {
  return "";
}

/**
 * Strip common PII patterns from free text (notes / timeline summaries).
 * Conservative: phone-like digit runs and email-shaped tokens.
 */
export function scrubPiiFromText(text: string, maxLen = 200): string {
  let out = String(text || "");
  out = out.replace(
    /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    "[email]",
  );
  out = out.replace(/(?:\+?\d[\d\s().-]{7,}\d)/g, "[phone]");
  out = out.replace(/\s+/g, " ").trim();
  if (out.length > maxLen) out = `${out.slice(0, maxLen - 1)}…`;
  return out;
}
