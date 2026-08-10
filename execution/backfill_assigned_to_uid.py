#!/usr/bin/env python3
"""
SEC-1 — backfill `assignedToUid` on all leads from users/{assignedTo}.uid.

Dry-run by default. Idempotent: skips leads whose assignedToUid already matches.

Usage:
  python execution/backfill_assigned_to_uid.py
  python execution/backfill_assigned_to_uid.py --apply
  python execution/backfill_assigned_to_uid.py --apply --limit 100

Requires FIREBASE_SERVICE_ACCOUNT_JSON in .env (repo root).
Run BEFORE deploying tightened Firestore lead read rules.
"""

from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).parent.parent / ".env")
FIREBASE_SA_JSON = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON")


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


def load_user_uid_map(db) -> dict[str, str]:
    """Map users doc id (and linked uid) → Auth uid."""
    mapping: dict[str, str] = {}
    for doc in db.collection("users").stream():
        data = doc.to_dict() or {}
        uid = str(data.get("uid") or "").strip()
        if uid:
            mapping[doc.id] = uid
            mapping[uid] = uid
    return mapping


def resolve_assigned_to_uid(assigned_to: str, uid_map: dict[str, str]) -> str:
    if not assigned_to or assigned_to in ("Unassigned",):
        return ""
    key = str(assigned_to).strip()
    return uid_map.get(key, "")


def main() -> None:
    parser = argparse.ArgumentParser(description="Backfill leads.assignedToUid from users.uid")
    parser.add_argument("--apply", action="store_true", help="Write updates (default: dry-run)")
    parser.add_argument("--limit", type=int, default=0, help="Max leads to process (0 = all)")
    args = parser.parse_args()

    print("Connecting to Firestore...")
    db, firestore = get_firestore_client()

    print("Loading users uid map...")
    uid_map = load_user_uid_map(db)
    print(f"Loaded {len(uid_map)} user identifier entries.")

    leads_ref = db.collection("leads")
    leads = list(leads_ref.stream())
    if args.limit and args.limit > 0:
        leads = leads[: args.limit]
    print(f"Scanning {len(leads)} leads...")

    already_ok = 0
    would_clear = 0
    would_set = 0
    missing_assignee = 0
    batch = db.batch()
    batch_size = 0

    for doc in leads:
        data = doc.to_dict() or {}
        assigned_to = data.get("assignedTo", "")
        current = str(data.get("assignedToUid") or "")
        target = resolve_assigned_to_uid(str(assigned_to or ""), uid_map)

        if not assigned_to or str(assigned_to).strip() in ("", "Unassigned"):
            if current == "":
                already_ok += 1
                continue
            would_clear += 1
            action = f"clear assignedToUid on unassigned lead {doc.id}"
        elif not target:
            missing_assignee += 1
            if current == "":
                already_ok += 1
                continue
            would_clear += 1
            action = f"clear stale assignedToUid on lead {doc.id} (unknown assignee {assigned_to!r})"
        elif current == target:
            already_ok += 1
            continue
        else:
            would_set += 1
            action = f"set assignedToUid={target!r} on lead {doc.id} (assignedTo={assigned_to!r})"

        print(f"[{'APPLY' if args.apply else 'DRY-RUN'}] {action}")

        if args.apply:
            batch.update(
                doc.reference,
                {"assignedToUid": target, "updatedAt": firestore.SERVER_TIMESTAMP},
            )
            batch_size += 1
            if batch_size >= 500:
                print("Committing batch of 500...")
                batch.commit()
                batch = db.batch()
                batch_size = 0

    if args.apply and batch_size > 0:
        print(f"Committing final batch of {batch_size}...")
        batch.commit()

    print("\n--- SEC-1 assignedToUid backfill summary ---")
    print(f"Mode:                 {'APPLY' if args.apply else 'DRY-RUN'}")
    print(f"Leads scanned:        {len(leads)}")
    print(f"Already correct:      {already_ok}")
    print(f"Would set / updated:  {would_set}")
    print(f"Would clear / cleared:{would_clear}")
    print(f"Unknown assignee:     {missing_assignee}")
    if not args.apply and (would_set or would_clear):
        print("\nRe-run with --apply to persist changes, then deploy tightened firestore.rules.")


if __name__ == "__main__":
    main()
