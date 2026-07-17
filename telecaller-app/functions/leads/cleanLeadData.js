/**
 * Pure helpers for normalizing inbound lead fields (webhook / IVR).
 * Keep free of Firestore / Firebase Admin so unit tests stay fast.
 */

/**
 * Clean and normalize inbound lead name, email, and phone.
 * @param {{ name?: string, email?: string, phone?: string }} data
 * @returns {{ name: string, email: string, phone: string }}
 */
function cleanLeadData(data) {
  let name = (data && data.name) || "";
  name = name.trim().replace(/\s+/g, " ");
  name = name
    .split(" ")
    .map((word) => {
      if (!word) return "";
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
  if (!name) name = "Unknown Customer";

  let email = (data && data.email) || "";
  email = email.trim().toLowerCase();

  let phone = (data && data.phone) || "";
  let cleanedPhone = String(phone).replace(/[^0-9]/g, "");

  if (cleanedPhone.length === 11 && cleanedPhone.startsWith("0")) {
    cleanedPhone = "+91" + cleanedPhone.slice(1);
  } else if (cleanedPhone.length === 10) {
    cleanedPhone = "+91" + cleanedPhone;
  } else if (cleanedPhone.length === 12 && cleanedPhone.startsWith("91")) {
    cleanedPhone = "+" + cleanedPhone;
  } else if (cleanedPhone.length > 0 && !cleanedPhone.startsWith("+")) {
    cleanedPhone = "+" + cleanedPhone;
  }

  return { name, email, phone: cleanedPhone };
}

module.exports = { cleanLeadData };
