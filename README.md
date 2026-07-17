# Golden Acres Projects — Agent Workspace

This workspace is organized as a **3-layer agent architecture** defined in [AGENTS.md](AGENTS.md).

```
Golden Acres Projects/
├── AGENTS.md              ← Agent operating instructions (read first)
├── .env                   ← Secrets & API keys (never commit)
├── .gitignore
├── credentials.json       ← Google OAuth credentials (download from Cloud Console)
├── token.json             ← Auto-generated OAuth token
│
├── directives/            ← Layer 1: SOPs — what to do
│   ├── README.md
│   ├── export_leads_to_sheets.md
│   ├── generate_weekly_report.md
│   └── import_leads_csv.md
│
├── execution/             ← Layer 3: Python scripts — how to do it
│   ├── README.md
│   ├── requirements.txt
│   ├── export_leads_to_sheets.py
│   ├── generate_weekly_report.py
│   └── import_leads_csv.py
│
├── .tmp/                  ← Intermediate files (never commit)
│
└── telecaller-app/        ← The React/Firebase CRM app
```

---

## Quick Start

### 1. Install Python dependencies
```bash
pip install -r execution/requirements.txt
```

### 2. Fill in `.env`
Edit `.env` and add your Firebase service account path and Google Sheet IDs.

### 3. Set up Google OAuth
- Download `credentials.json` from [Google Cloud Console](https://console.cloud.google.com) → APIs & Services → Credentials
- On first run, a browser window will open for you to authorize; `token.json` is saved automatically.

### 4. Run a script
```bash
# Export all leads to Google Sheets
python execution/export_leads_to_sheets.py

# Generate last week's performance report
python execution/generate_weekly_report.py --week-offset -1

# Import a CSV of raw leads
python execution/import_leads_csv.py --csv .tmp/leads_import.csv --project-id <id>
```

---

## Adding New Workflows
1. Write a directive SOP in `directives/<verb>_<noun>.md`
2. Write the execution script in `execution/<verb>_<noun>.py`
3. Test the script; update the directive with any learnings
