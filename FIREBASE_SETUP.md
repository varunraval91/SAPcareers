# Firebase Setup (Personal Anonymous Mode)

This project now uses Firebase Anonymous Authentication only.
There is no OAuth popup sign-in flow.

## 1) Configure Firebase in code
Update `firebase-config.js` with your project config:
- `apiKey`
- `authDomain`
- `projectId`
- `storageBucket`
- `messagingSenderId`
- `appId`

## 2) Enable Anonymous Auth
In Firebase Console:
1. Open `Authentication`
2. Open `Sign-in method`
3. Enable `Anonymous`

## 3) Create Firestore Database
1. Open `Firestore Database`
2. Create database
3. Use rules that allow authenticated users to read/write only their own docs

Example rules:
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

## 4) Run app locally
Do not open via `file://`.
Use local server:

```powershell
npx --yes http-server -p 5501
```

Open:
- `http://127.0.0.1:5501/index.html`

## 5) Data model used by app
- `users/{uid}/applications/{applicationId}`
- `users/{uid}` for settings

## Notes for other users
Anyone using this project should create their own Firebase project and replace `firebaseConfig` values in `firebase-config.js`.
