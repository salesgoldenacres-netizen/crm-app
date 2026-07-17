# Wave 7 Phase 1 — Agent 4: Knowledge & Search Platform (PLAN ONLY)

**Status:** **PLAN ONLY — documentation; no application code**  
**Date:** 2026-07-14  
**App:** `telecaller-app/`  
**DLS:** remains **v1.4** unless separately authorized  
**Architectural baseline:** Wave 6 CLOSED — PASS ([`wave6-complete.md`](wave6-complete.md))  
**Parent plan:** [`wave7-execution-plan.md`](wave7-execution-plan.md)  
**Conflict risk:** Very low — this file only.

---

## Executive verdict

Golden Acres CRM today has **deterministic lead intelligence** (Wave 6: `lead-score-v1` / health / next-action), **role-scoped lead filters** (Draft → Search → Applied), **WhatsApp messaging SoR** (`whatsappConversations` / `whatsappMessages` + `timelineEvents`), **projects/plots inventory**, and a thin **Training** settings blob (`settings/training` — docs / videos / objections). It does **not** have semantic search, RAG assistants, conversation retrieval, policy/FAQ Q&A, or document intelligence.

Wave 7 Agent 4 designs a **Knowledge & Search Platform** that sits **beside** CRM write paths — read-only over existing sources first, then Phase 2+ indexing — without inventing parallel CRM collections in Phase 1 and without replacing Wave 6 intelligence.

**Phase 1 deliverable = this plan.** Implementation starts only after explicit Wave 7 Phase 1 / Agent 4 slice authorization.

---

## Language (locked for this track)

| Term | Meaning |
| --- | --- |
| **Corpus** | A named set of indexable content units (leads summary, WA messages, project facts, policy docs, FAQ, training docs). |
| **Chunk** | A retrieval unit: text + metadata (`corpus`, `sourceId`, `leadId?`, `projectId?`, `acl`, `updatedAt`). Not a Firestore collection in Phase 1. |
| **Semantic CRM Search** | Natural-language / meaning-aware retrieval over CRM entities (leads, notes summaries, timeline summaries, WA text) — not a replacement for structured filters. |
| **Assistant** | Role-scoped Q&A UI that retrieves chunks, optionally grounds an LLM answer, and always cites sources. Never auto-writes CRM fields. |
| **Index (Phase 2+)** | External or Cloud-hosted vector/keyword store populated by sync jobs. **No new Firestore collections in Phase 1.** |
| **Grounding** | Answer must attach `citations[]` to source chunks; uncited claims are UI-blocked or labeled “ungrounded”. |

---

## 1. Current-state inventory (what exists today)

### 1.1 Search & filters — **structured only**

| Surface | Behavior | Path |
| --- | --- | --- |
| Lead list filters | Draft → Search → Applied; status / source / project / priority / assignee / queue modes | `useLeadsFiltering.ts`, `leadListFilterConfig.ts`, Wave 3 Command Surface |
| Client text match | In-memory string contains on loaded lead set (name/phone/notes heuristics) | Lead list / admin tabs — **not** full-corpus search |
| Phone match (server) | Evolution inbound scans / equality path; `phoneDigits` denorm still Wave 7 backlog (W7-P3) | `functions/messaging/…`, Wave 6 carry-forward |
| Algolia-class search | Explicitly deferred at large N | `wave6-agent5-performance-audit.md`, `wave7-execution-plan.md` |

**Finding:** Search today is **filter + local string match on subscribed leads**. It will not scale to cross-lead conversation retrieval or document Q&A.

### 1.2 Messaging & timeline — **canonical activity SoR**

| Collection / API | Role | Notes |
| --- | --- | --- |
| `whatsappConversations` | Thread headers (`leadId`, preview, unread) | Provider-agnostic |
| `whatsappMessages` | Full message bodies | **Never** on Lead docs |
| `timelineEvents` | Lightweight immutable activity stream | summary ≤ ~200 chars; refs only |
| Typed publishers | `@/shared/contracts/timelinePublisher` | One intent → one emit |
| WA timeline | Server `writeMessage` only | No new WA → `callLogs` |

Refs: [`whatsapp_evolution.md`](whatsapp_evolution.md), Wave 6 Phase 2B.

