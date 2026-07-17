#!/usr/bin/env python3
"""
Database cleanup & verification for Golden Acres CRM.

Safety rails:
  - Dry-run by default (report only)
  - Destructive Auth/Firestore deletes require --apply AND --confirm DELETE
  - Prefer running backup_firestore.py before --apply

Usage:
  python execution/cleanup_database.py
  python execution/cleanup_database.py --apply --confirm DELETE
"""

from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).parent.parent / ".env")
FIREBASE_SA_JSON = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON")


def get_firebase_admin():
    import firebase_admin
    from firebase_admin import credentials, firestore, auth

    if not FIREBASE_SA_JSON:
        sys.exit("Error: FIREBASE_SERVICE_ACCOUNT_JSON not set in .env")
    if not firebase_admin._apps:
        cred = credentials.Certificate(str(Path(FIREBASE_SA_JSON)))
        firebase_admin.initialize_app(cred)
    return firestore.client(), auth


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Cleanup orphaned userRoles / Auth users (dry-run by default)."
    )
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Apply destructive fixes. Without this flag, dry-run only.",
    )
    parser.add_argument(
        "--confirm",
        default="",
        help='Must be exactly "DELETE" when using --apply.',
    )
    parser.add_argument(
        "--backup-ack",
        action="store_true",
        help="Acknowledge that a Firestore backup was taken before destructive apply.",
    )
    args = parser.parse_args()

    apply = bool(args.apply)
    if apply:
        if args.confirm != "DELETE":
            sys.exit(
                'Refusing --apply without --confirm DELETE '
                "(and preferably --backup-ack after backup_firestore.py)."
            )
        if not args.backup_ack:
            sys.exit(
                "Refusing --apply without --backup-ack. "
                "Run: python execution/backup_firestore.py first, then re-run with --backup-ack."
            )

    db, auth = get_firebase_admin()
    mode = "APPLY" if apply else "DRY-RUN"
    print(f"--- Database Cleanup & Verification ({mode}) ---")

    users_ref = db.collection("users")
    users = list(users_ref.stream())
    user_uids = set()
    user_emails = set()

    role_creates = 0
    for u in users:
        data = u.to_dict() or {}
        uid = data.get("uid")
        email = data.get("email")
        role = data.get("role")
        username = data.get("username")
        if uid:
            user_uids.add(uid)
            role_doc = db.collection("userRoles").document(uid).get()
            if not role_doc.exists:
                print(
                    f"[FIX] User '{username}' (UID: {uid}) missing userRoles doc "
                    f"(would create role '{role or 'telecaller'}')."
                )
                if apply:
                    db.collection("userRoles").document(uid).set(
                        {"role": role or "telecaller"}
                    )
                    print(f"  [SUCCESS] Created userRoles/{uid}")
                    role_creates += 1
        if email:
            user_emails.add(str(email).lower())

    roles_ref = db.collection("userRoles")
    roles = list(roles_ref.stream())
    orphan_roles = 0
    for r in roles:
        role_uid = r.id
        if role_uid not in user_uids:
            print(f"[FIX] Orphaned userRoles/{role_uid} (would delete).")
            if apply:
                roles_ref.document(role_uid).delete()
                print(f"  [SUCCESS] Deleted orphaned userRoles/{role_uid}")
            orphan_roles += 1

    page = auth.list_users()
    orphan_auth = 0
    while page:
        for user in page.users:
            email = (user.email or "").lower()
            if user.uid not in user_uids and email not in user_emails:
                print(
                    f"[FIX] Orphaned Auth user UID={user.uid} email={user.email} (would delete)."
                )
                if apply:
                    try:
                        auth.delete_user(user.uid)
                        print(f"  [SUCCESS] Deleted Auth user: {user.email}")
                    except Exception as e:
                        print(f"  [ERROR] Failed to delete auth user {user.uid}: {e}")
                orphan_auth += 1
        page = page.get_next_page()

    print("\n--- Summary ---")
    print(f"Mode: {mode}")
    print(f"Missing userRoles to create: {role_creates if apply else 'see [FIX] above'}")
    print(f"Orphan userRoles: {orphan_roles}")
    print(f"Orphan Auth users: {orphan_auth}")
    if not apply:
        print(
            "[INFO] Dry-run only. To apply: "
            "python execution/cleanup_database.py --apply --confirm DELETE --backup-ack"
        )
    else:
        print("--- Cleanup Complete ---")


if __name__ == "__main__":
    main()
