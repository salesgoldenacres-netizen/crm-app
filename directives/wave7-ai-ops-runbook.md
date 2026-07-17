# Wave 7 AI Operations Runbook — Live Provider Operations

This document establishes the operational procedures, fallback rules, monitoring filters, and emergency controls for Golden Acres CRM AI runtime capability (`aiComplete`).

---

## 1. System Topology & Flow

All client-side AI components call the Firebase Cloud Function (`aiComplete`) in the `us-central1` region. The Cloud Function resolves trusted user role permissions, builds prompts on the server, calls Gemini, and validates returned proposals before sending them back.

---

## 2. Emergency Controls (Kill Switches)

If the AI subsystem causes production issues, cost spikes, or data degradation, execute these controls:

### Immediate User-Facing Disable (Client-Side)
- **Mechanism**: The master kill switch `AI_ENABLED` in [`telecaller-app/src/shared/ai/types.ts`](../src/shared/ai/types.ts) is set to `false` by default.
- **Action**: Ensure this flag is set to `false`. To deploy, rebuild the frontend bundle and push to Firebase Hosting.
- **Vite Env Override**: In non-production environments, the flag can be enabled via `VITE_AI_ENABLED=true`, but in production the static flag acts as the primary gate.

### Server-Side Disable (Provider Bypass)
- **Mechanism**: Set `GEMINI_API_KEY` (or `GOOGLE_AI_API_KEY`) to an empty string in the Cloud Functions configuration.
- **Command**:
  ```bash
  firebase functions:secrets:set GEMINI_API_KEY=""
  ```
- **Action**: Any user requests will fail-closed with `failed-precondition` (unconfigured key), preventing any outbound paid requests.

---

## 3. Objective Rollback & Action Thresholds

Monitor these metrics via Google Cloud Monitoring. If any threshold is breached, trigger the matching action:

| Metric / Symptom | Alarm Threshold | Action Path |
| --- | --- | --- |
| **Callable Error Rate** | > 5% failure rate over a 15-minute window | 1. Toggle client feature flag `AI_ENABLED` to `false` and deploy.<br>2. Check Cloud Logging for error payload traces (e.g. `jsonPayload.errorCode`). |
| **Provider Latency** | P95 latency > 8,000ms over a 10-minute window | 1. Verify `executionMode` and trace provider latency.<br>2. If external API is slow, degrade to stub provider or disable AI. |
| **Provider Unavailability** | 100% provider failures for > 5 consecutive minutes | 1. Implement emergency disable.<br>2. Announce degraded service to team.<br>3. Check Google Cloud Service Health Status. |
| **Quota / Rate Limits** | Elevated `resource-exhausted` or HTTP `429` errors | 1. Verify if abuse or infinite loop is occurring via Cloud Logs (`jsonPayload.userId`).<br>2. If valid load, request rate limit increase; else disable. |
| **Data Integrity Errors** | Any execution validation failure in update pathways | 1. **Immediate Disable**: Set `AI_ENABLED = false`. We must prevent invalid writes.<br>2. Investigate client execution registry. |

---

## 4. Operational Playbooks

### Outage Playbook
1. Confirm the outage via the Google Cloud Service Health Dashboard.
2. In [types.ts](../src/shared/ai/types.ts), change `AI_ENABLED` to `false`.
3. Rebuild and deploy the static app:
   ```bash
   npm run build
   firebase deploy --only hosting
   ```
4. Internally announce: "CRM AI features are temporarily disabled due to an upstream provider outage. System fallback rules will handle briefs."

### Quota / Rate Limiting (429) Handling
1. Query Cloud Logging to identify if a single user or lead is causing infinite loops or high-frequency requests.
2. If it is an abuse scenario, disable or block the user's role in Firestore (`userRoles`).
3. If it is normal high volume, request a quota increase for the Gemini Developer API through Google AI Studio or Google Cloud Console.

### Upstream Credential Rotation
If API key leakage is suspected:
1. Generate a new key in Google AI Studio / GCP Console.
2. Set the secret in Firebase:
   ```bash
   firebase functions:secrets:set GEMINI_API_KEY="NEW_KEY_HERE"
   ```
3. Verify function health via backend smoke tests.

---

## 5. Cloud Logging Queries

Paste these queries directly into Google Cloud Log Explorer:

### All AI Invocations
```query
resource.type="cloud_function"
jsonPayload.service="crm-ai"
jsonPayload.component="aiComplete"
```

### Errors & Validation Rejections
```query
resource.type="cloud_function"
jsonPayload.service="crm-ai"
jsonPayload.component="aiComplete"
jsonPayload.status="error"
```

### High Latency Invocations (> 8s)
```query
resource.type="cloud_function"
jsonPayload.service="crm-ai"
jsonPayload.component="aiComplete"
jsonPayload.latencyMs > 8000
```

### Rate Limiting / 429 Errors
```query
resource.type="cloud_function"
jsonPayload.service="crm-ai"
jsonPayload.component="aiComplete"
jsonPayload.errorCode="resource-exhausted"
```

---

## 6. Deployment & Rollback Verification Checklist

### Pre-Deployment Verification
- [ ] Run typescript checks: `npx tsc --noEmit`
- [ ] Run vitest suites: `npm test`
- [ ] Run backend tests: `node --test functions/ai/complete.test.js`
- [ ] Verify `AI_ENABLED = false` in `src/shared/ai/types.ts`.

### Post-Deployment Smoke Tests
- [ ] Verify lead details page loads without errors (AI disabled).
- [ ] Enable local dev flag (`VITE_AI_ENABLED=true`) and verify stub drawer briefs compile.
- [ ] Inspect Firebase Functions console to ensure secrets are correctly bound.

---

## 7. Escalation & Ownership

- **System Owner**: [Placeholder - CRM Engineering Team]
- **On-Call Contact**: [Placeholder - Telecaller App Engineer]
- **API Administrator**: [Placeholder - Firebase Operations Admin]
