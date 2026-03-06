# Internship Application Pipeline

Pure HTML + JavaScript homework project with basic CRUD operations.

## Features
- Create internship applications
- Read/search/filter applications
- Update application details and stage
- Delete applications
- Firebase Firestore cloud persistence
- Personal mode with automatic anonymous sign-in (no Google popup required)

## Run
1. Start a local server (do not use `file://`):
	- `npx --yes http-server -p 5500`
2. Open `http://127.0.0.1:5500/index.html`.
3. Add, edit, move, and delete applications.

## Firebase Setup (Personal Use)
1. In `firebase-config.js`, keep your Firebase project config values.
2. In Firebase Console > Authentication > Sign-in method, enable `Anonymous`.
3. In Firebase Console > Firestore Database, create database and keep rules aligned with authenticated users.

## If Someone Else Wants To Use This App
1. Create their own Firebase project.
2. Replace `firebaseConfig` object in `firebase-config.js` with their values.
3. Enable `Anonymous` auth in their Firebase project.
4. Deploy/run locally with the same code.

## Files
- `index.html`
- `styles.css`
- `app.js`