**Finding:** Best retrieval sources for conversation history are **`whatsappMessages` + timeline summaries**. Legacy `[WhatsApp` in `callLogs` is read-only history — index optionally later, do not re-write.

### 1.3 Projects — **inventory + map, not knowledge base**

| Surface | Behavior | Path |
| --- | --- | --- |
| Projects store | CRUD via `ProjectsRepository`; live from `DatabaseContext` | `useProjectsStore.ts` |
| Admin projects | Form + inventory dashboard | `AdminProjectsTab`, `ProjectFormModal`, `ProjectInventoryDashboard` |
| Maps | Plot geometry / status on project image | `ProjectMap*`, `ProjectMapsView` |
| Lead link | `lead.projectId` / plot booking fields | Lead detail / booking flows |

**Typical project fields today:** `id`, `name`, `location`, `image`, `totalPlots`, `plots[]` (status, points). **No** structured amenities, RERA text, pricing sheets, or FAQ blobs on the project doc.

**Finding:** Project Knowledge Assistant needs a **content layer** (admin-editable facts + documents) layered on existing `projects/{id}` — not a rewrite of plot maps.

### 1.4 Training / objections — **seed for FAQ & Document Intelligence**

| Surface | Behavior | Path |
| --- | --- | --- |
| `settings/training` | Single doc: `documents[]`, `videos[]`, `objections[]` | `useTrainingStore.ts` |
| Documents | `{ id, title, url }` — often placeholder example.com URLs | Dashboard / training widgets |
| Objections | Title + step content arrays | Same |

**Finding:** This is the closest thing to a knowledge base. It is **not searchable**, not versioned, not ACL-segmented, and not chunked. Policy / FAQ / Doc Intelligence should **evolve** this pattern (or successor settings docs) rather than inventing orphan UIs.

### 1.5 Intelligence & AI posture — **deterministic v1 locked**

| Layer | Status |
| --- | --- |
| `LeadIntelligence` / `lead-score-v1` | Compute-on-read; Wave 6 shipped |
| LLM summaries on leads | Contract allows `summary.source: "llm"` — **not implemented** |
| Architecture Owner AI interface | Required for any LLM; never auto-write CRM fields | `wave6-agent0-architecture-review.md` |

**Finding:** Knowledge assistants **consume** the same AI interface / privacy rules as future lead summaries. They must not fork a second Gemini/OpenAI client in feature code.

### 1.6 Gaps (why this track exists)

1. Cannot ask “what did this lead say about budget last week?” across WA threads.  
2. Cannot ask “is plot X RERA approved?” with a cited answer.  
3. Cannot search “leads who asked for metro proximity” beyond keyword luck on loaded rows.  
4. Training PDFs are links, not ingested content.  
5. Policy / discount / SLA answers live in people’s heads or scattered docs.  
6. No shared retrieval API — every feature would otherwise scrape Firestore ad hoc.

---

## 2. Capability map

Six capabilities, one platform. Phase numbers below are **implementation phases after plan auth** — not Wave 6 phases.

| ID | Capability | User value | Primary corpora | Phase (impl) | Priority |
| --- | --- | --- | --- | --- | --- |
| **K1** | **Semantic CRM Search** | Find leads / notes / activity by meaning + filters | Lead cards, timeline summaries, note text, optional WA snippets | 2A foundation → 2B | P0 |
| **K2** | **Project Knowledge Assistant** | Q&A on project facts, inventory highlights, amenities | Project fact sheets + linked docs | 2C | P0 |
| **K3** | **Policy Assistant** | “What’s our discount / SLA / reassign policy?” | Policy markdown / admin-published policies | 2C | P1 |
| **K4** | **FAQ Assistant** | Sales objections & common buyer Qs | Training objections + curated FAQ | 2C (can share K2/K3 UI) | P1 |
| **K5** | **WhatsApp Conversation Retrieval** | Retrieve / summarize thread segments for a lead or query | `whatsappMessages` (+ conversation meta) | 2B (after messaging ACLs) | P0 |
| **K6** | **Document Intelligence** | Ingest PDF/URL training docs → chunk → cite | Training documents + uploaded policy/project files | 2D | P2 |

