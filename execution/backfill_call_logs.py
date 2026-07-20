#!/usr/bin/env python3
"""
Phase C — migrate embedded lead.callLogs[] → top-level callLogs/{id}.

Dry-run by default. Stable document ids so re-runs are idempotent.

Usage:
  python execution/backfill_call_logs.py
  python execution/backfill_call_logs.py --apply --confirm BACKFILL
  python execution/backfill_call_logs.py --apply --confirm BACKFILL --limit 50
  python execution/backfill_call_logs.py --strip-embedded --apply --confirm BACKFILL
  python execution/backfill_call_logs.py --verify

Requires FIREBASE_SERVICE_ACCOUNT_JSON in .env (same as other execution scripts).
"""

from __future__ import annotations

import argparse
import os
import re
import sys
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).parent.parent / ".env")
FIREBASE_SA_JSON = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON")

SYSTEM_AGENTS = {"system", "System (Auto)", "system_webhook"}


def get_firestore_client():
    import firebase_admin
    from firebase_admin import credentials, firestore

    if not FIREBASE_SA_JSON:
        sys.exit("[ERROR] FIREBASE_SERVICE_ACCOUNT_JSON not set in .env")
    sa_path = Path(FIREBASE_SA_JSON)
    if not sa_path.exists():
        sys.exit(f"[ERROR] Service account file not found: {sa_path}")
    if not firebase_admin._apps:
        cred = credentials.Certificate(str(sa_path))
        firebase_admin.initialize_app(cred)
    return firestore.client(), firestore


def sanitize_part(value: str, max_len: int = 40) -> str:
    cleaned = re.sub(r"[^a-zA-Z0-9_-]", "_", str(value or ""))
    return cleaned[:max_len]


def simple_hash(text: str) -> int:
    """FNV-1a 32-bit — must match telecaller-app callLogIds.simpleHash."""
    h = 2166136261
    for ch in text:
        h ^= ord(ch)
        h = (h * 16777619) & 0xFFFFFFFF
    return h


def build_embedded_call_log_id(lead_id: str, index: int, log: dict) -> str:
    """Stable id matching client callLogIds.buildEmbeddedCallLogId."""
    lead = sanitize_part(lead_id, 40)
    date = sanitize_part(log.get("date") or "", 24)
    agent = sanitize_part(log.get("agent") or "", 20)
    status = sanitize_part(log.get("status") or "", 16)
    # Match JS Number.toString(36) for unsigned 32-bit FNV hash
    note_fp = _to_base36(simple_hash(str(log.get("note") or "")))[:8]
    return f"emb_{lead}_{index}_{date}_{agent}_{status}_{note_fp}"


def _to_base36(n: int) -> str:
    alphabet = "0123456789abcdefghijklmnopqrstuvwxyz"
    if n == 0:
        return "0"
    out = []
    while n:
        n, rem = divmod(n, 36)
        out.append(alphabet[rem])
    return "".join(reversed(out))


def is_system_agent(agent: str | None) -> bool:
    return bool(agent) and agent in SYSTEM_AGENTS


def run_verify() -> None:
    """Post-apply gate: each embedded row must have a top-level doc with stable id."""
    print("=== backfill_call_logs (VERIFY) ===")
    db, _firestore = get_firestore_client()
    leads_ref = db.collection("leads")
    call_logs_ref = db.collection("callLogs")

    leads_scanned = 0
    leads_with_embedded = 0
    embedded_logs = 0
    missing_docs = 0
    missing_samples: list[str] = []

    for doc in leads_ref.stream():
        leads_scanned += 1
        data = doc.to_dict() or {}
        embedded = data.get("callLogs") or []
        if not isinstance(embedded, list) or not embedded:
            continue

        leads_with_embedded += 1
        lead_id = doc.id
        for index, log in enumerate(embedded):
            if not isinstance(log, dict):
                continue
            embedded_logs += 1
            call_log_id = build_embedded_call_log_id(lead_id, index, log)
            if not call_logs_ref.document(call_log_id).get().exists:
                missing_docs += 1
                if len(missing_samples) < 10:
                    missing_samples.append(f"{lead_id}#{index} -> {call_log_id}")

    print("\n--- Verify summary ---")
    print(f"Leads scanned:           {leads_scanned}")
    print(f"Leads with embedded:     {leads_with_embedded}")
    print(f"Embedded logs checked:   {embedded_logs}")
    print(f"Missing top-level docs:  {missing_docs}")
    if missing_samples:
        print("\nSample gaps (max 10):")
        for sample in missing_samples:
            print(f"  {sample}")
    if missing_docs == 0 and embedded_logs > 0:
        print("\nOK - safe to set VITE_CALL_LOGS_EMBEDDED_FALLBACK=false after UI spot-check.")
    elif missing_docs == 0 and embedded_logs == 0:
        print("\nOK - no embedded arrays remain (or none in dataset).")
    else:
        print("\nNOT READY - run dry-run/apply before disabling embedded fallback.")
        sys.exit(1)


