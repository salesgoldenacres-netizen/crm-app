# Golden Acres Projects — Telecaller CRM

An enterprise-ready Telecalling & Plot Inventory Management System designed for **Golden Acres Projects**. This CRM provides real-time telecaller roster management, lead deduplication and assignments, interactive SVG-based layout inventory management, attendance tracking, and agent analytics.

---

## 🏗️ Architecture & Folder Structure

The project follows a modular, feature-oriented structure. Domains live under `features/`; cross-cutting UI, Firebase access, and utilities live under `shared/`.

```
src/
├── features/               # Feature-based business domains
│   ├── admin/              # RBAC, roster, targets, settings, audit
│   ├── attendance/         # Check-in/out, leave requests
│   ├── auth/               # Login and auth session hooks
│   ├── calls/              # Dialer, IVR, WhatsApp inbox, call history
│   ├── dashboard/          # Widgets, notifications, preferences
│   ├── employees/          # Users, teams, agent status
│   ├── leads/              # Lead workspace, import, details
│   ├── plots/              # Projects, SVG map editor/viewer
│   └── settings/           # Theme store
│
├── shared/
│   ├── components/         # Design system + shared UI (DataTable, Modal, etc.)
│   ├── constants/          # Firestore collection names, templates
│   ├── layouts/            # AppShell, ModalHost
│   ├── services/           # Firebase init, auth, repositories, converters
│   ├── types/              # Re-exports of feature domain types
│   ├── utils/              # logger, formatters, uploadFile, roleUtils
│   └── validation/         # Zod schemas (lead, user, leave)
│
└── App.tsx                 # Router entry + providers
```

### Data access pattern
- **Repositories** (`shared/services/firebase/repositories.ts`) encapsulate Firestore writes.
- **Feature hooks** own listeners (`onSnapshot`) and business rules; they call repositories for mutations.
- Do not add empty `services/` / `repository/` folders inside features unless real shared logic belongs there.

### Recent cleanup (production hardening)
- Removed verified dead files (unused widget, unused hook, boilerplate assets).
- Consolidated Custom Roles / Teams CRUD onto repositories; shared `uploadFile` helper.
- Canonical `ProximityItem` / `CompetitorItem` types (no local duplicates in ProjectFormModal).
- Design-system primitives kept even when unused (intentional foundation).
- Smart Lists stack left intact as dormant capability.

---

## 🌟 Key Core Capabilities

### 📞 Lead Management & Duplicates Engine
* **Clean Data Formatting**: Integrates `normalizePhone()` and `cleanLeadName()` utilities to sanitize input names and format phone numbers dynamically.
* **Automatic Client-Side Deduplication**: Checks incoming manual or bulk lead imports against active databases. If a duplicate phone number is detected, the engine auto-merges notes and appends a duplicate attempt history to `callLogs` rather than polluting records.
* **DataTable Presentation**: Standardizes lists with search filters, dynamic sorting, pagination, and multi-selection bulk status updates.

### 🗺️ SVG Map Snapping Engine
* **Interactive Coordinates Canvas**: Renders custom site layouts dynamically using SVG paths. Supports pan-and-zoom controls via `react-zoom-pan-pinch`.
* **Snapping Mechanics**: The editor allows dragging polygon vertices with three optional constraints:
  * *Snap to Geometry*: Automatically snap cursor to neighboring plot vertices within a pixel tolerance boundary.
  * *Snap to Grid*: Align coordinates to standard relative division grids.
  * *Angle Constraint*: Hold `Shift` to constrain lines to $15^\circ$ increments for orthogonal corners.
* **Plot Subdivision**: Supports splitting plot boundaries using horizontal/vertical vectors or custom coordinate slicing lines.

### ⏱️ Attendance & Break Controls
* **Check-In/Out Loop**: Real-time logging of employee shift clock cycles. Calculates total cumulative working hours per day.
* **Break Session Sessions**: Sub-system tracking for agent lunches, bio breaks, or tea breaks. Suppresses active dials during active break logs.
* **Leave Requests approvals**: Agents submit digital leave vouchers. Managerial users audit, approve, or reject submissions via a dedicated approvals panel.

---

## 🛠️ Developer Setup & Setup

### Prerequisites
* **Node.js**: `v18.x` or higher
* **Package Manager**: `npm`

### Environment Configurations
Create a `.env` file in the project root containing your Firebase config keys:

```env
VITE_FIREBASE_API_KEY="your-api-key"
VITE_FIREBASE_AUTH_DOMAIN="your-project-id.firebaseapp.com"
VITE_FIREBASE_PROJECT_ID="your-project-id"
VITE_FIREBASE_STORAGE_BUCKET="your-project-id.appspot.com"
VITE_FIREBASE_MESSAGING_SENDER_ID="your-sender-id"
VITE_FIREBASE_APP_ID="your-app-id"
VITE_FIREBASE_APP_CHECK_DEBUG_TOKEN="your-debug-token"
```

### Setup Instructions
1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the local Vite development server:
   ```bash
   npm run dev
   ```
3. Compile the production bundle:
   ```bash
   npm run build
   ```

---

## 📦 Deployment & Updates

### Firebase Hosting
Deploying the client-side SPA bundle to Firebase Hosting:
```bash
npm run build
firebase deploy --only hosting
```

### Capacitor OTA (Over-the-Air) Updates
The app integrates with `@capgo/capacitor-updater` to deploy instant code updates to compiled Android binaries without requiring full APK updates in app stores:
```bash
npm run build:ota
```
*(This packages Vite build outputs, increments OTA telemetry tags, and synchronizes zip releases with the Firebase hosting storage buckets)*.

---

## 🔒 Code Standards & System Rules

1. **Role Authorization**: Access roles are governed via Firebase custom rules. Avoid hardcoding permission scopes inside front-end widgets. Check role criteria using [roleUtils.ts](file:///c:/Users/pushp/OneDrive/Documents/Golden%20Acres%20Projects/telecaller-app/src/shared/utils/roleUtils.ts) against the custom collection variables.
2. **Type-Safe Firestore Collections**: Magic string collection definitions are strictly prohibited. Always reference collection targets from [constants/index.ts](file:///c:/Users/pushp/OneDrive/Documents/Golden%20Acres%20Projects/telecaller-app/src/shared/constants/index.ts):
   ```typescript
   import { COLLECTIONS } from "@/shared/constants";
   const leadsRef = collection(db, COLLECTIONS.LEADS);
   ```
3. **centralized Logger**: Avoid using raw `console.log` statements. Use [logger.ts](file:///c:/Users/pushp/OneDrive/Documents/Golden%20Acres%20Projects/telecaller-app/src/shared/utils/logger.ts) to manage environmental verbosity:
   ```typescript
   import { logger } from "@/shared/utils/logger";
   logger.info("Category", "Informative description", payload);
   ```
4. **Tailwind Styling Theme Guidelines**: Do not write custom hex color codes inline. All styles must fetch colors from the Tailwind config variables supporting light and dark modes (`dark:bg-*`).
