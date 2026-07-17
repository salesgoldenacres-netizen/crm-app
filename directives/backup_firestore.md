# Firestore Backup & Restore SOP

This directive describes the Standard Operating Procedure (SOP) for running backups and restores on the Golden Acres Firestore database using the execution script.

## Goal

Create a reliable offline backup of active leads, archived leads, users, and projects, and provide a secure restoration route in case of accidental data loss or corruption.

## Inputs

The script `execution/backup_firestore.py` accepts the following arguments:
- `--action` (string): Either `backup` (default) or `restore`.
- `--file` (string): The path to the JSON file to read from (for restore) or write to (for backup).
- `--collections` (string): A comma-separated list of Firestore collections to include (defaults to `leads,archivedLeads,users,projects`).
- `--force` (boolean flag): Skips the interactive confirmation prompt during a restore action.

## Execution

### Creating a Database Backup
To back up the default collections, run:
```bash
python execution/backup_firestore.py --action backup
```
This creates a JSON file under the `backups/` directory (e.g. `backups/firestore_backup_20260706_121530.json`).

### Restoring from a Backup
To restore data from a specific backup file, run:
```bash
python execution/backup_firestore.py --action restore --file backups/firestore_backup_20260706_121530.json
```
*Note: Restoring data will overwrite existing documents with matching IDs in the target Firestore collections.*

## Edge Cases & Safety

1. **PII and Security**: Backup files contain client names, phone numbers, and emails. Do not share or commit these files. The `backups/` folder is listed in `.gitignore` to prevent leaks.
2. **Batch Limits**: Firestore writes are subject to a batch limit of 500 operations. The restore script automatically chunks restore operations into batches of 400 to prevent API errors.
3. **Overwrite Warning**: A restore will perform a complete document replacement for any document with a matching ID. It does not merge fields, it replaces the document content entirely.
