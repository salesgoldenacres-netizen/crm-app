---
name: crm-design-context
description: >-
  Restores Golden Acres CRM Design Language / UI modernization wave context
  (dashboard, DataTable, filters, forms, DLS, ui-registry, Waves 1–9). Use when
  starting a new session on CRM UI modernization, Design Language work,
  ui-registry, Wave 1–9 tasks, or when the user says restore design context /
  continue UI modernization.
---

# CRM Design Context

Program continuity for the Golden Acres CRM **Design Language** modernization — not a full chat transcript.

## Relationship to `/remember`

| Skill | Role |
| --- | --- |
| **`/remember`** | Session handoff — save/restore the latest `memory.md` |
| **`crm-design-context`** | Program continuity — waves, locked rules, artifact index for Design Language work |

Use both: restore session state with `/remember restore`, then (or instead when the topic is UI waves) invoke this skill so the agent reloads DLS + wave docs.

## On invoke / start of related work

1. **Read in order:**
   - `memory.md` (if it exists)
   - `ui-registry.md` — canonical DLS; note the **current version** in the header
   - Latest relevant wave complete/validation docs in `directives/` for the wave in progress
2. **Summarize restored context to the user** before continuing (wave status, DLS version, next step, residuals).
3. **Never invent a second design system** — follow locked Wave rules and `ui-registry.md`.
4. **Never persist secrets** (keys, tokens, credentials) into memory, skills, or directives.

## Locked program state

**Completed**

- Wave 1 Dashboard + primitives — closed
- Wave 1.5 stabilization — closed
- Wave 2 DataTable — closed, DLS **v1.1**
- Wave 3 Filters / Command Surface — closed, DLS **v1.2**
- Wave 4 Forms — closed, DLS **v1.3** (Form Contract §3e **canonical**)
- Wave 5 Modals & Drawers — closed, DLS **v1.4** (Modal/Drawer Contract §3f **canonical**; Phase 4 static/tooling PASS)
- Wave 6 CRM Intelligence & Workflow Automation — **closed, PASS** (Phases 1 + 2A–2E); DLS **unchanged v1.4**; no LLM / no schema redesign. Do **not** reopen Wave 6 features. Phase docs are immutable archives — see `directives/wave6-archive-index.md`.
- Wave 7 Phase 1 AI / feature planning — **COMPLETE — PASS** (Agents 0–5 docs only). DLS **v1.4** unchanged. No production code / no providers.
- Wave 7 Phase 2A AI Platform Foundation — **COMPLETE — PASS** (`@/shared/ai` stub / orchestrator / `lead-brief-v1` / flags / safety). AI **off by default**.
- Wave 7 Phase 2B Sales Copilot Foundation (SC-1) — **COMPLETE — PASS** (read-only Copilot Drawer on Lead Detail; rules fallback; display safety). DLS **v1.4** unchanged. No live provider / no CRM writes.

**Next up**

Wave 7 **Phase 2C GATED** — Live Provider Integration & Confirm-to-Write. Recommended auth: **W7-AI-2** / Phase 2C. See `directives/wave7-execution-plan.md`, `wave7-phase2b-validation.md`. Do **not** connect live providers or add confirm-write CTAs without named user authorization. Do not reopen Wave 6.

**Remaining roadmap**

Wave 7 Phase 2C+ (live provider / confirm writes / optional Predictive·MI·Knowledge) → Admin Dashboard (when scoped) → 8 Reports → 9 Settings.

**Locked principles**

- Presentation-only for Design Language waves; Wave 6 was business-capability (contracts/automation/intelligence/perf) — extend those contracts rather than forking
- No theme engine rewrite
- No business logic / Firestore / query / Zod changes unless separately scoped
- Primitive-first; outside-in (shared chrome → consumers)
- DLS bump only after validation + user authorize — **stay on v1.4** unless authorized
- Filters: Apply model **Draft → Search → Applied** (do not change)
- Overlays: `Modal` / `Dialog` / `Drawer` only — no parallel Sheet system; remaining ~45 alert/confirm are residuals
- `--radius` default **12**; brand as accent
- Emoji / motion policies (calm persistent UI; celebration transient only)
- Table Hierarchy; Command Surface; Form Contract **§3e canonical (v1.3)**; Modal/Drawer Contract **§3f canonical (v1.4)**
- Architecture layer locked unless Agent 0 is activated for a shared defect
- Automation: extend `createScheduledJob` + IST + create-only notify; intelligence: compute-on-read unless product expands scope
- Wave 7 AI: CRM SoT; rules-first; no silent writes; single provider abstraction; Predictive additive; Knowledge external index

## Key artifacts index

| Artifact | Path |
| --- | --- |
| Canonical DLS | `ui-registry.md` (v1.4) |
| Session handoff | `memory.md` |
| Wave 1 | `directives/wave1-*.md`, `directives/wave1.5-report.md` |
| Wave 2 | `directives/wave2-*.md` |
| Wave 3 | `directives/wave3-*.md` |
| Wave 4 | `directives/wave4-*.md`, especially `wave4-complete.md`, `wave4-phase4-validation.md` |
| Wave 5 | `directives/wave5-*.md`, especially `wave5-complete.md`, `wave5-phase4-runtime-validation.md` |
| Wave 6 (closed) | `directives/wave6-complete.md`, `wave6-final-summary.md`, `wave6-change-log.md`, `wave6-archive-index.md` |
| Wave 7 Phase 1 (complete) | `directives/wave7-execution-plan.md`, `wave7-ai-architecture.md`, `wave7-agent0-architecture.md` … `wave7-agent5-validation.md`, `wave7-phase1-executive-report.md`, `wave7-risk-assessment.md` |
| Wave 7 Phase 2A (complete) | `directives/wave7-phase2a-notes.md`, `wave7-phase2a-validation.md`, `ai-architecture-overview.md`, `prompt-contracts.md`, `telecaller-app/src/shared/ai/` |
| Wave 7 Phase 2B (complete) | `directives/wave7-phase2b-notes.md`, `wave7-phase2b-validation.md`, `telecaller-app/src/features/leads/copilot/` |

App root for UI code: `telecaller-app/`.

## Operating rules

- Gate each phase: audit → primitives → validation → consumer adoption → DLS bump (UI waves); Wave 6 pattern was audit → Agent 0 contracts → feature slices → validation → formal close.
- Prefer evolving existing primitives / contracts over new frameworks.
- Multi-agent polish: freeze shared ownership islands; parallelize independent agents; sequence dependents; Agent 0 only for shared defects; closeout agent last.
- Soft residuals (screenshots, sidebar polish, remaining alert/confirm, MANUAL QA overlays, Wave 6 carry-forward) stay deferred unless the user reopens them — do not block later waves.
- After meaningful wave progress, remind the user to `/remember save` so `memory.md` stays current.
