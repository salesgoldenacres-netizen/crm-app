"""
stamp_managerial_claims.py
──────────────────────────
Phase 0.1 one-shot (Admin SDK break-glass): stamp Firebase Custom Claims
`{ managerial: true, role: <roleCode> }` for existing managerial users.

Firestorestore rules gate admin via `request.auth.token.managerial == true`.
`users/1` has NO security meaning. Do not rely on empty uid docs.

Usage (from repo root, with FIREBASE_SERVICE_ACCOUNT_JSON in .env):

  # Dry-run (list who would be stamped)
  python execution/stamp_managerial_claims.py

  # Apply claims
  python execution/stamp_managerial_claims.py --apply

  # Stamp a single Auth UID
  python execution/stamp_managerial_claims.py --apply --uid <AUTH_UID> --role admin

After stamping, affected users must refresh their ID token (sign out/in or
getIdToken(true)) before rules see the new claim.
"""

from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).parent.parent / ".env")
FIREBASE_SA_JSON = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON")

DEFAULT_MANAGERIAL_ROLES = {
    "admin",
    "upper_management",
    "middle_management",
    "lower_management",
}


def initialize_firebase():
    import firebase_admin
    from firebase_admin import credentials

    if not FIREBASE_SA_JSON:
        sys.exit("Error: FIREBASE_SERVICE_ACCOUNT_JSON not set in .env")
    sa_path = Path(FIREBASE_SA_JSON)
    if not sa_path.is_file():
        sys.exit(f"Error: service account file not found: {sa_path}")
    if not firebase_admin._apps:
        cred = credentials.Certificate(str(sa_path))
        firebase_admin.initialize_app(cred)


def load_custom_roles(db):
    roles = {}
    for doc in db.collection("customRoles").stream():
        data = doc.to_dict() or {}
        roles[doc.id] = bool(data.get("isManagerial"))
    return roles


def is_managerial(role_code: str, custom_roles: dict) -> bool:
    if not role_code:
        return False
    if role_code in custom_roles:
        return custom_roles[role_code]
    return role_code in DEFAULT_MANAGERIAL_ROLES


def collect_targets(db, custom_roles: dict):
    """Return list of {uid, role, source, userDocId}."""
    targets = []
    seen = set()

    # Prefer userRoles mapping (keyed by Auth UID)
    for doc in db.collection("userRoles").stream():
        data = doc.to_dict() or {}
        role = data.get("role") or ""
        if not is_managerial(role, custom_roles):
            continue
        uid = doc.id
        if uid in seen:
            continue
        seen.add(uid)
        targets.append(
            {"uid": uid, "role": role, "source": "userRoles", "userDocId": None}
        )

    # Also stamp users docs that are managerial and have a uid
    for doc in db.collection("users").stream():
        data = doc.to_dict() or {}
        role = data.get("role") or ""
        uid = data.get("uid") or ""
        if not uid or not is_managerial(role, custom_roles):
            continue
        if uid in seen:
            continue
        seen.add(uid)
        targets.append(
            {
                "uid": uid,
                "role": role,
                "source": "users",
                "userDocId": doc.id,
            }
        )

    return targets


def stamp_uid(auth, uid: str, role: str, apply: bool) -> bool:
    try:
        user = auth.get_user(uid)
    except Exception as exc:  # noqa: BLE001
        print(f"  SKIP uid={uid}: Auth user not found ({exc})")
        return False

    claims = dict(user.custom_claims or {})
    already = claims.get("managerial") is True and claims.get("role") == role
    print(
        f"  {'APPLY' if apply else 'DRY'} uid={uid} email={user.email} "
        f"role={role} current_claims={claims}"
    )
    if already:
        print("    (already stamped)")
        return True
    if not apply:
        return True

    claims["managerial"] = True
    claims["role"] = role or "admin"
    auth.set_custom_user_claims(uid, claims)
    print("    stamped OK")
    return True


def main():
    parser = argparse.ArgumentParser(
        description="Stamp managerial custom claims for existing admins"
    )
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Actually write claims (default is dry-run)",
    )
    parser.add_argument("--uid", help="Stamp a single Auth UID only")
    parser.add_argument(
        "--role",
        default="admin",
        help="Role claim when using --uid (default: admin)",
    )
    args = parser.parse_args()

    initialize_firebase()
    from firebase_admin import auth, firestore

    db = firestore.client()

    if args.uid:
        print(f"--- Single UID stamp (apply={args.apply}) ---")
        ok = stamp_uid(auth, args.uid, args.role, args.apply)
        sys.exit(0 if ok else 1)

    custom_roles = load_custom_roles(db)
    targets = collect_targets(db, custom_roles)
    print(f"--- Managerial claim stamp (apply={args.apply}) ---")
    print(f"Found {len(targets)} candidate(s)")
    if not targets:
        print(
            "No managerial users with Auth UIDs found. "
            "Create Auth users and link profiles, then re-run, or use --uid."
        )
        sys.exit(1)

    ok_count = 0
    for t in targets:
        if stamp_uid(auth, t["uid"], t["role"], args.apply):
            ok_count += 1

    print(f"Done. Processed {ok_count}/{len(targets)}.")
    if not args.apply:
        print("Dry-run only. Re-run with --apply to write claims.")
    else:
        print("Users must refresh ID tokens (sign out/in) for rules to take effect.")


if __name__ == "__main__":
    main()
