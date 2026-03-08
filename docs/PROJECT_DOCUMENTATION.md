# Job and Internship Application Tracking Pipeline

## 1. Abstract
The Job and Internship Application Tracking Pipeline is a web-based academic project designed to support structured job-search management. The system provides a Kanban workflow for application stages, analytics for tracking outcomes, CSV/Excel import-export capabilities, and dual persistence modes (local guest mode and optional Firebase cloud mode). The project demonstrates practical full-stack-adjacent frontend engineering through modular JavaScript architecture, state-driven UI rendering, and secure configuration handling.

## 2. Project Context and Motivation
Manual job application tracking is often scattered across spreadsheets, notes, and browser bookmarks. This increases cognitive load and makes it difficult to evaluate progress, identify bottlenecks, and plan follow-up actions.

This project addresses that gap by offering a single, interactive tracking workspace with:
- consistent stage-based process management,
- measurable KPIs and analytics,
- persistent data storage in both offline-first and cloud-enabled modes.

## 3. Objectives
### 3.1 Primary Objectives
- Build a user-friendly application tracking dashboard.
- Implement stage-based workflow management using Kanban columns.
- Provide meaningful analytics to support decision making.
- Support secure, optional cloud synchronization via Firebase.

### 3.2 Secondary Objectives
- Support guest mode for quick usage without cloud setup.
- Enable interoperability with external tools through CSV/Excel import-export.
- Maintain a responsive, theme-aware UI (light and dark themes).

## 4. Scope
### 4.1 In Scope
- Job application CRUD operations.
- Stage transitions by drag-and-drop.
- Search, sorting, and filtering.
- Analytics view with filters, charts, and table export.
- Authentication flow for Firebase users.
- Guest mode with localStorage persistence.

### 4.2 Out of Scope
- Multi-user collaboration features.
- Backend custom API server.
- Automated email integration and reminders.
- Native mobile application packaging.

## 5. Technology Stack
- Frontend: HTML5, CSS3, Vanilla JavaScript
- Charts: Chart.js (CDN)
- File parsing: XLSX library (CDN)
- Cloud persistence and auth: Firebase Auth + Firestore (compat SDK)
- Optional external utility: Python + Playwright (`tools/sap_web_scraping.py`)

## 6. System Architecture
The project follows a modular client-side architecture with separation by responsibility.

### 6.1 High-Level Components
- `index.html`: application shell and semantic structure.
- `js/auth.js`: authentication screen behavior and session transitions.
- `js/firebase-config.js`: Firebase initialization and data-access wrappers.
- `js/app.js`: core application logic, UI state management, rendering, and analytics interactions.
- `css/styles.css`: base visual system and component styles.
- `css/redesign.css`: redesign/override styling layer.
- `css/auth-screen-styles.css`: dedicated authentication view styling.

### 6.2 Data Flow Modes
- Guest mode:
  - data stored in browser `localStorage`.
  - no Firebase dependency required.
- Authenticated mode:
  - data stored in Firestore under user-scoped collection paths.
  - state updates synchronized through Firestore listeners.

## 7. Functional Requirements
### 7.1 Authentication and Access
- FR-1: Users can sign in using email/password when Firebase is configured.
- FR-2: Users can continue in guest mode without Firebase.
- FR-3: Users can sign out and reset guest data.

### 7.2 Application Lifecycle Management
- FR-4: Users can create application entries.
- FR-5: Users can update existing entries.
- FR-6: Users can delete entries.
- FR-7: Users can move entries across defined stages via drag-and-drop.

### 7.3 Search, Sorting, and Filters
- FR-8: Users can search applications by relevant fields.
- FR-9: Users can filter by stage and company shortcuts.
- FR-10: Users can sort entries by supported criteria.

### 7.4 Analytics
- FR-11: Users can open a dedicated analytics view.
- FR-12: Users can filter analytics by date range, status, company, location, keyword, and free-text search.
- FR-13: Users can view summary KPI cards and chart visualizations.
- FR-14: Users can export filtered analytics rows to CSV.

