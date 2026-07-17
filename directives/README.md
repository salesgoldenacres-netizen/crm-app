# Directives

This folder contains **SOPs (Standard Operating Procedures)** written in Markdown.

Each directive file describes a repeatable workflow the AI agent can execute:
- **Goal** — what this directive accomplishes
- **Inputs** — what information the agent needs
- **Execution** — which script(s) in `../execution/` to call, in what order
- **Outputs** — what deliverable is produced and where it lives
- **Edge Cases** — known issues, API limits, fallback strategies

## Naming Convention
`<verb>_<noun>.md` — e.g., `scrape_website.md`, `generate_report.md`, `sync_leads.md`

## Living Documents
Directives are updated by the agent as new learnings emerge (API quirks, better approaches, timing expectations). Never delete a directive — only improve it.

## Operational index (start here)

| Directive | Purpose |
|-----------|---------|
| [export_leads_to_sheets.md](./export_leads_to_sheets.md) | Export Firestore leads to Google Sheets |
| [import_leads_csv.md](./import_leads_csv.md) | Import leads from CSV |
| [generate_weekly_report.md](./generate_weekly_report.md) | Weekly performance report |
| [backup_firestore.md](./backup_firestore.md) | Firestore backup/restore + daily schedule |
| [deploy_ota_and_firebase.md](./deploy_ota_and_firebase.md) | OTA + Firebase deploy (incl. rollback notes) |
| [production-hardening.md](./production-hardening.md) | Production hardening checklist |
| [branding.md](./branding.md) | Brand / visual language notes |

Architecture docs outside this folder:
- [`ARCHITECTURE.md`](../ARCHITECTURE.md)
- [`telecaller-app/WEBHOOK_API.md`](../telecaller-app/WEBHOOK_API.md)

Wave / phase notes (`wave*`, `*-validation.md`, architecture deep-dives) remain in this folder for history; prefer the operational index above for day-to-day work.
