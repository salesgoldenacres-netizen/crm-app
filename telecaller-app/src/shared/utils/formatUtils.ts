/**
 * Normalizes phone numbers to E.164 standard, defaulting to +91 country code for Indian numbers.
 */
export function normalizePhone(phone: string): string {
  let cleanPhone = (phone || "").replace(/[^0-9]/g, "");

  if (cleanPhone.length === 11 && cleanPhone.startsWith("0")) {
    cleanPhone = "+91" + cleanPhone.slice(1);
  } else if (cleanPhone.length === 10) {
    cleanPhone = "+91" + cleanPhone;
  } else if (cleanPhone.length === 12 && cleanPhone.startsWith("91")) {
    cleanPhone = "+" + cleanPhone;
  } else if (cleanPhone.length > 0 && !cleanPhone.startsWith("+")) {
    cleanPhone = "+" + cleanPhone;
  }

  if (!cleanPhone || cleanPhone === "+") {
    throw new Error("Invalid phone number.");
  }

  return cleanPhone;
}

/**
 * Trims extra whitespace, normalizes word spacing, and converts to Title Case.
 */
export function cleanLeadName(name: string): string {
  let cleanName = (name || "").trim().replace(/\s+/g, " ");
  cleanName = cleanName
    .split(" ")
    .map((w) =>
      w ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : ""
    )
    .join(" ");
  
  return cleanName || "Unknown Customer";
}

/**
 * Trims and converts email addresses to lowercase.
 */
export function cleanEmailAddress(email: string): string {
  return (email || "").trim().toLowerCase();
}
