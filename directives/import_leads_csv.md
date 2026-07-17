# Directive: Bulk Import Leads from CSV

## Goal
Import a CSV file of raw leads into Firebase Firestore — used when receiving bulk lead lists from marketing agencies or ad campaigns.

## Inputs
| Field | Source | Notes |
|---|---|---|
| CSV file path | CLI arg `--csv .tmp/leads_import.csv` | Place raw file in `.tmp/` |
| Project ID to assign | CLI arg `--project-id <id>` | Must exist in Firestore `projects` collection |
| Assign to agent | CLI arg `--agent-id <id>` | Optional; leaves unassigned if omitted |
| Firebase credentials | `.env` → `FIREBASE_SERVICE_ACCOUNT_JSON` | Admin SDK |

## Expected CSV Columns
`name, phone, email, lead_source, lead_medium, notes`
- `phone` must be a valid Indian mobile number (10 digits, or with +91 prefix)
- Duplicate phone numbers are skipped (checked against existing leads)

## Execution

```bash
# Place the CSV in .tmp/ first
python execution/import_leads_csv.py --csv .tmp/leads_import.csv --project-id abc123 --agent-id xyz456
```

Steps:
1. Validate CSV structure — fail fast if required columns missing
2. Load existing phone numbers from Firestore to detect duplicates
3. For each valid row, write a new `lead` document with status `raw`, source from CSV
4. Log a `[Bulk Import]` entry in each lead's call log
5. Print summary: N imported, M skipped (duplicates), K failed

## Outputs
- New lead documents in Firestore `leads` collection
- `.tmp/import_result_YYYY-MM-DD.json` — machine-readable summary of the run

## Edge Cases
- **Malformed phone**: Skip row, log to `.tmp/import_errors.csv`
- **Project ID not found**: Abort entire run with clear error message
- **>5000 rows**: Batched Firestore writes in groups of 500 to stay within limits

## Learnings
*(Add new learnings here as you discover them)*
