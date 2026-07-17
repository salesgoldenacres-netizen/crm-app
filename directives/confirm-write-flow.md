# Confirm-to-Write Flow

**Scope:** Wave 7 Phase 2D / W7-AI-3  
**Surface:** Lead Detail -> Sales Copilot Drawer only  
**Status:** ACTIVE FLOW

---

## Purpose

Define the approved user-facing flow for taking an AI proposal from review to confirmed execution without opening any autonomous or direct-write behavior.

---

## Flow overview

```text
AI brief result
  -> optional proposal list
  -> secure display validation
  -> proposal card rendered in Copilot
  -> user clicks Review action
  -> shared confirm dialog opens
  -> user chooses Cancel or Confirm
     -> Cancel  -> close dialog, do nothing
     -> Confirm -> executor validates again
                 -> execution registry routes to shared API
                 -> success/failure feedback shown
```

---

## Entry conditions

The confirm-to-write flow is available only when all of the following are true:

- Sales Copilot is open on Lead Detail
- AI is enabled for the current runtime path
- `lead-brief-v1` returns proposals
- the proposal passes secure output handling
- the proposal passes execution validation

If any of those conditions fail, the proposal is not executable.

---

## Review card behavior

Each rendered proposal shows:

- current value
- proposed new value
- reason
- impact summary
- optional confidence label

The card presents the proposal as **review required**. It does not execute anything by itself.

---

## Confirm dialog behavior

The confirm dialog is built on the shared `Dialog` component.

It repeats the proposal details so the reviewer can make an informed choice:

- current value
- new value
- reason
- impact summary
- optional confidence

Buttons:

- `Cancel`
- `Confirm`

While confirmation is processing, buttons are disabled by the shared dialog loading state.

---

## Cancel path

If the user cancels:

- the dialog closes
- the proposal stays unexecuted
- no shared API runs
- no mutation occurs
- no audit persistence occurs

This is the required safe no-op path.

---

## Confirm path

When the user confirms:

1. The executor re-validates the proposal against the active lead.
2. The executor checks confirmation state and duplicate execution state.
3. The executor resolves the correct handler from the execution registry.
4. The handler calls the existing shared CRM API.
5. The executor returns memory-only audit metadata plus success/failure status.
6. The Copilot drawer shows the outcome.

---

## Handler-specific outcomes

### Status change

- validates with `planStatusTransition(...)`
- applies with `updateLead(...)`

### Priority change

- applies with `updateLead({ priority })`

### Follow-up

- applies with `updateLead({ followUpDate, followUpOn })`

### Add note

- applies with `logCall(... timelineActivity: "note")`
- does not touch the lead `notes` field

### Assignment

- applies with `updateLead({ assignedTo, assignedToName })`

---

## Rejection paths

The flow fails closed when any of these conditions are hit:

- unsupported proposal type
- invalid proposal schema
- lead id mismatch
- expired proposal
- illegal status transition
- same-owner reassignment
- empty note
- follow-up date in the past
- duplicate confirmation
- duplicate execution

These produce feedback to the user and no CRM mutation is applied.

---

## Idempotency behavior

Phase 2D idempotency is client-session memory only.

Tracked sets:

- proposals currently being confirmed
- proposals already executed

Outcomes:

- duplicate confirmation -> safe rejection
- duplicate execution -> safe rejection

This is sufficient for the approved Lead Detail-only scope and avoids introducing persistence or backend changes.

---

## Safety boundaries

- AI never calls Firestore directly
- AI never publishes timeline events directly
- execution always routes through shared APIs
- no autonomous execution exists
- no background execution exists
- no non-approved proposal type executes
- AI remains disabled by default unless separately enabled

---

## Result

The confirm-to-write flow gives Lead Detail users a narrow, reviewable way to accept AI suggestions while preserving deterministic CRM mutation rules, centralized timeline behavior, and the approved Wave 7 safety boundary.