### 7.5 Import and Export
- FR-15: Users can import data from CSV/Excel files.
- FR-16: Users can export full dashboard data to CSV.

## 8. Non-Functional Requirements
- NFR-1: Usability
  - clear stage indicators and consistent interactions.
- NFR-2: Performance
  - local state updates should render without noticeable lag for typical user datasets.
- NFR-3: Reliability
  - guest mode remains functional without cloud setup.
- NFR-4: Security
  - local Firebase secrets are separated from tracked source files.
- NFR-5: Maintainability
  - logic split across auth, Firebase wrapper, and app controller modules.

## 9. Data Model (Conceptual)
Each application record includes fields such as:
- `id`
- `company`
- `role`
- `location`
- `stage`
- `deadline`
- `reqId`
- `notes`
- `createdAt`
- `updatedAt`

Supported stages:
- Wishlist
- Applied
- OA/Test
- Interview
- Rejected
- Offer

## 10. Key Workflows
### 10.1 Guest Workflow
1. Open app.
2. Continue as guest.
3. Create and move applications across stages.
4. Data persists in localStorage.

### 10.2 Authenticated Workflow
1. Configure Firebase local settings.
2. Sign in with email/password.
3. Read and write applications through Firestore wrappers.
4. Changes persist under user-scoped data.

### 10.3 Analytics Workflow
1. Open Analytics from sidebar.
2. Apply filters.
3. Review KPIs and charts.
4. Export filtered table to CSV when needed.

## 11. Security and Configuration Strategy
- `js/firebase-config.local.js` is intended for local environment credentials.
- `js/firebase-config.example.js` is a safe placeholder template.
- `js/firebase-config.js` contains initialization and wrappers, not private values.
- Firestore rules should enforce user ownership by UID.

Suggested rule pattern:
- allow read/write only when `request.auth.uid == userId` for user path.

## 12. Setup and Execution
### 12.1 Local Run
1. Open terminal in project root.
2. Run:

```powershell
npx --yes http-server -p 5500
```

3. Open `http://127.0.0.1:5500/index.html`.

### 12.2 Firebase Setup (Optional)
1. Create Firebase project.
2. Enable Email/Password Authentication.
3. Create Firestore database.
4. Copy `js/firebase-config.example.js` values into `js/firebase-config.local.js`.

## 13. Verification and Testing Evidence
Validation performed during cleanup and finalization:
- static diagnostics: no reported errors in workspace checks,
- smoke test: app served successfully with HTTP 200 response,
- dead-code cleanup validation: legacy analytics references removed and runtime retained.

## 14. Known Limitations
- No server-side custom API; all logic is client-centric.
- Limited automated test suite coverage (manual and smoke validation focused).
- Very large CSS override layer (`styles.css` + `redesign.css`) may increase long-term maintenance effort.

## 15. Future Enhancements
- Consolidate CSS layers into a single maintainable design system.
- Add automated testing (unit + integration + E2E smoke suite).
- Add reminder engine for deadlines and follow-up actions.
- Add richer analytics history and trend persistence.
- Add role-based multi-user collaboration.

## 16. Conclusion
The project successfully implements a professional application-tracking solution with practical features relevant to academic and real-world use. It demonstrates frontend engineering competency in UI state handling, optional cloud integration, structured data workflows, and iterative product cleanup. The current version is stable, documented, and suitable for academic submission.

## 17. Repository Map
- `index.html`: App structure and script/style wiring
- `css/styles.css`: Base UI styles
- `css/redesign.css`: Redesign override styles
- `css/auth-screen-styles.css`: Auth view styles
- `js/app.js`: Core state and UI logic
- `js/auth.js`: Authentication screen and session wiring
- `js/firebase-config.js`: Firebase wrappers and initialization
- `js/firebase-config.example.js`: Shareable config template
- `js/firebase-config.local.js`: Local non-committed config
- `data/sample_applications.csv`: Sample import dataset
- `tools/sap_web_scraping.py`: Optional utility script for exporting application tables
