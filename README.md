# Job and Internship Application Tracking Pipeline

A frontend-first web application to track job and internship applications with stage-based workflow, KPI metrics, and Firebase cloud persistence.

## Final Project Scope
- Login-first workflow (email/password required)
- No guest mode and no anonymous access to dashboard
- Kanban pipeline with six stages (`Wishlist`, `Applied`, `OA/Test`, `Interview`, `Rejected`, `Offer`)
- KPI/stat cards, weekly goal, filtering, search, and sorting
- Two-step data entry flow:
  - Step 1 extract from job link or file
  - Step 2 review/edit and save
- Cross-company metadata extraction improvements:
  - Requisition ID synonyms (`Job ID`, `Req ID`, `Requisition ID`, etc.)
  - Posting date synonyms (`Listed`, `Posting Date`, `Publication Date`, etc.)
  - Location extraction improvements
  - DB careers API fallback for dynamic pages
- CSV export and CSV/Excel import support

## Final Folder Structure
```text
.
├─ index.html
├─ README.md
├─ .gitignore
├─ assets/
│  └─ icons.svg
├─ css/
│  ├─ styles.css
│  └─ auth-screen-styles.css
├─ js/
│  ├─ app.js
│  ├─ auth.js
│  ├─ firebase-config.js
│  └─ quotes.js
├─ data/
│  └─ sample_applications.csv
└─ tools/
   └─ sap_web_scraping.py
```

## Journey: From Scratch to Final Result
### Phase 1: Core UI and basic flow
- Built a single-page app structure with kanban, modal form, and stats.
- Added create/read/update/delete behavior and stage tracking.

### Phase 2: Persistence and auth integration
- Integrated Firebase Auth + Firestore.
- Early versions used anonymous mode for convenience.

### Phase 3: Major issues encountered
- Data lost after refresh due to auth/session sequencing and loading logic.
- Unexpected default seeded jobs appeared even when not needed.
- Cross-browser/device continuity failed under anonymous-only auth.
- SAP and dynamic career pages often missed posting date/req ID.
- UX confusion during step-1 extraction because there was no visible loading state.

### Phase 4: Stabilization and refinements
- Fixed auth persistence and data loading/listening fallbacks.
- Removed forced default seeded records.
- Implemented stronger metadata extraction with synonym mapping.
- Added fallback extraction paths and DB API fallback for dynamic pages.
- Added explicit loading animation during background extraction.
- Reworked to strict login-first access and removed guest mode.

### Phase 5: Submission hardening
- Reorganized project into clean `css/js/data/tools` layout.
- Removed debug/duplicate files.
- Replaced hardcoded Firebase credentials with placeholders.
- Sanitized scraping utility to avoid publishing personal URLs/tokens.

## What Failed and How It Was Handled
1. `auth/operation-not-allowed` during account-linking flow
- Cause: Firebase account-linking/security constraints.
- Action: Moved away from fragile linking path and stabilized auth flow around explicit sign-in logic.

2. Missing metadata on dynamic career sites
- Cause: Page HTML alone was insufficient for SPA-driven job pages.
- Action: Added multi-strategy extraction and targeted API fallback (DB jobhtml endpoint).

3. User confusion while extraction was running
- Cause: No UI feedback for asynchronous scraping.
- Action: Added visible loader + status text and disabled controls during extraction.

## Learning Outcomes
- Authentication state management is the foundation of reliable cloud persistence.
- Data extraction from job portals requires layered strategies (URL, JSON-LD, HTML text, API fallback).
- UX feedback for long-running async actions dramatically reduces user error.
- Shipping-ready code requires explicit secret hygiene and repository hardening, not just feature completion.

## Security and Privacy Notes
This repository is prepared to avoid exposing private credentials in current files:
- `js/firebase-config.js` now contains placeholders only.
- `tools/sap_web_scraping.py` no longer contains personal portal tokens/URLs.
- `data/sample_applications.csv` contains non-personal sample data.

Important:
- Git history previously contained Firebase project values and a direct SAP portal URL token.
- Even after cleaning current files, already-pushed history may still contain old values.

Recommended immediate actions for public repositories:
1. Rotate Firebase credentials / regenerate keys and update project restrictions in Firebase and Google Cloud.
2. If strict cleanup is required, rewrite git history and force-push cleaned history.
3. Verify Firestore security rules are scoped to authenticated user UID ownership.

## Setup Guide for Other Users
### 1) Clone and run locally
```powershell
git clone <your-repo-url>
cd <repo-folder>
npx --yes http-server -p 5500
```
Open:
- `http://127.0.0.1:5500/index.html`

### 2) Configure Firebase
Edit `js/firebase-config.js` and replace placeholders:
- `YOUR_FIREBASE_API_KEY`
- `YOUR_PROJECT_ID`
- `YOUR_MESSAGING_SENDER_ID`
- `YOUR_APP_ID`
- `YOUR_MEASUREMENT_ID`

### 3) Enable Firebase services
In Firebase Console:
1. Authentication -> Sign-in method -> Enable `Email/Password`
2. Firestore Database -> Create database
3. Add secure rules, for example:
```txt
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

### 4) Use the app
- Sign in on the first screen.
- Add application entries through Step 1 (extract) and Step 2 (review/save).
- Track movement across stages in the kanban board.

## Optional Tooling Note
`tools/sap_web_scraping.py` is optional utility code and not required to run the web app. If you use it, set your own `APPLICATIONS_URL` via environment variable.