### Capability relationships

```
                    ┌─────────────────────────────┐
                    │  Knowledge Platform (API)    │
                    │  search / ask / retrieve     │
                    └──────────────┬──────────────┘
           ┌───────────────┬───────┴────────┬──────────────┐
           ▼               ▼                ▼              ▼
     Semantic Search   Assistants      WA Retrieval   Doc Intelligence
         (K1)        (K2/K3/K4)           (K5)            (K6)
           │               │                │              │
           └───────────────┴────────┬───────┴──────────────┘
                                    ▼
                         Indexer (Phase 2+) — external
                         Sources: Firestore reads only
```

### Non-goals (explicit)

- No replacement of Draft → Search → Applied lead filters.  
- No auto status / priority / follow-up writes from assistants.  
- No new Firestore collections in **Phase 1 (this planning doc)**; Phase 2+ prefers **external index** over new CRM collections.  
- No bulk migration of legacy `callLogs` WA tags into the index as a blocker.  
- No second messaging provider stack.  
- No DLS bump for assistant chrome (reuse Modal / Command Surface / Form Contract).  
- No competition with Wave 7 Agent 3 Predictive CRM — knowledge retrieves; predictive scores.

---

## 3. Target architecture

### 3.1 Layering (aligns with repo 3-layer model)

| Layer | Responsibility |
| --- | --- |
| **Directive** | This doc + future `directives/wave7-agent4-*-impl.md` slices |
| **Orchestration** | Agent / product owner: which corpus, ACL, rollout flag |
| **Execution** | Deterministic Cloud Functions + optional Python index jobs in `execution/` when authorized |

### 3.2 Logical components

```
┌──────── CRM UI (telecaller-app) ──────────────────────────────┐
│  Global Search (K1)  │  Assist panel (K2–K4)  │  Lead WA (K5) │
│  Command-palette entry · Lead Detail drawer · Admin knowledge │
└────────────────────────────┬──────────────────────────────────┘
                             │ HTTPS callable / HTTPS endpoint
┌────────────────────────────▼──────────────────────────────────┐
│  knowledgeApi (Architecture Owner–owned surface)              │
│  knowledgeSearch · knowledgeAsk · knowledgeRetrieveConversation │
│  AuthZ: role + lead assignment + manager scope                 │
└─────────────┬───────────────────────────┬─────────────────────┘
              │                           │
   ┌──────────▼──────────┐     ┌──────────▼──────────┐
   │ Retrieval service   │     │ Optional LLM (AO)   │
   │ hybrid: keyword +   │     │ grounded generation │
   │ vector over index   │     │ citations required  │
   └──────────┬──────────┘     └─────────────────────┘
              │
   ┌──────────▼──────────────────────────────────────┐
   │ Index (Phase 2+) — NOT a new Firestore CRM coll │
   │ Options: Vertex AI Vector Search / Typesense /  │
   │ Algolia / Postgres+pgvector (decide at 2A)      │
   └──────────┬──────────────────────────────────────┘
              │ sync jobs (event + scheduled)
   ┌──────────▼──────────────────────────────────────┐
   │ Source readers (existing collections only)      │
   │ leads · timelineEvents · whatsappMessages ·     │
   │ projects · settings/training · (future policy)  │
   └─────────────────────────────────────────────────┘
```

### 3.3 Indexing approach (Phase 2+ — planned now, not built in Phase 1)

**Principle:** Keep Firestore as **system of record**. The knowledge index is a **derived, disposable** projection (same spirit as `.tmp/` intermediates). If the index is wiped, rebuild from sources.

| Decision | Recommendation | Rationale |
| --- | --- | --- |
| Where vectors live | **External index**, not new Firestore collection | Avoids large embedding docs, query cost, and rules complexity |
| Chunk ID scheme | Deterministic: `{corpus}:{sourceId}:{chunkOrdinal}` | Idempotent upserts; safe re-sync |
| Sync triggers | (1) Scheduled full/incremental crawl (2) Event hooks on message write / lead update / training save | Messaging already has server write path — best hook for K5 |
| PII in index | Store **minimum text** + `leadId`; redact phone/email in project/policy corpora; WA chunks inherit lead ACL | Privacy §6 |
| Dual retrieval | Hybrid BM25/keyword **+** vector; merge with reciprocal rank fusion | Names/phones need exact; “budget concern” needs semantic |
| Embedding model | Single AO-chosen model; version stamp on chunks (`embedModel`) | Avoid silent drift |
| Delete / GDPR | Soft-delete source → delete chunks by `sourceId` prefix | Lead merge must re-key or dual-alias |

