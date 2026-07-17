# Directive: Generate Weekly Performance Report

## Goal
Produce a weekly call-performance summary for all agents and email/export it as a Google Sheet or PDF — useful for Monday morning manager reviews.

## Inputs
| Field | Source | Notes |
|---|---|---|
| Firebase credentials | `.env` → `FIREBASE_SERVICE_ACCOUNT_JSON` | Admin SDK access (used for Firestore & Sheets API) |
| Google Sheet ID (output) | `.env` → `REPORT_SHEET_ID` | Written fresh each Monday (must be created manually and shared with service account) |
| Week offset | CLI arg `--week-offset 0` | 0 = current week, -1 = last week |

## Setup & API Constraints
> [!IMPORTANT]
> **Drive Storage Quota Constraint**: Service accounts created in consumer Google Cloud projects have a default Google Drive storage quota of **0 bytes**. This prevents the service account from creating its own spreadsheets.
>
> To resolve this:
> 1. Create a Google Sheet manually using your Google Account (e.g. `salesgoldenacres@gmail.com`).
> 2. Share the Google Sheet with the service account email `golden-acres-agent@golden-acres-projects.iam.gserviceaccount.com` as an **Editor**.
> 3. Copy the Spreadsheet ID from the URL and set it as `REPORT_SHEET_ID` in your `.env` file.

## Execution

```bash
python execution/generate_weekly_report.py --week-offset -1
```

Steps:
1. Compute the Monday–Sunday date range for the target week
2. Query `callLogs` sub-documents for all leads in Firestore within that range
3. Group by `agent` field; compute: total calls, connected %, follow-ups set, bookings
4. Write summary table to Google Sheet tab `"Week YYYY-MM-DD"` of the shared Google Sheet
5. Print share link to console

## Outputs
- Google Sheet tab with agent-level stats for the target week
- Console output: `Report written → https://docs.google.com/...`

## Edge Cases
- **No calls logged**: Sheet tab is still created with zero-row data and a note
- **New agent mid-week**: They appear with partial stats — expected behaviour
- **Permission Denied / 403**: Ensure the spreadsheet is shared with `golden-acres-agent@golden-acres-projects.iam.gserviceaccount.com` as an **Editor** and the Sheets API is enabled on the project.

## Learnings
*(Add new learnings here as you discover them)*
