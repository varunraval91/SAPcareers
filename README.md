# Job and Internship Application Tracking Pipeline

Track internship and job applications with a Kanban workflow, analytics dashboard, import/export tools, and optional Firebase persistence.

## Overview
This project is a frontend web app with:
- Authentication screen with light/dark theme sync
- Main pipeline board with 6 stages
- Weekly goal + KPI strip + search/filter/sort
- Dedicated Analytics view (charts, filters, table, CSV export)
- Local guest mode and Firebase user mode

Stages used in the project:
- `Wishlist`
- `Applied`
- `OA/Test`
- `Interview`
- `Rejected`
- `Offer`

## Tech Stack
- HTML5
- CSS3 (`css/styles.css`, `css/redesign.css`, `css/auth-screen-styles.css`)
- Vanilla JavaScript (`js/app.js`, `js/auth.js`)
- Firebase Auth + Firestore (optional, when configured)
- Chart.js for analytics charts

## Project Structure
```text
.
├─ index.html
├─ README.md
├─ css/
│  ├─ styles.css
│  ├─ redesign.css
│  └─ auth-screen-styles.css
├─ js/
│  ├─ app.js
│  ├─ auth.js
│  ├─ firebase-config.js
│  ├─ firebase-config.example.js
│  └─ firebase-config.local.js
└─ data/
```

## Quick Start
1. Open a terminal in the project folder.
2. Start a static server:

```powershell
npx --yes http-server -p 5500
```

3. Open:
- `http://127.0.0.1:5500/index.html`

## Core Features
1. Authentication and Session
- Email/password login through Firebase (when configured)
- Guest mode for local demo/testing without cloud sign-in
- Logout and guest data reset

2. Pipeline Management
- Add/edit/delete job applications
- Drag-and-drop cards across stages
- Weekly goal tracker
- Stage counters and response-rate KPI

3. Search and Filters
- Free-text search
- Stage chips
- Company shortcuts and slash-style company shortcut support
- Sorting options

4. Analytics View
- Dedicated analytics screen toggle from sidebar icon
- Filter sidebar: date range, status checkboxes, company, location, keyword
- Active filter chips with remove controls
- Stats cards, bar chart, donut chart
- Filtered results table + CSV export

5. Import and Export
- Import data from CSV/Excel
- Export data to CSV from dashboard
- Export filtered analytics rows to CSV

## Firebase Setup (Optional)
1. Create a Firebase project.
2. Enable `Authentication -> Email/Password`.
3. Create Firestore database.
4. Copy `js/firebase-config.example.js` to `js/firebase-config.local.js` and fill your values.

Note:
- `js/firebase-config.local.js` is ignored by Git and intended for local secrets.
- You can still run the app in guest mode without Firebase setup.

Suggested Firestore rules:

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

## How Data Works
- Guest mode: data is stored in browser `localStorage`.
- Signed-in Firebase mode: data syncs to Firestore under the user scope.
- Theme preference is persisted and synchronized between auth screen and app screen.

## Submission Notes
- Legacy analytics panel code and markup were removed; only the Analytics sidebar flow is active.
- Unused repository artifacts were removed for a cleaner hand-in package.

## Troubleshooting
1. Firebase not loading
- Verify script includes and config in `js/firebase-config.js`.
- Ensure project is served over `http://localhost` or `http://127.0.0.1`, not `file://`.

2. Chart area empty
- Check internet connectivity for Chart.js CDN loading.

3. Data missing after mode switch
- Confirm whether you are in guest mode or signed-in mode; their storage is separate.

## License
Use this repository for educational and personal portfolio purposes unless your team specifies a different license.