def summarize_from_logs(logs: list[dict]) -> dict:
    if not logs:
        return {
            "callCount": 0,
            "hasAgentCall": False,
            "lastCallAt": None,
            "lastCallOutcome": None,
            "lastCallAgent": None,
            "lastCallNote": None,
        }
    ordered = sorted(logs, key=lambda l: str(l.get("date") or ""))
    last = ordered[-1]
    has_agent = any(
        log.get("agent") and not is_system_agent(str(log.get("agent"))) for log in logs
    )
    return {
        "callCount": len(logs),
        "hasAgentCall": has_agent,
        "lastCallAt": last.get("date") or "",
        "lastCallOutcome": last.get("status") or "",
        "lastCallAgent": last.get("agent") or "",
        "lastCallNote": str(last.get("note") or "")[:200],
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Backfill embedded callLogs → top-level callLogs")
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Write changes (default is dry-run)",
    )
    parser.add_argument(
        "--confirm",
        default="",
        help="Required token BACKFILL when using --apply",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=0,
        help="Max leads to process (0 = all)",
    )
    parser.add_argument(
        "--strip-embedded",
        action="store_true",
        help="After migrating a lead, clear lead.callLogs[] (only with --apply)",
    )
    parser.add_argument(
        "--verify",
        action="store_true",
        help="Check every embedded log has a matching top-level callLogs doc (post-apply gate)",
    )
    args = parser.parse_args()

    if args.apply and args.confirm != "BACKFILL":
        sys.exit("[ERROR] Refusing --apply without --confirm BACKFILL")
    if args.verify and args.apply:
        sys.exit("[ERROR] --verify is read-only; do not combine with --apply")

    if args.verify:
        run_verify()
        return

    mode = "APPLY" if args.apply else "DRY-RUN"
    print(f"=== backfill_call_logs ({mode}) ===")

    db, firestore = get_firestore_client()
    leads_ref = db.collection("leads")
    call_logs_ref = db.collection("callLogs")

    leads_scanned = 0
    leads_with_embedded = 0
    logs_seen = 0
    logs_created = 0
    logs_skipped_exists = 0
    leads_summaries_updated = 0
    leads_stripped = 0
    errors = 0

    query = leads_ref.stream()
    for doc in query:
        if args.limit and leads_scanned >= args.limit:
            break
        leads_scanned += 1
        lead_id = doc.id
        data = doc.to_dict() or {}
        embedded = data.get("callLogs") or []
        if not isinstance(embedded, list) or not embedded:
            continue

        leads_with_embedded += 1
        created_for_lead = 0

        for index, log in enumerate(embedded):
            if not isinstance(log, dict):
                continue
            logs_seen += 1
            call_log_id = build_embedded_call_log_id(lead_id, index, log)
            ref = call_logs_ref.document(call_log_id)
            existing = ref.get()
            if existing.exists:
                logs_skipped_exists += 1
                continue

            payload = {
                **log,
                "id": call_log_id,
                "leadId": lead_id,
                "date": log.get("date") or "",
                "createdAt": log.get("date") or "",
                "migratedFromEmbedded": True,
                "skipProductivity": True,
                "embeddedIndex": index,
            }
            if args.apply:
                try:
                    ref.create(payload)
                    logs_created += 1
                    created_for_lead += 1
                except Exception as err:
                    # Race / already-exists
                    if "already exists" in str(err).lower() or getattr(err, "code", None) == 6:
                        logs_skipped_exists += 1
                    else:
                        errors += 1
                        print(f"[ERROR] {lead_id} #{index}: {err}")
            else:
                logs_created += 1  # would-create
                created_for_lead += 1

        # Refresh summaries from collection + remaining embedded (use embedded as source of truth for count)
        summary = summarize_from_logs([l for l in embedded if isinstance(l, dict)])
        # Prefer max(existing callCount, embedded length) after migration
        existing_count = int(data.get("callCount") or 0)
        summary["callCount"] = max(existing_count, summary["callCount"])

        patch = {k: v for k, v in summary.items() if v is not None}
        if args.strip_embedded and args.apply:
            patch["callLogs"] = firestore.DELETE_FIELD
            leads_stripped += 1

        if args.apply and patch:
            try:
                leads_ref.document(lead_id).update(patch)
                leads_summaries_updated += 1
            except Exception as err:
                errors += 1
                print(f"[ERROR] summary {lead_id}: {err}")
        elif not args.apply:
            leads_summaries_updated += 1

        if created_for_lead and leads_with_embedded <= 20:
            print(
                f"[{mode}] lead={lead_id} embedded={len(embedded)} "
                f"new_docs={created_for_lead} summary_callCount={summary['callCount']}"
            )

    print("\n--- Summary ---")
    print(f"Leads scanned:           {leads_scanned}")
    print(f"Leads with embedded:     {leads_with_embedded}")
    print(f"Embedded logs seen:      {logs_seen}")
    print(f"CallLogs created:        {logs_created}")
    print(f"CallLogs skipped (exist):{logs_skipped_exists}")
    print(f"Lead summaries updated:  {leads_summaries_updated}")
    print(f"Leads stripped embedded: {leads_stripped}")
    print(f"Errors:                  {errors}")
    if not args.apply:
        print("\nDry-run only. Re-run with: --apply --confirm BACKFILL")
        print("After verifying, disable dual-read: VITE_CALL_LOGS_EMBEDDED_FALLBACK=false")


if __name__ == "__main__":
    main()
