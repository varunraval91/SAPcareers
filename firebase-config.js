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
 * 5. Enable Google Authentication in Firebase Console
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
let app, auth, db, googleProvider;

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
    googleProvider = new firebase.auth.GoogleAuthProvider();

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
// AUTHENTICATION HELPERS
// ═══════════════════════════════════════════════════════════════
function signInWithGoogle() {
  return auth.signInWithPopup(googleProvider)
    .then((result) => {
      console.log('✅ Signed in:', result.user.email);
      return result.user;
    })
    .catch((error) => {
      if (error && error.code === 'auth/popup-blocked') {
        console.warn('Popup blocked, using redirect flow...');
        return auth.signInWithRedirect(googleProvider);
      }
      console.error('Sign-in error:', error);
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
    
    await appRef.set({
      ...application,
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
  try {
    const snapshot = await db.collection('users').doc(userId)
      .collection('applications')
      .orderBy('createdAt', 'desc')
      .get();
    
    const applications = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || doc.data().createdAt,
      updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() || doc.data().updatedAt
    }));
    
    console.log(`✅ Loaded ${applications.length} applications`);
    return applications;
  } catch (error) {
    console.error('Load error:', error);
    return [];
  }
}

// Real-time listener for applications
function listenToApplications(userId, callback) {
  return db.collection('users').doc(userId)
    .collection('applications')
    .orderBy('createdAt', 'desc')
    .onSnapshot(
      (snapshot) => {
        const applications = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || doc.data().createdAt,
          updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() || doc.data().updatedAt
        }));
        callback(applications);
      },
      (error) => {
        console.error('Listener error:', error);
      }
    );
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
    signInWithGoogle,
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
