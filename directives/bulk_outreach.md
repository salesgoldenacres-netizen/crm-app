# Bulk Outreach Campaign SOP

This directive describes the Standard Operating Procedure (SOP) for generating target outreach files for telecaller campaigns.

## Goal

Create pre-filtered customer segments (by project interest, status, or priority), render outreach message templates personalized with client and project details, and output a CSV spreadsheet with clickable WhatsApp Web outreach links.

## Inputs

The script `execution/bulk_outreach.py` accepts the following arguments:
- `--project` (string): Specific project ID to filter leads (e.g. `golden-acres`, `sri-balaji-nagar`).
- `--status` (string): Lead status to filter (e.g. `interested`, `new`, `contacted`).
- `--priority` (string): Priority level to filter (`hot`, `warm`, `cold`).
- `--template` (choices: `intro`, `visit`, `followup`): Message template to render.
- `--output` (string): Custom file path to write the CSV report (defaults to `.tmp/outreach_campaign_YYYYMMDD_HHMMSS.csv`).

## Templates Available

1. **intro**:
   - Text: `Hello {name}, thank you for showing interest in {project}. We would love to share the layout plan and pricing details. Please let us know a convenient time to call. Regards, Golden Acres.`
2. **visit**:
   - Text: `Hello {name}, this is to confirm your scheduled site visit to {project}. We have arranged a site executive to guide you. Regards, Golden Acres.`
3. **followup**:
   - Text: `Hello {name}, we tried calling you earlier regarding your interest in {project} plots. Please let us know when we can connect. Regards, Golden Acres.`

## Execution

### Generating a Campaign Spreadsheet
To generate a spreadsheet of active leads interested in the `golden-acres` project using the `intro` template:
```bash
python execution/bulk_outreach.py --project golden-acres --template intro
```
This generates a CSV spreadsheet under the `.tmp/` folder.

## Outputs

- A campaign spreadsheet under `.tmp/outreach_campaign_YYYYMMDD_HHMMSS.csv` containing:
  - Lead ID
  - Name
  - Phone Number
  - Project ID / Project Name
  - Formatted Template Text
  - Clickable WhatsApp Web Link (`https://web.whatsapp.com/send?phone=...&text=...`)
