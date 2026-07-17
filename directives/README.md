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
