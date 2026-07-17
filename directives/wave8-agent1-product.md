# Wave 8 Audit — Product & Sales Workflow (Agent 1)

This report audits the CRM's operational workflows, identifying friction points, inefficiencies, and user experience optimizations.

---

## 1. Workflow Friction Points

### Telecaller Follow-Ups
- **Friction**: Scheduling a follow-up requires opening lead details, navigating to form fields, entering YYYY-MM-DD manually, and clicking save.
- **Optimization**: Introduce a one-click follow-up shortcut panel on the main list card (e.g. "+1 Day", "+3 Days") utilizing the shared `validateYmdDate` validator.

### Site Visits & Booking Mappings
- **Friction**: High drop-offs occur between site visits logged and actual bookings. Managers lack visibility into booking conversion rates.
- **Optimization**: Define a "Visit-to-Booking" conversion funnel metric within the Analytics Service to highlight underperforming projects.

---

## 2. Inefficiencies & Inconsistencies

- **Multi-project assignments**: Sales representatives working on multiple projects receive overlapping lists of leads, creating confusion.
- **Resolution**: Implement active project selectors in the primary dashboard view, filter leads to display only one project at a time, and preserve scroll positions on tab switches.
