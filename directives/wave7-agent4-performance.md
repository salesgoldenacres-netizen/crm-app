# Wave 7 Agent 4 - Performance Review

## Executive summary

**FAIL** for production readiness of the live AI path.

The main blocking issue is not steady-state CPU cost inside the drawer. It is the current provider timeout/retry policy: `invokeProviderSafely()` wraps each attempt in a `25_000ms` timeout and allows `2` attempts with retry delay, which means the Sales Copilot drawer can remain in loading for about **50.25s** before falling back. Because the timeout is implemented with `Promise.race(...)` and the provider path does not support cancellation, the timed-out request may also keep running while the retry starts, increasing repeated-work overhead under provider degradation.

Outside of that blocker, local overhead appears bounded and moderate. Context building is mostly small object/string shaping, proposal rendering is lightweight, and repeated execution guards for proposal confirmation are present.

## PASS / FAIL

**FAIL**

Blocking issue:

- Live AI timeout/retry behavior can hold drawer open-time in a loading state for roughly **50.25s** before fallback, and timed-out provider work is not aborted.

## Measurements / observations

### Measured

- `npm run build`: **PASS**, Vite production build completed in **3.56s**.
- `npm test -- src/shared/ai/aiPlatform.test.ts src/features/leads/copilot/buildCopilotContext.test.ts src/features/leads/copilot/ProposalRenderer.test.tsx src/features/leads/copilot/SalesCopilotDrawer.test.tsx`: **PASS**, **79/79** tests passed in **7.13s** total (`tests 1.40s`, `transform 2.59s`, `import 6.80s`).

### Code-path observations

- Drawer open path:
  - `LeadDetailsPage` only subscribes to timeline events when Copilot is open.
  - Timeline preload is capped at **50** Firestore events.
  - `buildTimelineContext()` sorts the loaded list, then reduces it to **8** recent prompt items and a bounded summary string.
- AI runtime overhead:
  - Local orchestrator work is prompt rendering, capability/safety checks, schema shape checks, output parsing, and audit assembly.
  - This is structurally small compared with live provider latency.
- Context builder speed:
  - `buildCopilotContext()` reuses precomputed intelligence when supplied by the host, which avoids a second full lead-intelligence compute in the common path.
  - Remaining work is synchronous pack composition, short arrays, and short strings; no evidence of heavy nested loops in the Copilot-specific layer.
- Proposal rendering:
  - `ProposalRenderer` is pure render-time mapping from one proposal to one card.
  - `SalesCopilotDrawer` revalidates proposals in a memoized block before rendering; expected cost is low unless proposal counts become unexpectedly large.
- Memory usage:
  - No long-lived cache or unbounded in-drawer accumulation was found.
  - Timeline state is bounded by the subscription limit and copied once more during context shaping, so memory pressure appears low to moderate.
- Repeated execution behavior:
  - Proposal confirmation has duplicate-confirmation and duplicate-execution guards.
  - Drawer retries re-run the orchestrator with no in-flight dedupe.
  - Timed-out provider attempts are not cancelled before retry, so degraded-provider scenarios can create overlapping AI work.

## Potential bottlenecks

1. **Blocking:** provider timeout + retry stacking
   - Current defaults are `25_000ms` timeout, `2` attempts, `250ms` retry delay.
   - Worst-case visible wait before fallback is about **50.25s**.
   - This is the biggest open-time risk by a wide margin.

2. **Blocking-adjacent:** non-aborted timed-out requests
   - `withProviderTimeout()` races the provider promise against a timer but does not cancel the underlying request.
   - `GeminiProvider` does not expose an abort path.
   - Result: timed-out work may continue while a retry is already running.

3. Host-side recompute on timeline snapshots
   - `useTimelineEvents()` updates React state with up to **50** mapped Firestore documents.
   - `buildCopilotContext()` then rebuilds timeline/context structures whenever that snapshot changes.
   - This is not currently severe, but it is the main local CPU path outside provider latency.

4. Route-level payload inclusion
   - `SalesCopilotDrawer` is statically imported into `LeadDetailsPage`.
   - Copilot code therefore contributes to the `LeadDetailsPage` route chunk even before the drawer is opened.

5. Repeated runtime construction
   - `createAiRuntime()` is called inside the drawer load effect on each open/retry.
   - The construction cost is small, but it is repeated and avoidable.

## Bundle impact notes

- Build output shows:
  - `LeadDetailsPage-BwiBBsBs.js`: **132.37 kB** minified / **36.36 kB gzip**
  - `index-yYhpzf-Z.js`: **381.67 kB** minified / **117.09 kB gzip**
  - `firebase-CwsC6LhM.js`: **561.88 kB** minified / **169.57 kB gzip**
- Existing Vite config already splits Firebase into a manual chunk, which is good and prevents more pressure on the main app bundle.
- No dedicated lazy split was found for Sales Copilot inside the lead-details route, so Copilot/AI code still lands in the route payload instead of loading on first drawer open.
- Current chunk warning is driven primarily by the Firebase chunk, not by the Copilot drawer alone.

## Safe optimization recommendations only

1. **Treat the timeout/retry policy as the first required fix**
   - Reduce user-visible worst-case wait materially before live rollout.
   - Keep the same architecture; only tune the existing policy.

2. **Add true cancellation for timed-out or superseded AI requests**
   - Ensure close/retry does not leave previous provider work running.
   - This keeps repeated execution overhead bounded during outages or slow responses.

3. **Lazy-load the Copilot drawer inside `LeadDetailsPage`**
   - Keep route architecture intact, but defer Copilot code until the user actually opens it.
   - This is the safest bundle-impact win in current scope.

4. **Memoize or hoist runtime/provider creation per drawer session**
   - Avoid reconstructing the AI runtime on every retry/open cycle.
   - Small gain, but simple and low-risk.

5. **Avoid rebuilding timeline-derived prompt text unless relevant inputs changed**
   - Preserve the current context-builder design, but reduce unnecessary recomposition on repeated identical snapshots.

6. **If live-provider rollout proceeds, add lightweight latency telemetry around open-to-ready and open-to-fallback**
   - This is measurement-only and does not require feature changes to business rules or DLS.

## Residuals

- No direct microbenchmark was added in this pass; conclusions are based on code-path inspection plus available build/test evidence.
- Proposal-render cost looks safe for expected small proposal counts, but there is no explicit hard cap on proposal array size in the UI layer.
- Memory usage appears acceptable in normal use, but there is no runtime instrumentation here to quantify browser heap during repeated open/close cycles.

## Blockers

- **Production-readiness blocker:** live AI request policy can keep the drawer loading for about **50.25s** before fallback.
- **Production-readiness blocker:** timed-out provider attempts are retried without cancellation, so repeated execution can overlap and waste provider/browser work under degraded conditions.
