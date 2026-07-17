# Directive: Export Leads to Google Sheets

## Goal
Export all current leads from Firebase Firestore to a Google Sheet so the team can review, filter, and share data outside the CRM app.

## Inputs
| Field | Source | Notes |
|---|---|---|
| Firebase credentials | `.env` → `FIREBASE_SERVICE_ACCOUNT_JSON` | Path to service account JSON (used for Firestore & Sheets API) |
| Google Sheet ID | `.env` → `LEADS_SHEET_ID` | The spreadsheet to write to (must be created manually and shared with service account) |
| Sheet tab name | Hardcoded `"Leads Export"` | Created fresh each run |

## Setup & API Constraints
> [!IMPORTANT]
> **Drive Storage Quota Constraint**: Service accounts created in consumer Google Cloud projects have a default Google Drive storage quota of **0 bytes**. This prevents the service account from creating its own spreadsheets.
>
> To resolve this:
> 1. Create a Google Sheet manually using your Google Account (e.g. `salesgoldenacres@gmail.com`).
> 2. Share the Google Sheet with the service account email `golden-acres-agent@golden-acres-projects.iam.gserviceaccount.com` as an **Editor**.
> 3. Copy the Spreadsheet ID from the URL and set it as `LEADS_SHEET_ID` in your `.env` file.

## Execution

```bash
python execution/export_leads_to_sheets.py
```

Steps performed by the script:
1. Authenticate to Firebase Admin SDK using `FIREBASE_SERVICE_ACCOUNT_JSON`
2. Read all documents from the `leads` Firestore collection
3. Flatten nested fields (e.g., `callLogs` count, latest `followUpDate`)
4. Authenticate to Google Sheets API using `FIREBASE_SERVICE_ACCOUNT_JSON`
5. Clear existing data on the target tab of the shared Google Sheet, write fresh rows with headers

## Outputs
- Google Sheet at `LEADS_SHEET_ID` is populated with all leads
- Columns: Lead Number, Name, Phone, Email, Status, Priority, Project, Plot, Assigned To, Follow-Up Date, Call Count, Created At

## Edge Cases
- **Empty collection**: Script exits cleanly with a logged warning
- **Permission Denied / 403**: Ensure the spreadsheet is shared with `golden-acres-agent@golden-acres-projects.iam.gserviceaccount.com` as an **Editor** and the Sheets API is enabled on the project.
- **Large collections (>1000 docs)**: Firestore reads are paginated in batches of 500
