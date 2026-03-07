/**
 * ═══════════════════════════════════════════════════════════════
 * FIREBASE CONFIGURATION
 * ═══════════════════════════════════════════════════════════════
 * 
 * SETUP INSTRUCTIONS:
 * 1. Ask Perplexity to create Firebase project (use prompt above)
 * 2. Copy the firebaseConfig object Perplexity gives you
 * 3. Replace the placeholder config below with your real config
 * 4. Enable Firestore Database in Firebase Console
 * 5. Enable Anonymous Authentication in Firebase Console
 * 6. Deploy and test
 */

// ═══════════════════════════════════════════════════════════════
// Firebase Configuration (from Firebase Console)
// Project: jobs-progress-tracker
// ═══════════════════════════════════════════════════════════════
const firebaseConfig = {
  apiKey: "AIzaSyDG0VBXMrUdxzpw3Hwwrsr_oRtiVg_vSuM",
  authDomain: "jobs-progress-tracker.firebaseapp.com",
  projectId: "jobs-progress-tracker",
  storageBucket: "jobs-progress-tracker.firebasestorage.app",
  messagingSenderId: "556518693770",
  appId: "1:556518693770:web:2df595285bf3ec199f0673",
  measurementId: "G-8JNFN5X2RE"
};

// ═══════════════════════════════════════════════════════════════
// INITIALIZE FIREBASE
// ═══════════════════════════════════════════════════════════════
let app, auth, db;

function initializeFirebase() {
  try {
    // Check if Firebase is loaded
    if (typeof firebase === 'undefined') {
      console.error('Firebase SDK not loaded. Check internet connection.');
      return false;
    }

    // Initialize Firebase
    app = firebase.initializeApp(firebaseConfig);
    auth = firebase.auth();
    db = firebase.firestore();
    // Enable offline persistence
    db.enablePersistence({ synchronizeTabs: true })
      .catch((err) => {
        console.warn('Firestore persistence error:', err.code);
      });

    console.log('✅ Firebase initialized successfully');
    return true;
  } catch (error) {
    console.error('Firebase initialization error:', error);
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════
// AUTHENTICATION HELPERS (ANONYMOUS PERSONAL MODE)
// ═══════════════════════════════════════════════════════════════
function signInAnonymously() {
  // Keep anonymous user session across refreshes in this browser.
  return auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
    .then(() => auth.signInAnonymously())
    .then((result) => {
      console.log('✅ Signed in anonymously:', result.user.uid);
      return result.user;
    })
    .catch((error) => {
      console.error('Anonymous sign-in error:', error);
      throw error;
    });
}

function signOut() {
  return auth.signOut()
    .then(() => {
      console.log('✅ Signed out');
    })
    .catch((error) => {
      console.error('Sign-out error:', error);
      throw error;
    });
}

function signInWithEmail(email, password) {
  return auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
    .then(() => auth.signInWithEmailAndPassword(email, password))
    .then((result) => {
      console.log('✅ Signed in with email:', result.user.uid);
      return result.user;
    })
    .catch((error) => {
      console.error('Email sign-in error:', error);
      throw error;
    });
}

function createUserWithEmail(email, password) {
  return auth.createUserWithEmailAndPassword(email, password)
    .then((result) => {
      console.log('✅ Email user created:', result.user.uid);
      return result.user;
    })
    .catch((error) => {
      console.error('Email user creation error:', error);
      throw error;
    });
}

async function upgradeAnonymousToEmail(email, password) {
  const anonymousUser = auth.currentUser;
  if (!anonymousUser) {
    throw new Error('No active user. Sign in anonymously first.');
  }
  if (!anonymousUser.isAnonymous) {
    return anonymousUser; // Already permanent account
  }

  const anonymousUid = anonymousUser.uid;
  console.log('🔄 Migrating data from anonymous account:', anonymousUid);

  try {
    // Step 1: Fetch all data from anonymous user
    const snapshot = await db.collection('users').doc(anonymousUid)
      .collection('applications').get();
    const applications = [];
    snapshot.forEach(doc => applications.push({ id: doc.id, ...doc.data() }));
    console.log(`📦 Found ${applications.length} applications to migrate`);

    // Step 2: Create new email/password account
    const credential = await auth.createUserWithEmailAndPassword(email, password);
    const newUser = credential.user;
    const newUid = newUser.uid;
    console.log('✅ New email account created:', newUid);

    // Step 3: Copy all applications to new user
    const batch = db.batch();
    applications.forEach(app => {
      const newRef = db.collection('users').doc(newUid)
        .collection('applications').doc(app.id);
      batch.set(newRef, app);
    });
    await batch.commit();
    console.log(`✅ Migrated ${applications.length} applications to new account`);

    // Step 4: Delete old anonymous data (optional cleanup)
    try {
      const deletePromises = [];
      snapshot.forEach(doc => deletePromises.push(doc.ref.delete()));
      await Promise.all(deletePromises);
      await anonymousUser.delete();
      console.log('🗑️ Cleaned up old anonymous account');
    } catch (cleanupError) {
      console.warn('Cleanup warning (non-critical):', cleanupError);
    }

    return newUser;
  } catch (error) {
    console.error('Migration error:', error);
    throw error;
  }
}

function getCurrentUser() {
  return auth.currentUser;
}

function onAuthStateChanged(callback) {
  return auth.onAuthStateChanged(callback);
}

// ═══════════════════════════════════════════════════════════════
// FIRESTORE DATA OPERATIONS
// ═══════════════════════════════════════════════════════════════

// Save application
async function saveApplicationToFirestore(userId, application) {
  try {
    const appRef = db.collection('users').doc(userId)
      .collection('applications').doc(application.id);
    const nowIso = new Date().toISOString();
    
    await appRef.set({
      ...application,
      createdAt: application.createdAt || nowIso,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    
    console.log('✅ Application saved:', application.id);
    return true;
  } catch (error) {
    console.error('Save error:', error);
    throw error;
  }
}

// Load all applications
async function loadApplicationsFromFirestore(userId) {
  const mapDoc = (doc) => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || doc.data().createdAt,
    updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() || doc.data().updatedAt
  });

  const baseRef = db.collection('users').doc(userId).collection('applications');

  try {
    const snapshot = await baseRef.orderBy('updatedAt', 'desc').get();
    
    const applications = snapshot.docs.map(mapDoc);
    
    console.log(`✅ Loaded ${applications.length} applications`);
    return applications;
  } catch (error) {
    console.warn('Ordered load failed, falling back to unordered load:', error.code || error.message);
    try {
      const fallbackSnapshot = await baseRef.get();
      const applications = fallbackSnapshot.docs.map(mapDoc)
        .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0));
      console.log(`✅ Loaded ${applications.length} applications (fallback)`);
      return applications;
    } catch (fallbackError) {
      console.error('Fallback load error:', fallbackError);
      return [];
    }
  }
}

