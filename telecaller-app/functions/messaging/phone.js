function normalizePhoneE164(phone) {
  let cleaned = String(phone || "").replace(/[^0-9]/g, "");
  if (cleaned.length === 11 && cleaned.startsWith("0")) {
    cleaned = "91" + cleaned.slice(1);
  } else if (cleaned.length === 10) {
    cleaned = "91" + cleaned;
  }
  return cleaned;
}

function digitsOnly(phone) {
  return String(phone || "").replace(/[^0-9]/g, "");
}

module.exports = {
  normalizePhoneE164,
  digitsOnly,
};
