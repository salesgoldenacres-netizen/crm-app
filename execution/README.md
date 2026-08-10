# Execution Scripts

This folder contains **deterministic Python scripts** — the reliable, testable workhorses of the system.

## Philosophy
- Scripts do **one thing well** — no hidden side effects
- All credentials come from `.env` — never hardcoded
- Every script prints a clear summary at the end
- Errors are logged to `.tmp/` and/or raised with a useful message
- Scripts are safe to re-run (idempotent where possible)

## Usage Pattern
The agent reads a directive, then calls the appropriate script here with the right arguments.

## Adding a New Script
1. Create `execution/<verb>_<noun>.py`
2. Add argparse for all inputs
3. Add a corresponding directive in `directives/<verb>_<noun>.md`
4. Test it manually before the agent uses it

## Safety rails (destructive scripts)

Destructive scripts default to **dry-run**. Apply modes require explicit confirm tokens:

```bash
# Dedup (merge deletes secondary leads)
python execution/backup_firestore.py
python execution/dedup_leads.py --action merge --confirm MERGE --backup-ack

# Cleanup orphaned Auth / userRoles
python execution/backup_firestore.py
python execution/cleanup_database.py --apply --confirm DELETE --backup-ack
```

## Backups
- `backup_firestore.py` — JSON backup/restore with `--retain` pruning
- `schedule_backup_windows.ps1` — register a daily Windows Task Scheduler job

See `directives/backup_firestore.md`.

## Phase C — call log backfill

Migrate embedded `lead.callLogs[]` → top-level `callLogs` (dry-run default):

```bash
python execution/backfill_call_logs.py
python execution/backfill_call_logs.py --apply --confirm BACKFILL
```

See `directives/phase-c-call-logs-migration.md`.

### SEC-1 — backfill leads.assignedToUid

Required **before** deploying tightened lead read rules:

```bash
# Dry-run (default)
python execution/backfill_assigned_to_uid.py

# Apply
python execution/backfill_assigned_to_uid.py --apply
```

Maps `assignedTo` (users doc id) → `users/{id}.uid` on every lead. Idempotent.

## Security / Phase 0 one-shots

### Scrub plaintext passwords from Firestore users
Historical `users` docs may still contain a `password` field. Auth passwords live in
Firebase Auth only — run this after deploying the client that no longer writes passwords:

```bash
# Dry-run (default)
python execution/scrub_user_passwords.py

# Apply
python execution/scrub_user_passwords.py --apply
```
