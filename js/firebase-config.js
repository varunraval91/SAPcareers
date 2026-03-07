/**
 * Firebase config for Job and Internship Application Tracking Pipeline.
 *
 * IMPORTANT:
 * - Never commit real Firebase credentials to a public repository.
 * - Replace the placeholder values below with your own Firebase project values.
 */
const firebaseConfig = {
  apiKey: "YOUR_FIREBASE_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID",
  measurementId: "YOUR_MEASUREMENT_ID"
};

// ═══════════════════════════════════════════════════════════════
// INITIALIZE FIREBASE
// ═══════════════════════════════════════════════════════════════
let app, auth, db;

function initializeFirebase() {
  try {
    if (typeof firebase === 'undefined') {
      console.error('Firebase SDK not loaded. Check internet connection.');
      return false;
    }

    const hasPlaceholderConfig = Object.values(firebaseConfig).some((v) => String(v).includes('YOUR_'));
    if (hasPlaceholderConfig) {
      console.error('Firebase config placeholders detected. Update js/firebase-config.js with your project values.');
      return false;
    }

    app = firebase.initializeApp(firebaseConfig);
    auth = firebase.auth();
    db = firebase.firestore();

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
// AUTHENTICATION HELPERS (EMAIL SIGN-IN MODE)
// ═══════════════════════════════════════════════════════════════

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
    signInWithEmail,
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
