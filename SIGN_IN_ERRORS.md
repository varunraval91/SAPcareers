# 🔴 Common Google Sign-In Errors & Fixes

After signing in, if you see a red error message, here are the solutions:

## Error Messages You Might See

### 1. "Popup was blocked by your browser"
**What it means:** Your browser's popup blocker is preventing the Google sign-in window from opening.

**How to fix:**
- Allow popups for this website:
  - Chrome: Click 🔒 next to the URL → "Popup blocked" → Allow
  - Firefox: Click 🔒 next to the URL → "Blocked Pop-up window" → Allow
  - Safari: Preferences → Security → Allow pop-ups
- Try signing in again

---

### 2. "Sign-in cancelled"
**What it means:** You closed the Google sign-in popup window.

**How to fix:**
- Click "Sign in with Google" again
- Don't close the popup window that appears
- Complete the sign-in process

---

### 3. "Network error"
**What it means:** There's a problem connecting to Google's servers or Firebase.

**How to fix:**
1. Check your internet connection
2. Try again in a few seconds
3. If still failing, check:
   - https://status.firebase.google.com/ (Firebase status)
   - https://www.google.com/appsstatus (Google services status)

---

### 4. "Sign-in not configured"
**What it means:** Google Sign-In is not enabled in Firebase Console.

**How to fix:**
1. Go to Firebase Console → Authentication
2. Click "Get Started" or go to "Sign-in method"
3. Click "Google"
4. Enable it (toggle ON)
5. Make sure "Support email" is set
6. Click Save
7. Try signing in again

---

### 5. "Domain not authorized"
**What it means:** Your current domain (website URL) is not authorized to use Google Sign-In.

**How to fix:**

**If testing locally:**
1. Go to Firebase Console → Authentication → Settings → Authorized domains
2. If `localhost` is NOT in the list, click "Add domain" and add: `localhost`
3. If testing with IP (like `127.0.0.1:5000`), add that too
4. Save and wait 5 minutes
5. Try again

**If on GitHub Pages:**
1. Go to Firebase Console → Authentication → Settings → Authorized domains
2. Click "Add domain"
3. Add your GitHub Pages URL: `YOUR_USERNAME.github.io`
4. Save and wait 5 minutes
5. Try again

**If on your own domain:**
1. Go to Firebase Console → Authentication → Settings → Authorized domains
2. Click "Add domain"
3. Add: `yourdomain.com`
4. Save and wait 5 minutes
5. Try again

---

## How to Check Your Authorized Domains (Firebase Console)

1. Go to 🔗 https://console.firebase.google.com
2. Select project: **jobs-progress-tracker**
3. Left sidebar → "Authentication"
4. Click "Settings" tab (gear icon)
5. Scroll down to "Authorized domains"
6. You should see:
   - `localhost`
   - `127.0.0.1`
   - `YOUR_USERNAME.github.io` (if on GitHub Pages)

---

## Debugging Steps

1. **Open Browser Console** (Press F12)
2. Go to **Console** tab
3. Try signing in again
4. Look for error messages that say:
   - `Sign-in error:`
   - `Error code:`
   - `Error message:`
5. These messages will tell you exactly what went wrong

### Example Console Output:
```
🔑 Initiating Google Sign-In...
❌ Sign-in error: FirebaseError: Firebase: Error (auth/unauthorized-domain).
Error code: auth/unauthorized-domain
Error message: This domain is not authorized...
```

---

## If You Get "Firebase: Error (auth/XXXX)"

The error codes tell you what's wrong:

- `auth/popup-blocked` → Browser blocked popup
- `auth/popup-closed-by-user` → You closed the window
- `auth/network-request-failed` → Internet/network problem
- `auth/operation-not-allowed` → Google Sign-In not enabled
- `auth/unauthorized-domain` → Domain not authorized
- `auth/internal-error` → Firebase problem (usually temporary)

---

## Quick Checklist

- [ ] Is your internet working?
- [ ] Does the Google popup window appear?
- [ ] Are popups allowed in your browser?
- [ ] Is Google Sign-In enabled in Firebase?
- [ ] Is your domain added to Authorized Domains?
- [ ] Have you waited 5 minutes after adding a new domain?

---

## Still Not Working?

**Check these:**

1. **Browser Console** (F12 → Console)
   - What exact error message?
   
2. **Firebase Console**
   - Authentication → Settings → Is Google enabled?
   - Authentication → Settings → Authorized domains - Does it include your domain?
   
3. **Test URL**
   - Are you accessing via `http://localhost` or `https://`?
   - NOT `file:///C:/...` (file protocol doesn't work with Firebase)

4. **Incognito Mode**
   - Try in incognito/private window (clears extensions that might block popups)

---

## What Should Happen When It Works ✅

1. You see the auth screen with "Sign in with Google" button
2. You click the button
3. Google popup appears asking you to sign in
4. You sign in with your Google account
5. Popup closes automatically
6. Dashboard appears with your name and email in the sidebar
7. You're ready to add job applications!