**Phase 1 constraint:** Document the approach only. **Do not** create `knowledgeChunks`, `embeddings`, or similar Firestore collections in this phase.

### 3.4 Corpus catalog (planned)

| Corpus ID | Source of truth (existing) | Chunk strategy | ACL |
| --- | --- | --- | --- |
| `crm.lead_card` | `leads/{id}` projected fields (name, status, project, notes excerpt, score band) | 1–3 chunks / lead | Same as lead visibility (assignee / manager) |
| `crm.timeline` | `timelineEvents` `summary` (+ type) | 1 event ≈ 1 chunk (or merge short windows) | Via `leadId` |
| `crm.whatsapp` | `whatsappMessages.text` | Message or sliding window (N msgs) | Via `leadId` + conversation assignment |
| `project.facts` | `projects/{id}` + **admin fact sheet** (settings or fields added later under AO) | Section chunks | All authenticated staff (non-PII) |
| `policy` | New admin-published content in **existing** `settings/*` doc(s) or Storage files referenced from settings — **not** a new collection in Phase 1 design; Phase 2 may extend `settings` docs only with AO approval | Section / heading chunks | Role-gated (agents vs managers) |
| `faq` | `settings/training.objections` + curated FAQ entries | 1 Q&A = 1–2 chunks | All sales roles |
| `docs.training` | `settings/training.documents` URLs → fetched text (K6) | Page/paragraph chunks | All sales roles; mark sensitivity |

---

## 4. Dependencies

### 4.1 Hard dependencies (must respect)

| Dependency | Why | Owner / baseline |
| --- | --- | --- |
| **Messaging SoR** | K5 reads `whatsappMessages` / conversations; must not reintroduce callLogs WA writes | Wave 6 + `whatsapp_evolution.md` |
| **Timeline discipline** | K1 may index `timelineEvents.summary` only — never invent bodies | Wave 6 Phase 2B publishers |
| **Query scopes** | Search results must honor agent `assignedTo` vs managerial scope | `@/shared/contracts/queryScopes` |
| **Projects** | K2 needs stable `projectId` on leads + project docs | `useProjectsStore` / `ProjectsRepository` |
| **AO AI interface** | Any LLM path for Ask / Doc summarization | Agent 0 architecture lock |
| **Wave 6 intelligence** | Lead card chunks may include score/health **read-only**; do not fork scorers | `leadIntelligence.ts` |
| **DLS v1.4** | UI uses Modal / Command Surface / Input / EmptyState patterns | Waves 1–5 |

### 4.2 Soft / sequencing dependencies

| Item | Impact |
| --- | --- |
| **W7-P3 `phoneDigits`** | Improves exact phone hit rate in hybrid search — nice-to-have, not blocker for semantic |
| **W7-P1 manager pagination** | Managers with >500 leads need server search sooner; agents OK longer on scoped sets |
| **Training URL quality** | K6 blocked until real document URLs replace placeholders |
| **Predictive CRM (Wave 7 Agent 3)** | Independent; may later surface “why” text into lead cards — knowledge should cite, not re-score |
| **Automation slice 2** | Unrelated; do not couple |

### 4.3 What Agent 4 must **not** own

- Messaging provider plugins / webhook auth  
- Timeline publisher core  
- Lead status transition API  
- Firestore rules / indexes for CRM write paths (AO)  
- Predictive model training (Agent 3)  
- DLS version bumps  

---

## 5. API design (planned contracts)

All callables are **Architecture Owner–owned** shapes. Feature UI imports types from `@/shared/contracts` (or successor `knowledge.ts`) once authorized — **no ad-hoc Functions payloads**.

### 5.1 `knowledgeSearch` (K1)

