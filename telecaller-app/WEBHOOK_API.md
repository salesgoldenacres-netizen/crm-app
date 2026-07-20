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

Invoked via Firebase Callable SDK (Auth required where enforced in handlers), including:

- `aiComplete`
- `setManagerialClaim` / `linkUserProfile`
- `messagingStatus` / `messagingTestConnection` / `messagingInstanceAction` / `messagingSend`
- `sendFcmNotification`
- `triggerOutboundCall`

Firestore triggers and schedulers (`onLeadCreated`, follow-up reminders, SLA jobs, etc.) are internal — not public HTTP.

---

## Local testing notes

- Functions unit tests cover pure helpers (clean lead data, allocation pick, predicates, phone) via `npm test` in `functions/`.
- Do **not** put real webhook secret values in tests or docs; use placeholders only.
- Webhook simulator UI (admin) is for authorized operators only.
