#!/usr/bin/env python3
"""
Scrub plaintext `password` fields from Firestore `users` documents.

Phase 0.3 one-shot: historical User docs may still contain plaintext passwords.
This script deletes the `password` field via Admin SDK. Firebase Auth credentials
are untouched.

Default mode is dry-run (report only). Pass --apply to mutate.

Usage:
  # Dry-run (default) — list docs that still have a password field
  python execution/scrub_user_passwords.py

  # Apply — delete password field from all matching users docs
  python execution/scrub_user_passwords.py --apply

Requires:
  - FIREBASE_SERVICE_ACCOUNT_JSON in .env (path to service account JSON)
  - pip install -r execution/requirements.txt
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
        sys.exit("Error: FIREBASE_SERVICE_ACCOUNT_JSON not set in .env")
    if not firebase_admin._apps:
        cred = credentials.Certificate(str(Path(FIREBASE_SA_JSON)))
        firebase_admin.initialize_app(cred)
    return firestore.client()


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Remove plaintext password fields from Firestore users docs."
    )
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Actually delete password fields. Without this flag, dry-run only.",
    )
    args = parser.parse_args()

    from firebase_admin import firestore as fs

    db = get_firestore_client()
    users = list(db.collection("users").stream())

    affected = []
    for doc in users:
        data = doc.to_dict() or {}
        if "password" in data:
            affected.append((doc.id, data.get("username"), data.get("password")))

    print(f"Scanned {len(users)} users document(s).")
    print(f"Found {len(affected)} document(s) with a `password` field.")

    if not affected:
        print("Nothing to scrub.")
        return

    for doc_id, username, value in affected:
        # Never print the actual password value
        kind = type(value).__name__
        empty = value == "" or value is None
        print(f"  - users/{doc_id} (username={username!r}, type={kind}, empty={empty})")

    if not args.apply:
        print("\nDry-run complete. Re-run with --apply to delete these fields.")
        return

    print("\nApplying FieldValue.delete() on password...")
    deleted = 0
    for doc_id, username, _value in affected:
        db.collection("users").document(doc_id).update(
            {"password": fs.DELETE_FIELD}
        )
        deleted += 1
        print(f"  [DELETED] users/{doc_id} password field (username={username!r})")

    print(f"\nDone. Removed password from {deleted} document(s).")


if __name__ == "__main__":
    main()