```ts
// Planned shape — not implemented in Phase 1
interface KnowledgeSearchRequest {
  query: string;
  corpora?: Array<
    | "crm.lead_card"
    | "crm.timeline"
    | "crm.whatsapp"
    | "project.facts"
    | "policy"
    | "faq"
    | "docs.training"
  >;
  filters?: {
    projectId?: string;
    leadId?: string;
    status?: string[];
    assignedTo?: string; // managers only
    dateFrom?: string;
    dateTo?: string;
  };
  limit?: number; // default 20, max 50
  mode?: "hybrid" | "keyword" | "semantic";
}

interface KnowledgeHit {
  chunkId: string;
  corpus: string;
  score: number;
  title: string;
  snippet: string;
  citation: {
    sourceType: string;
    sourceId: string;
    leadId?: string;
    projectId?: string;
    url?: string;
    timestamp?: string;
  };
}

interface KnowledgeSearchResponse {
  hits: KnowledgeHit[];
  tookMs: number;
  degraded?: "keyword_only" | "index_unavailable";
}
```

**AuthZ:** Server applies role scope before query; never trust client `assignedTo` for agents.

### 5.2 `knowledgeAsk` (K2–K4, optional K6)

```ts
interface KnowledgeAskRequest {
  question: string;
  assistant: "project" | "policy" | "faq" | "general";
  context?: { projectId?: string; leadId?: string };
  allowLlm?: boolean; // default true when AO enables; false = extractive only
}

interface KnowledgeAskResponse {
  answer: string;
  grounded: boolean;
  citations: KnowledgeHit[];
  assistant: string;
  model?: string;
  refusalReason?: "no_sources" | "acl" | "unsafe" | "llm_disabled";
}
```

**Rules:** If retrieval returns zero in-ACL hits → refuse. LLM must not invent policy. Prefer extractive answer (quoted snippets) when `allowLlm=false` or budget exhausted.

### 5.3 `knowledgeRetrieveConversation` (K5)

```ts
interface KnowledgeRetrieveConversationRequest {
  leadId: string;
  query?: string;          // optional semantic filter within thread
  conversationId?: string;
  limit?: number;          // messages or windows
  dateFrom?: string;
  dateTo?: string;
}

interface KnowledgeRetrieveConversationResponse {
  leadId: string;
  conversationId?: string;
  windows: Array<{
    startAt: string;
    endAt: string;
    messageIds: string[];
    text: string;          // concatenated window for UI / LLM
    directionMix: "inbound" | "outbound" | "mixed";
  }>;
  hits?: KnowledgeHit[];   // when query present
}
```

**AuthZ:** Same as opening Lead WhatsApp panel — assignee or managerial role. Prefer reading Firestore with existing bounded queries when `query` empty; use index when `query` set.

### 5.4 Admin / ops (Phase 2+)

| Callable / job | Purpose |
| --- | --- |
| `knowledgeReindex` (admin) | Rebuild corpus subset; rate-limited |
| `knowledgeIndexStatus` | Lag, last sync, embed model version |
| Scheduled `knowledgeSyncIncremental` | Catch missed events |

### 5.5 Client facade (future)

```
telecaller-app/src/features/knowledge/
  api/knowledgeApi.ts      # callable wrappers only
  hooks/useKnowledgeSearch.ts
  hooks/useKnowledgeAsk.ts
  components/...
```

No feature may call vendor SDKs directly.

---

## 6. UI concepts (DLS v1.4 — conceptual only)

### 6.1 Global Semantic Search (K1)

- **Entry:** Extend Command Surface / header search — **additive mode toggle**: `Filters` (today) vs `Ask CRM` (semantic).  
- **Preserve:** Draft → Search → Applied for structured filters; semantic mode is a **separate** results panel, not a silent replacement.  
- **Results:** Grouped list — Leads · Messages · Timeline · Projects · Docs — each row = snippet + citation chip → navigates to Lead Detail / project / doc URL.  
- **Empty / degraded:** Use shared `EmptyState`; if index down, fall back to keyword-on-scoped-leads and badge “Limited search”.

### 6.2 Assistants panel (K2 / K3 / K4)

