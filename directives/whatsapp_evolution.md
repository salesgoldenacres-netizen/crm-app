# WhatsApp Business Platform (MessagingProvider)

## Goal
First-class WhatsApp conversations in Golden Acres CRM through a **provider-agnostic** messaging layer. Evolution API is the V1 plugin — not the foundation of the architecture.

```
MessagingProvider
├── EvolutionProvider (V1)
├── MetaCloudProvider (future)
└── TwilioProvider (future)
```

CRM UI → Firebase Callables → MessagingProvider → Provider plugin → WhatsApp  
Inbound: Provider webhook → Cloud Functions → Firestore (conversations / messages / timeline)

## Canonical data model
| Collection | Role |
|---|---|
| `whatsappConversations` | Top-level threads (`leadId`, phone, unread, last preview) |
| `whatsappMessages` | Full message bodies (never embedded on Lead docs) |
| `timelineEvents` | Lightweight immutable CRM activity stream |

Lead docs may hold pointers only (`whatsappConversationId`, `whatsappLastMessageAt`).

## Legacy (read-only)
- `leads/{leadId}/whatsappMessages` — compatibility reads
- `[WhatsApp Sent|Received]` in `callLogs` — history display only
- **No new WhatsApp writes to callLogs**
- **No bulk migration** of historical callLogs into timelineEvents in V1

## Timeline
`timelineEvents` is the source of truth for **new** CRM activity:
WhatsApp in/out · call completed · note · status · assign · follow-up · lead created · booked/converted

Lead Timeline UI: (1) `timelineEvents` primary (2) legacy `callLogs` section

Events store refs + short summary only — never full message/note/call bodies. Immutable after create.

## Admin setup (configure-only)
1. Control Panel → Integrations → **WhatsApp Business**
2. Select provider (Evolution V1), enable, set Base URL / API Key / Instance Name
3. Optional: Instance Token, Webhook Secret
4. Save (secrets → `settings/integrations_secrets`)
5. Copy Webhook URL into provider instance config
6. Connection Test → Create Instance (optional) → Generate QR / Reconnect

Webhook URL:  
`https://us-central1-golden-acres-projects.cloudfunctions.net/api/api/webhooks/whatsapp`

## Callables
`messagingStatus` · `messagingTestConnection` · `messagingInstanceAction` (`qr`|`reconnect`|`disconnect`|`createInstance`) · `messagingSend`

## UI surfaces
- Three-panel WhatsApp Inbox (conversations | chat | lead)
- Lead page WhatsApp summary panel
- In-call WhatsApp side panel (persistent during active dialer call)
- Admin connection badges + webhook health

## Offline
UI stays usable. Sends create `whatsappMessages` with `status: failed` and timeline events until the provider is connected.
