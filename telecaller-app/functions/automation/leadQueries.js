/**
 * Shared Firestore query helpers for automation crons.
 * Prefer equality on YYYY-MM-DD fields; document indexes in Agent 0 notes.
 */

/**
 * Leads with followUpDate == ymd (same-day / equality scan).
 * @param {FirebaseFirestore.Firestore} db
 * @param {string} ymd
 * @returns {Promise<FirebaseFirestore.QuerySnapshot>}
 */
async function queryLeadsByFollowUpDate(db, ymd) {
  return db.collection("leads").where("followUpDate", "==", ymd).get();
}

/**
 * Overdue follow-ups: followUpDate < today (requires composite or single-field range).
 * Agents should batch / paginate if result sets grow large.
 * @param {FirebaseFirestore.Firestore} db
 * @param {string} beforeYmd exclusive upper bound (typically IST today)
 * @param {number} [limit]
 * @returns {Promise<FirebaseFirestore.QuerySnapshot>}
 */
async function queryLeadsFollowUpBefore(db, beforeYmd, limit) {
  let q = db
    .collection("leads")
    .where("followUpDate", "<", beforeYmd)
    .orderBy("followUpDate", "asc");
  if (limit != null) q = q.limit(limit);
  return q.get();
}

/**
 * Site visits on a given date (nested field). Requires index on siteVisit.date.
 * @param {FirebaseFirestore.Firestore} db
 * @param {string} ymd
 * @returns {Promise<FirebaseFirestore.QuerySnapshot>}
 */
async function queryLeadsBySiteVisitDate(db, ymd) {
  return db.collection("leads").where("siteVisit.date", "==", ymd).get();
}

/**
 * Index descriptors for firestore.indexes.json / Agent 3 deploy checklist.
 */
function describeAutomationQueryIndexes() {
  return [
    {
      collection: "leads",
      fields: [
        { field: "followUpDate", order: "ASCENDING" },
        { field: "assignedTo", order: "ASCENDING" },
      ],
      note: "Same-day FU with assignee filter (already in firestore.indexes.json)",
    },
    {
      collection: "leads",
      fields: [{ field: "followUpDate", order: "ASCENDING" }],
      note: "Overdue range scan followUpDate < today (single-field often auto)",
    },
    {
      collection: "leads",
      fields: [{ field: "siteVisit.date", order: "ASCENDING" }],
      note: "Site-visit reminder equality — deploy before Agent visit cron",
    },
  ];
}

module.exports = {
  queryLeadsByFollowUpDate,
  queryLeadsFollowUpBefore,
  queryLeadsBySiteVisitDate,
  describeAutomationQueryIndexes,
};