- **Host:** Shared `Drawer` or `Modal variant="sheet"` from Lead Detail **and** Admin / Training area.  
- **Tabs or segmented control:** Project · Policy · FAQ (one chrome, three system prompts / corpora).  
- **Layout:** Question input → answer block → **Citations list** (mandatory) → “Open source” actions.  
- **No cards in hero sense** — quiet list of citations; avoid promo chrome.  
- **Copy button** for answer text into notes / WA composer — user pastes; assistant does not send WhatsApp.

### 6.3 WhatsApp retrieval (K5)

- **Surface:** Inside existing WhatsApp inbox / `LeadWhatsAppPanel` — “Find in conversation” search field.  
- **Results:** Jump-to-message + optional “Summarize this window” (LLM behind flag).  
- **Do not** build a second inbox.

### 6.4 Document Intelligence (K6)

- **Admin:** Training documents list gains “Ingest status” (pending / ready / failed) — presentation on existing training settings.  
- **Agent:** Hits appear under Docs in global search; Ask FAQ may cite ingested paragraphs.

### 6.5 Accessibility & theme

- Light + dark tokens only (`theme-*` / `dark:`).  
- Focus trap via shared Modal/Drawer.  
- Answers as readable prose; citations as links/buttons with clear names — no emoji policy violations.

---

## 7. Privacy, security & compliance

| Control | Requirement |
| --- | --- |
| **ACL mirror** | Index metadata must include enough to filter by lead assignment / role; server enforces again at query time |
| **No cross-tenant leak** | Single-tenant today; still design `orgId` field on chunks for future |
| **PII minimization** | Policy/FAQ/project corpora must not embed raw customer phones; WA/lead corpora are PII-heavy — manager audit log on Ask |
| **Prompt injection** | Treat retrieved WA/customer text as **untrusted**; system prompt separates instructions vs documents |
| **Retention** | Align chunk TTL with message retention; delete on lead delete/merge |
| **LLM egress** | AO decides region / vendor; log prompt sizes; redaction pass before send (phones, gov IDs) |
| **Secrets** | API keys in `.env` / Functions config only — never client |
| **Audit** | Optional `knowledge_query` audit for Ask on PII corpora (admin-only review) |
| **Human-in-loop** | Assistants never mutate CRM; outbound WA remains explicit user action |

---

## 8. Rollout plan

| Stage | Gate | Scope |
| --- | --- | --- |
| **Phase 1 (now)** | This doc accepted | Plan only — no code, no collections, no indexes |
| **Phase 2A** | User: authorize Knowledge foundation | AO contracts (`knowledge.ts`); choose index vendor; stub callables returning `degraded`; feature flag `knowledge.enabled` |
| **Phase 2B** | 2A accepted | Indexer for `crm.lead_card` + `crm.timeline` + `crm.whatsapp`; `knowledgeSearch` + K5 retrieve; UI global search + WA find-in-thread |
| **Phase 2C** | 2B quality OK | Project facts content model (extend project/settings under AO); Policy + FAQ assistants; `knowledgeAsk` extractive then LLM |
| **Phase 2D** | Docs URLs real | Document ingest pipeline (K6); reindex admin; evaluation set |
| **Ops** | Parallel | Monitoring, cost caps, reindex runbooks |

**Feature flags (planned):**

- `knowledge.search`  
- `knowledge.ask.project` / `.policy` / `.faq`  
- `knowledge.whatsappRetrieve`  
- `knowledge.llm` (master LLM switch)  
- `knowledge.docIngest`  

**Rollout cohort:** Internal admins → one team of agents → all managerial → all agents.

---

## 9. Risks & mitigations

| Risk | Severity | Mitigation |
| --- | --- | --- |
| Index ACL bug leaks other agents’ leads | **Critical** | Dual filter (index metadata + server re-check); integration tests with two agents |
| LLM hallucinates policy / pricing | **High** | Citations required; refuse if ungrounded; extractive-first for Policy |
| Cost blow-up (embed every WA message) | **High** | Windowed chunks; skip media-only; sample old threads; budget alarms |
| Dual search UX confuses agents | **Medium** | Clear mode labels; keep filters primary for daily queue |
| Training placeholder URLs break ingest | **Medium** | K6 gated on real Storage URLs; status = failed with reason |
| Competing with Predictive Agent 3 | **Low** | Separate docs/APIs; knowledge does not emit scores |
| Pressure to add Firestore vector collection | **Medium** | This plan forbids CRM collection sprawl; external index only unless AO revises |
| Stale index after lead merge | **Medium** | Merge hook → reindex target, delete source chunks |
| Over-scoping Admin Dashboard rewrite | **Medium** | Knowledge UI is additive panels — not a new admin IA wave |

