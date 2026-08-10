# Webhook API — Golden Acres Cloud Functions

HTTP surface exposed by `telecaller-app/functions` (`exports.api`, region `us-central1`).

Base URL (production Hosting rewrite / Cloud Functions):

```
https://us-central1-<project-id>.cloudfunctions.net/api
```

(Exact host may vary with Firebase project config.)

**Auth policy:** fail-closed. Endpoints reject requests when the expected secret is missing or mismatched. This document lists **header / query names only** — never commit secret values.

---

## Auth header & query names

| Mechanism | Where presented | Validated against (config field / env) |
|-----------|-----------------|----------------------------------------|
| `Authorization` | Request header (`Bearer <secret>` allowed) | `apiWebhookKey` / `API_WEBHOOK_KEY` |
| `x-api-key` | Request header | `apiWebhookKey` / `API_WEBHOOK_KEY` |
| `x-webhook-secret` | Request header (WhatsApp) | `evolutionWebhookSecret` or `apiWebhookKey` |
| `google_key` / `googleKey` | Body or query | `googleWebhookKey` / `GOOGLE_WEBHOOK_KEY` |
| `hub.verify_token` | Query (Meta GET subscribe) | `metaVerifyToken` / `META_VERIFY_TOKEN` |
| Meta Graph access | Server-side only | `metaAccessToken` / `META_ACCESS_TOKEN` |

Presented secrets are normalized (trim + strip optional `Bearer ` prefix) before compare.

---

## HTTP routes

Legacy short paths and `/api/webhooks/*` aliases both work.

### Lead webhooks

| Method | Paths | Purpose |
|--------|-------|---------|
| `GET` | `/leads`, `/api/webhooks/leads` | Meta subscription verify (`hub.mode`, `hub.verify_token`, `hub.challenge`) |
| `POST` | `/leads`, `/api/webhooks/leads` | Ingest single lead (Google key, Meta leadgen, or generic JSON) |
| `POST` | `/leads/bulk`, `/api/webhooks/leads/bulk` | Bulk lead ingest (generic API key) |
| `POST` | `/ivr`, `/api/webhooks/ivr` | IVR / telephony lead touch (generic API key) |

**Generic POST auth:** `Authorization` **or** `x-api-key`.

**Google Ads path:** body/query `google_key` compared to configured Google webhook key.

**Meta path:** uses configured Meta access token server-side when leadgen payload is detected.

**Meta multi-entry correctness (Phase A):** each `leadgen` change in `entry[].changes[]` is processed independently — one create / intentional phone-duplicate skip|merge / or explicit failure per `leadgen_id`. `ingestEvents/meta_leadgen_<id>` is claimed **only after** successful create or intentional duplicate handling (not before Graph fetch / create). Structured log line: `event=meta_ingest` with `entriesReceived`, `leadsCreated`, `duplicates`, `failed`, `durationMs`, `requestId`.

**Verify Meta multi-entry locally:**
1. `cd telecaller-app/functions && npm test` — covers `webhooks/metaLeadgen.test.js` (collect / parse / log helpers).
2. POST a page webhook body with **two** distinct `leadgen_id` values (simulator or curl against emulator). Expect `leadsCreated: 2` (or mix of created + duplicates) — never a single lead for two paid entries.
3. Replay the same payload: expect `duplicates` incremented via `idempotent_skip`, no extra leads.
4. Confirm Cloud logs contain one JSON `meta_ingest` summary per request.

### WhatsApp / Evolution

| Method | Paths | Purpose |
|--------|-------|---------|
| `GET`/`POST` | `/webhooks/whatsapp`, `/api/webhooks/whatsapp` | Provider webhook ingress |

**Auth:** `x-webhook-secret` preferred; also accepts `Authorization` / `x-api-key`. Secret resolves to Evolution webhook secret if set, else API webhook key.

---

## Callable functions (not HTTP Express routes)

Invoked via the Firebase Callable SDK (`httpsCallable`), region `us-central1`. All callables below
require an authenticated caller (`request.auth`); some add role checks. Shapes are derived from the
handler source (`functions/ai/complete.js`, `functions/auth/claims.js`, `functions/services/*.js`) —
keep this section in sync when those handlers change. Errors are thrown as Firebase `HttpsError`
(the `code` values are listed per function).

### `aiComplete`

Hardened Gemini boundary. The **server** owns prompt/model/response mode; the client may only send a
registered capability + structured context. No CRM writes, no AI persistence.

