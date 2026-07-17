> **Status = Phase 1 audits authorized; no implementation until Phase 2 auth.**

# Wave 6 — Multi-Agent Execution Plan
## Status
**PLAN ONLY — No coding until explicitly authorized.**

### Premise

Waves 1–5 are complete.

Wave 6 shifts from UI architecture to **CRM Intelligence & Workflow Automation**.

This wave is **business capability focused**, not another UI redesign.

The objective is to maximize parallel execution while protecting architecture ownership and minimizing merge conflicts.

---

# Architecture Owner (Single Thread)

The following systems are **locked** and may only be modified by the Architecture Owner.

## Locked

- Timeline Engine core
- Shared automation engine
- Firestore collections
- Shared repositories/services
- Notification infrastructure
- AI service interfaces
- Existing routing
- Existing authentication
- Shared types
- DLS documentation
- Architecture documentation

No feature agent may modify these.

---

# Agent 0 — Architecture Owner

## Scope

Own every shared system.

Responsible for

- Timeline event architecture
- Automation engine
- Shared services
- Shared repositories
- Event publishers
- Notification service
- AI abstraction layer
- Shared types
- Merge conflict resolution

Do NOT

- Build feature UI
- Modify business workflows
- Implement feature screens

Deliverables

- Stable shared APIs
- Canonical event model
- Canonical automation interfaces

Runs continuously.

---

# Agent 1 — CRM Workflow Audit

## Scope

Audit the complete sales workflow.

Review

- Lead lifecycle
- Assignment
- Status transitions
- Calling workflow
- WhatsApp workflow
- Site visit workflow
- Booking workflow
- Lost lead workflow
- Follow-up workflow

Deliver

- Workflow diagrams
- Bottlenecks
- Duplicate processes
- Missing automations
- UX friction report

Do NOT

- Change code
- Refactor UI
- Modify Firestore

Done when

Complete workflow audit document is produced.

Conflict Risk

Very Low

---

# Agent 2 — Timeline Intelligence

## Scope

Audit and design the Lead Timeline.

Review

- Timeline architecture
- Existing event publishers
- Legacy timeline data
- Call history
- WhatsApp history
- Notes
- Bookings
- Follow-ups

Deliver

- Timeline architecture proposal
- Missing event inventory
- Duplicate event inventory
- Event normalization plan

Do NOT

- Modify Timeline Engine
- Change Firestore

Done when

Complete timeline proposal is documented.

Conflict Risk

Low

---

# Agent 3 — Workflow Automation

## Scope

Review every manual workflow.

Audit

- Follow-up reminders
- Missed calls
- Booking reminders
- Assignment automation
- SLA handling
- Escalations
- Notifications
- Task generation

Deliver

- Automation opportunities
- Priority ranking
- Dependency graph

Do NOT

- Build automation engine
- Change handlers

Done when

Automation specification is complete.

Conflict Risk

Low

---

# Agent 4 — CRM Intelligence

## Scope

Design intelligent CRM assistance.

Review

- Lead scoring
- Booking prediction
- Lead health
- Duplicate detection
- AI summaries
- Suggested next actions
- Stale lead detection
- Daily priorities

Deliver

- Intelligence specification
- Scoring proposal
- Recommendation engine proposal

Do NOT

- Implement AI
- Modify lead logic

Done when

Complete intelligence proposal exists.

Conflict Risk

Low

---

# Agent 5 — Performance & Scalability

## Scope

Review system scalability.

Audit

- Firestore queries
- Indexes
- Pagination
- Timeline rendering
- Dashboard loading
- Bundle size
- Lazy loading
- API efficiency

Deliver

- Performance report
- Optimization opportunities
- Scalability recommendations

Do NOT

- Rewrite architecture

Done when

Performance audit is complete.

Conflict Risk

Very Low

---

# Agent 6 — Documentation & QA

Runs LAST.

## Scope

Consolidate findings.

Produce

- Wave 6 Audit Report
- Master Recommendations
- Phase roadmap
- Validation checklist
- Risk assessment
- Implementation order

Do NOT

- Change code
- Modify architecture
- Update DLS

Done when

Executive report is complete.

---

# Parallel Execution

These agents can run simultaneously.

Architecture
│
├── Agent 1 (Workflow Audit)
├── Agent 2 (Timeline Audit)
├── Agent 3 (Automation Audit)
├── Agent 4 (CRM Intelligence Audit)
└── Agent 5 (Performance Audit)

↓

Agent 0 reviews dependencies

↓

Agent 6 consolidates everything

---

# Merge Order

1. Agent 1
2. Agent 2
3. Agent 3
4. Agent 4
5. Agent 5
6. Agent 0 (Architecture Review)
7. Agent 6 (Documentation)

---

# Conflict Matrix

| Area | Owner |
|--------|-------|
| Timeline Engine | Agent 0 |
| Automation Engine | Agent 0 |
| Firestore | Agent 0 |
| Shared Types | Agent 0 |
| AI Interfaces | Agent 0 |
| Workflow Audit | Agent 1 |
| Timeline Audit | Agent 2 |
| Automation Audit | Agent 3 |
| CRM Intelligence | Agent 4 |
| Performance Audit | Agent 5 |
| Documentation | Agent 6 |

---

# Success Criteria

Wave 6 Phase 1 is complete when:

- Complete CRM workflow audit produced
- Timeline architecture documented
- Automation opportunities identified
- Intelligence roadmap completed
- Performance audit completed
- Risks documented
- Dependencies mapped
- Executive implementation plan approved

No implementation should begin until these audit reports are reviewed and authorized.

---

# STOP

**This is an audit and planning phase only.**

- No coding
- No UI redesign
- No database changes
- No Firestore modifications
- No automation implementation
- No AI implementation
- No DLS updates

All agents produce findings and recommendations only.

After all reports are consolidated, wait for authorization before beginning Wave 6 Phase 2 implementation.
