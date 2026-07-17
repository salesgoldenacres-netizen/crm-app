"""
Firestore Firestore collections to JSON (and restore from a backup file).

Supports optional retention pruning for local scheduled backups.
"""
import os
import sys
import json
import argparse
from datetime import datetime, timezone
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
PROJECT_ROOT = Path(__file__).parent.parent
load_dotenv(PROJECT_ROOT / ".env")

FIREBASE_SA_JSON = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON")


def get_firestore_client():
    import firebase_admin
    from firebase_admin import credentials, firestore

    if not FIREBASE_SA_JSON:
        sys.exit("Error: FIREBASE_SERVICE_ACCOUNT_JSON not set in .env")

    sa_path = Path(FIREBASE_SA_JSON)
    if not sa_path.is_absolute():
        sa_path = PROJECT_ROOT / sa_path

    if not sa_path.exists():
        sys.exit(f"Error: Service account file not found at {sa_path}")

    if not firebase_admin._apps:
        cred = credentials.Certificate(str(sa_path))
        firebase_admin.initialize_app(cred)

    return firestore.client()


def prune_old_backups(backup_dir: Path, retain: int) -> None:
    """Keep the newest `retain` firestore_backup_*.json files; delete older ones."""
    if retain <= 0:
        return
    files = sorted(
        backup_dir.glob("firestore_backup_*.json"),
        key=lambda p: p.stat().st_mtime,
        reverse=True,
    )
    for stale in files[retain:]:
        try:
            stale.unlink()
            print(f"  Pruned old backup: {stale.name}")
        except OSError as err:
            print(f"  Warning: could not prune {stale.name}: {err}")


def run_backup(db, collections_list, output_file_path, retain=0):
    print(f"\n--- Starting Firestore Backup ---")
    print(f"Target Collections: {', '.join(collections_list)}")

    backup_data = {
        "metadata": {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "collections": collections_list,
        },
        "data": {},
    }

    total_docs = 0
    for col_name in collections_list:
        print(f"Backing up collection '{col_name}'...")
        col_ref = db.collection(col_name)
        docs = list(col_ref.stream())

        backup_data["data"][col_name] = []
        for doc in docs:
            backup_data["data"][col_name].append(
                {
                    "id": doc.id,
                    "data": doc.to_dict(),
                }
            )

        col_count = len(backup_data["data"][col_name])
        total_docs += col_count
        print(f"  Exported {col_count} documents from '{col_name}'")

    # Write to file
    output_path = Path(output_file_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(backup_data, f, indent=2, default=str)

    print(
        f"\n[SUCCESS] Backup complete! Wrote {total_docs} total documents to: {output_path.absolute()}"
    )

    if retain > 0:
        print(f"Applying retention: keep newest {retain} backups in {output_path.parent}")
        prune_old_backups(output_path.parent, retain)


def run_restore(db, input_file_path, force=False):
    print(f"\n--- Starting Firestore Restore ---")
    input_path = Path(input_file_path)
    if not input_path.exists():
        sys.exit(f"Error: Backup file not found at {input_path}")

    with open(input_path, "r", encoding="utf-8") as f:
        backup_data = json.load(f)

    meta = backup_data.get("metadata", {})
    data = backup_data.get("data", {})

    print(f"Backup Source: {input_path.absolute()}")
    print(f"Backup Timestamp: {meta.get('timestamp', 'Unknown')}")
    print(f"Backup Collections: {', '.join(data.keys())}")

    total_docs = sum(len(docs) for docs in data.values())
    print(f"Total documents to restore: {total_docs}")

    if not force:
        confirm = input(
            "\nWARNING: This will overwrite or insert documents in target Firestore collections. Proceed? (yes/no): "
        )
        if confirm.strip().lower() != "yes":
            print("Restore aborted by user.")
            return

    # Batch write chunk helper
    for col_name, doc_list in data.items():
        print(f"Restoring collection '{col_name}'...")
        chunk_size = 400
        for i in range(0, len(doc_list), chunk_size):
            chunk = doc_list[i : i + chunk_size]
            batch = db.batch()
            for doc_item in chunk:
                doc_id = doc_item["id"]
                doc_data = doc_item["data"]
                doc_ref = db.collection(col_name).document(doc_id)
                batch.set(doc_ref, doc_data)
            batch.commit()
            print(
                f"  Restored batch of documents {i+1} to {min(i+chunk_size, len(doc_list))} in '{col_name}'"
            )

    print(f"\n[SUCCESS] Restore complete! Imported {total_docs} total documents.")


def main():
    parser = argparse.ArgumentParser(description="Firestore Backup and Restore utility.")
    parser.add_argument(
        "--action",
        choices=["backup", "restore"],
        default="backup",
        help="Action to perform.",
    )
    parser.add_argument("--file", help="Path to backup JSON file.")
    parser.add_argument(
        "--collections",
        default="leads,archivedLeads,users,projects",
        help="Comma-separated list of collections to backup.",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Skip confirmation prompt on restore.",
    )
    parser.add_argument(
        "--retain",
        type=int,
        default=14,
        help="After backup, keep only the newest N firestore_backup_*.json files (0 = keep all).",
    )
    args = parser.parse_args()

    # Initialize Firestore client
    db = get_firestore_client()

    if args.action == "backup":
        collections_list = [c.strip() for c in args.collections.split(",") if c.strip()]
        if not args.file:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            output_file = PROJECT_ROOT / "backups" / f"firestore_backup_{timestamp}.json"
        else:
            output_file = Path(args.file)

        run_backup(db, collections_list, output_file, retain=args.retain)

    elif args.action == "restore":
        if not args.file:
            sys.exit("Error: --file argument is required for restore action.")
        run_restore(db, args.file, args.force)


if __name__ == "__main__":
    main()