- **Request:** `{ capabilityId: string, context: object, leadId?: string }`
  - Only these keys are accepted. Transport-control keys (`system`, `messages`, `responseFormat`,
    `jsonSchema`, `maxTokens`, `temperature`, `model`) are rejected.
  - `context` fields are constrained per capability. Registered capability `lead-brief-v1` accepts:
    `statusLabel`, `scoreBand`, `health`, `nextActionType`, `nextActionReason`, `timelineSummary`, `facts`.
    PII is redacted server-side; forbidden write/intelligence keys are stripped.
- **Response** (JSON capability): `{ text: string, json: { brief: string, bullets?: string[], proposals?: AiActionProposal[] }, model: string, providerId: "gemini", latencyMs: number, finishReason: string, usage: { inputTokens?: number, outputTokens?: number } }`
  - `AiActionProposal` is confirm-to-write only (`status: "PENDING_CONFIRMATION"`), `type` ∈
    `STATUS_CHANGE | PRIORITY_CHANGE | FOLLOW_UP | ADD_NOTE | RECOMMEND_ASSIGNMENT`, with a
    type-specific `payload`. Proposals are inert until a human confirms them.
- **Errors:** `unauthenticated`, `invalid-argument`, `permission-denied`, `failed-precondition`,
  `resource-exhausted`, `internal`.

### `setManagerialClaim`

Sets/clears the `{ managerial: true }` custom claim (and optional `role`). Caller must already be
managerial (token claim or Firestore `userRoles` + `customRoles`).

- **Request:** `{ uid: string, managerial: boolean, role?: string }`
- **Response:** `{ success: true, uid: string, managerial: boolean, role: string | null }`
- **Errors:** `unauthenticated`, `permission-denied`, `invalid-argument`.

### `linkUserProfile`

Links the caller's Auth UID to an existing `users` doc (matched by token email, then username).

- **Request:** `{}` (no body; identity comes from `request.auth.token`)
- **Response:** `{ success: true, userId: string, uid: string, role: string }`
- **Errors:** `unauthenticated`, `failed-precondition` (no email), `not-found`, `already-exists`.

### `sendFcmNotification`

Sends an FCM push to a target user (prunes invalid tokens).

- **Request:** `{ targetUserId: string, title: string, body: string, extraData?: Record<string, string> }`
- **Response:** `{ success: true }`
- **Errors:** `unauthenticated`, `invalid-argument`.

### `triggerOutboundCall`

Initiates an IVR outbound call for a lead using the configured provider (`settings/integrations`).

- **Request:** `{ leadId: string }`
- **Response** (mock provider): `{ success: true, message: string }`. Custom/HTTP providers return a
  success object after dispatch.
- **Errors:** `unauthenticated`, `not-found`, `invalid-argument`, `failed-precondition`.

### Messaging callables (WhatsApp / Evolution)

| Function | Request | Response |
|----------|---------|----------|
| `messagingStatus` | `{}` | Provider status, e.g. `{ connected: boolean, message?: string, ... }` |
| `messagingTestConnection` | `{}` | Provider `testConnection()` result |
| `messagingInstanceAction` | `{ action: "qr" \| "reconnect" \| "disconnect" \| "createInstance", instanceName?: string }` | Provider action result (e.g. QR payload / instance info) |
| `messagingSend` | `{ leadId: string, type?: "text" \| "image" \| "document" \| "audio", text?: string, mediaUrl?: string, mediaMimeType?: string, mediaFileName?: string, templateId?: string }` | See below |

`messagingSend` responses:
- **Sent:** `{ ok: true, connected: true, messageId: string, conversationId: string, status: "sent", providerMessageId: string \| null }`
- **Not connected:** `{ ok: false, connected: false, messageId: string, conversationId: string, status: "failed", error: string, webhookUrl: string }`
- **Errors:** `unauthenticated`, `invalid-argument` (missing `leadId`), `not-found` (lead), `failed-precondition`, `unimplemented` (e.g. audio), `internal`.

Firestore triggers and schedulers (`onLeadCreated`, `onCallLogCreated`, follow-up reminders, SLA jobs, etc.) are internal — not public HTTP or callable.

---

## Local testing notes

- Functions unit tests cover pure helpers (clean lead data, allocation pick, predicates, phone) via `npm test` in `functions/`.
- Do **not** put real webhook secret values in tests or docs; use placeholders only.
- Webhook simulator UI (admin) is for authorized operators only.