// Real-time listener for applications
function listenToApplications(userId, callback) {
  const mapDoc = (doc) => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || doc.data().createdAt,
    updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() || doc.data().updatedAt
  });

  const baseRef = db.collection('users').doc(userId).collection('applications');
  const onSnapshotData = (snapshot) => {
    const applications = snapshot.docs.map(mapDoc)
      .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0));
    callback(applications);
  };

  let fallbackUnsubscribe = null;
  const primaryUnsubscribe = baseRef
    .orderBy('updatedAt', 'desc')
    .onSnapshot(
      onSnapshotData,
      (error) => {
        console.warn('Ordered listener failed, switching to fallback listener:', error.code || error.message);
        if (!fallbackUnsubscribe) {
          fallbackUnsubscribe = baseRef.onSnapshot(
            onSnapshotData,
            (fallbackError) => {
              console.error('Fallback listener error:', fallbackError);
            }
          );
        }
      }
    );

  return () => {
    primaryUnsubscribe();
    if (fallbackUnsubscribe) {
      fallbackUnsubscribe();
    }
  };
}

// Delete application
async function deleteApplicationFromFirestore(userId, applicationId) {
  try {
    await db.collection('users').doc(userId)
      .collection('applications').doc(applicationId).delete();
    
    console.log('✅ Application deleted:', applicationId);
    return true;
  } catch (error) {
    console.error('Delete error:', error);
    throw error;
  }
}

// Save user settings
async function saveUserSettings(userId, settings) {
  try {
    await db.collection('users').doc(userId).set({
      settings,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    
    console.log('✅ Settings saved');
    return true;
  } catch (error) {
    console.error('Settings save error:', error);
    throw error;
  }
}

// Load user settings
async function loadUserSettings(userId) {
  try {
    const doc = await db.collection('users').doc(userId).get();
    
    if (doc.exists) {
      return doc.data().settings || {};
    }
    return {};
  } catch (error) {
    console.error('Settings load error:', error);
    return {};
  }
}

// ═══════════════════════════════════════════════════════════════
// EXPORT API
// ═══════════════════════════════════════════════════════════════
window.FirebaseAPI = {
  initialize: initializeFirebase,
  isReady: () => !!auth && !!db,
  auth: {
    signInAnonymously,
    signInWithEmail,
    createUserWithEmail,
    upgradeAnonymousToEmail,
    signOut,
    getCurrentUser,
    onAuthStateChanged
  },
  db: {
    saveApplication: saveApplicationToFirestore,
    loadApplications: loadApplicationsFromFirestore,
    listenToApplications: listenToApplications,
    deleteApplication: deleteApplicationFromFirestore,
    saveSettings: saveUserSettings,
    loadSettings: loadUserSettings
  }
};

// ═══════════════════════════════════════════════════════════════
// AUTO-INITIALIZE WHEN SCRIPT LOADS
// ═══════════════════════════════════════════════════════════════
console.log('🔥 Firebase Config: Initializing...');
if (typeof firebase !== 'undefined') {
  initializeFirebase();
  console.log('✅ Firebase initialized in firebase-config.js');
} else {
  console.error('❌ Firebase SDK not loaded when firebase-config.js executed');
  // Retry if Firebase loads later
  const checkInterval = setInterval(() => {
    if (typeof firebase !== 'undefined') {
      clearInterval(checkInterval);
      console.log('🔥 Firebase SDK detected, initializing...');
      initializeFirebase();
    }
  }, 100);
  setTimeout(() => clearInterval(checkInterval), 5000); // Stop checking after 5s
}
