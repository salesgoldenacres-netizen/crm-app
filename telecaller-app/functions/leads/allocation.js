/**
 * Round-robin allocation helpers.
 *
 * Pure pickers are unit-tested; determineAllocation(db) owns Firestore I/O with
 * a transactional cursor on settings/routing (no leads collection scans).
 *
 * Single owner for lead assignment: onLeadCreated. Webhook/bulk create leads
 * unassigned (unless explicitly assigned) so RR runs once.
 *
 * Phase D: bounded retries + structured contention logs around the cursor txn.
 * No counter/cursor sharding.
 */

const { runTransactionWithRetry } = require("../helpers/retry");

/**
 * Filter telecallers to the configured activeAgents pool (or all if empty).
 * @param {Array<{ id: string, username?: string, role?: string }>} telecallers
 * @param {string[]} [activeAgents]
 * @returns {Array<{ id: string, username?: string }>}
 */
function buildAgentPool(telecallers, activeAgents) {
  const list = Array.isArray(telecallers) ? telecallers : [];
  if (activeAgents && activeAgents.length > 0) {
    const allowed = new Set(activeAgents);
    return list.filter((tc) => allowed.has(tc.id));
  }
  return list.slice();
}

/**
 * Pick the next agent in round-robin order among currently active agents.
 * @param {object} opts
 * @param {Array<{ id: string, username?: string }>} opts.pool
 * @param {Set<string>|string[]} opts.activeAgentIds - available / WFH agent ids
 * @param {string} [opts.lastAgentId]
 * @returns {{ assignedTo: string, assignedToName: string }}
 */
function pickNextRoundRobinAgent(opts) {
  const pool = (opts && opts.pool) || [];
  const rawIds = (opts && opts.activeAgentIds) || [];
  const activeAgentIds =
    rawIds instanceof Set ? rawIds : new Set(Array.isArray(rawIds) ? rawIds : []);
  const lastAgentId = (opts && opts.lastAgentId) || "";

  const activePool = pool
    .filter((tc) => tc && activeAgentIds.has(tc.id))
    .slice()
    .sort((a, b) => String(a.id).localeCompare(String(b.id)));
  if (activePool.length === 0) {
    return { assignedTo: "", assignedToName: "Unassigned" };
  }

  const lastIndex = activePool.findIndex((tc) => tc.id === lastAgentId);
  const nextIndex = (lastIndex + 1) % activePool.length;
  const targetAgent = activePool[nextIndex];
  return {
    assignedTo: targetAgent.id,
    assignedToName: targetAgent.username || targetAgent.id,
  };
}

/**
 * Resolve telecaller docs without a full users collection scan.
 * Prefers settings/routing.activeAgents; otherwise role==telecaller query.
 * @param {FirebaseFirestore.Firestore} db
 * @param {string[]} [activeAgents]
 */
async function loadTelecallerPool(db, activeAgents) {
  if (activeAgents && activeAgents.length > 0) {
    const snaps = await db.getAll(
      ...activeAgents.map((id) => db.collection("users").doc(id)),
    );
    /** @type {Array<{ id: string, username?: string }>} */
    const out = [];
    snaps.forEach((d) => {
      if (!d.exists) return;
      const u = d.data() || {};
      if (u.role === "telecaller") {
        out.push({ id: d.id, ...u });
      }
    });
    return out;
  }

  const usersSnap = await db
    .collection("users")
    .where("role", "==", "telecaller")
    .get();
  /** @type {Array<{ id: string, username?: string }>} */
  const out = [];
  usersSnap.forEach((d) => {
    out.push({ id: d.id, ...d.data() });
  });
  return out;
}

/**
 * Load availability for pool members only (no full agentStatus scan).
 * @param {FirebaseFirestore.Firestore} db
 * @param {Array<{ id: string }>} pool
 * @returns {Promise<Set<string>>}
 */
async function loadAvailableAgentIds(db, pool) {
  const available = new Set();
  if (!pool.length) return available;
  const snaps = await db.getAll(
    ...pool.map((tc) => db.collection("agentStatus").doc(tc.id)),
  );
  snaps.forEach((d) => {
    if (!d.exists) return;
    const s = d.data() || {};
    if (s.status === "available" || s.status === "working_from_home") {
      available.add(d.id);
    }
  });
  return available;
}

/**
 * Transactional round-robin allocation using settings/routing.roundRobinCursor.
 * @param {FirebaseFirestore.Firestore} db
 * @returns {Promise<{ assignedTo: string, assignedToName: string }>}
 */
async function determineAllocation(db) {
  let assignedTo = "";
  let assignedToName = "Unassigned";

  try {
    const routingSnap = await db.doc("settings/routing").get();
    const routingSettings = routingSnap.exists
      ? routingSnap.data()
      : { enableRoundRobin: false, activeAgents: [] };

    if (!routingSettings.enableRoundRobin) {
      return { assignedTo, assignedToName };
    }

    const telecallers = await loadTelecallerPool(
      db,
      routingSettings.activeAgents,
    );
    const pool = buildAgentPool(telecallers, routingSettings.activeAgents);
    if (pool.length === 0) {
      return { assignedTo, assignedToName };
    }

    const activeAgentIds = await loadAvailableAgentIds(db, pool);
    if (activeAgentIds.size === 0) {
      console.log(
        "No active or WFH agents found in agentStatus. Lead will remain Unassigned.",
      );
      return { assignedTo, assignedToName };
    }

    const routingRef = db.doc("settings/routing");
    const picked = await runTransactionWithRetry(
      db,
      async (txn) => {
        const snap = await txn.get(routingRef);
        const data = snap.exists ? snap.data() : {};
        const lastAgentId = data.roundRobinCursor || "";
        const next = pickNextRoundRobinAgent({
          pool,
          activeAgentIds,
          lastAgentId,
        });
        if (next.assignedTo) {
          txn.set(
            routingRef,
            {
              roundRobinCursor: next.assignedTo,
              roundRobinCursorAt: new Date().toISOString(),
            },
            { merge: true },
          );
        }
        return next;
      },
      { label: "settings/routing.roundRobinCursor" },
    );

    return picked;
  } catch (err) {
    console.error("Error determining round-robin allocation: ", err);
  }

  return { assignedTo, assignedToName };
}

module.exports = {
  buildAgentPool,
  pickNextRoundRobinAgent,
  loadTelecallerPool,
  loadAvailableAgentIds,
  determineAllocation,
};