---

## 10. Effort estimate (implementation, post-auth)

Rough engineering effort for a mid-level pair + AO review. **Not** a commitment.

| Slice | Scope | Effort |
| --- | --- | --- |
| **2A Foundation** | Contracts, flags, vendor spike, stub API, authZ harness | **3–5 days** |
| **2B Search + WA retrieval** | Sync jobs for lead/timeline/WA; hybrid search UI; find-in-thread | **8–12 days** |
| **2C Assistants** | Project facts content, policy/FAQ corpora, Ask UI, extractive + LLM | **6–10 days** |
| **2D Doc intelligence** | Fetch/parse PDF, chunk, ingest status, cite in Ask/Search | **5–8 days** |
| **Hardening** | Eval set (~50 queries), ACL tests, cost caps, runbooks | **3–5 days** |
| **Total (sequential)** | | **~5–8 weeks** |
| **Parallelized (indexer ∥ UI)** | | **~3–5 weeks** calendar |

Phase 1 planning doc: **done** (this artifact).

---

## 11. Evaluation & acceptance (for later impl phases)

| Capability | Acceptance sketch |
| --- | --- |
| K1 | Top-5 recall ≥ target on gold query set; phone/name exact still works; agent cannot see other agents’ hits |
| K2 | Project questions return cited project facts; unknown → refusal |
| K3 | Policy answers match published text; adversarial “ignore policy” prompts fail closed |
| K4 | Objection FAQs retrieve correct playbook steps |
| K5 | Query within lead thread returns correct window; empty query lists recent bounded messages via existing hooks |
| K6 | Ingested PDF paragraphs appear in search with doc title citation |

---

## 12. Open decisions (resolve at Phase 2A auth — not blockers for this plan)

1. **Index vendor:** Vertex Vector Search vs Typesense vs Algolia vs pgvector — pick on cost, ops familiarity, hybrid search support.  
2. **Project facts storage:** Extend `projects/{id}` fields vs `settings/projectKnowledge/{projectId}` — AO chooses; prefer **no new top-level collection** if settings/subdocs suffice.  
3. **Policy source of truth:** Markdown in Admin vs Google Doc sync — start Admin-published text.  
4. **LLM provider:** Align with future lead-summary S1 interface.  
5. **Whether managers’ semantic search bypasses 500-lead cap** via server-only path (recommended: yes).

---

## 13. Cross-agent coordination

| Track | Interaction |
| --- | --- |
| **Wave 7 Agent 3 (Predictive)** | Orthogonal; may later display probabilities next to search hits — do not share scorers |
| **Agent 0 / AO** | Owns `knowledge*` contracts, Functions, index credentials, rules |
| **Messaging maintainers** | Event hook on `writeMessage` for near-real-time WA indexing |
| **Projects / Admin** | Fact-sheet editing UX for K2 |
| **Wave 6 freeze** | Do not reopen timeline/intelligence/automation features |

---

## 14. Phase 1 checklist (this agent)

- [x] Capability map (K1–K6)  
- [x] Architecture + indexing approach without new Phase 1 collections  
- [x] Dependencies on messaging/timeline + projects  
- [x] Planned APIs  
- [x] UI concepts under DLS v1.4  
- [x] Privacy controls  
- [x] Rollout stages + flags  
- [x] Risks + effort  
- [x] No application code modified  

---

## STOP

**Wave 7 Agent 4 Phase 1 is PLAN ONLY.**  

Await explicit authorization (e.g. **“Authorize Wave 7 Knowledge Phase 2A”** or broader Wave 7 Phase 1 implementation auth) before contracts, Functions, index provisioning, or UI.

**Artifact:** [`directives/wave7-agent4-knowledge-platform.md`](wave7-agent4-knowledge-platform.md)
