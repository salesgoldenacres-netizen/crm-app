# Lead Deduplication SOP

This directive describes the Standard Operating Procedure (SOP) for running the lead deduplication and merging utility on the Firestore database.

## Goal

Scan active leads, group them by normalized telephone numbers, identify duplicates, merge their histories (call logs, notes, missing fields) into a single "primary" lead, and delete secondary duplicates to maintain a clean database.

## Inputs

The script `execution/dedup_leads.py` accepts the following arguments:
- `--action` (string): Either `dry-run` (default) or `merge`.
- `--collections` (string): Target collection (default `leads`).
- `--normalize-first` (boolean flag): If set, normalizes phone numbers before deduplicating.

## Execution

### Running a Deduplication Dry Run
To scan the database and see what duplicates exist without making changes:
```bash
python execution/dedup_leads.py --action dry-run
```
Review the output to see the primary candidate (selected based on the number of call logs or oldest timestamp) and the duplicate leads that will be merged into it.

### Performing the Merge Action
To execute the merge and write updates to Firestore (which updates the primary lead and deletes secondary duplicates):

1. Take a backup first: `python execution/backup_firestore.py`
2. Run with explicit confirm + backup ack:

```bash
python execution/dedup_leads.py --action merge --confirm MERGE --backup-ack
```

Destructive merge is refused without `--confirm MERGE` and `--backup-ack`.

## Logic & Merge Strategy

1. **Phone Normalization**: Phone numbers are normalized using a standard routine: removing non-digits, and formatting to E.164 (e.g. `+91XXXXXXXXXX`).
2. **Primary Selection Criteria**:
   - The lead with the most call logs and notes is selected as the primary lead.
   - If equal, the lead with the oldest `createdAt` or `createdTime` timestamp is selected.
3. **Field Merging**:
   - **Call Logs**: Combined lists are sorted chronologically by date.
   - **Notes**: Concatenated together with a prefix separating them (e.g., `\n[Merged Notes from Duplicate ID xxxxx]: ...`).
   - **Missing Fields**: If the primary lead has an empty string or is missing fields (like `email`, `projectId`, `plotId`, `priority`, `assignedTo`, `assignedToName`, `leadSource`), it copies the values from the duplicates.
