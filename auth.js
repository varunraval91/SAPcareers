/**
 * ═══════════════════════════════════════════════════════════════
 * AUTHENTICATION UI & FLOW
 * ═══════════════════════════════════════════════════════════════
 */

(() => {
  const DEFAULT_JOB_LINK = "https://jobs.sap.com/job/Walldorf-SAP-Corporate-Functions-&-Analytics-iXp-Intern-%28fmd%29-Corporate-Finance-Analytics-Team-69190/1367369733/";
  const DEFAULT_JOB_COMPANY = "SAP";
  const DEFAULT_JOB_ROLE = "SAP Corporate Functions & Analytics iXp Intern (fmd) - Corporate Finance Analytics Team";

  let currentUser = null;
  let unsubscribeListener = null;
  let initRetries = 0;
  const MAX_INIT_RETRIES = 12;

  // ═══════════════════════════════════════════════════════════
  // INITIALIZATION
  // ═══════════════════════════════════════════════════════════
  function initAuth() {
    console.log('🔐 Auth: Checking Firebase...');

    // Firebase web app should run on localhost/http, not file://.
    if (window.location.protocol === 'file:') {
      showAuthScreen();
      showAuthError(
        'Run this app on localhost (not file://)',
        'Start a local server and open http://localhost:5500 (or similar). Example: python -m http.server 5500'
      );
      return;
    }
    
    // Wait for Firebase API and initialization
    if (typeof FirebaseAPI === 'undefined') {
      console.error('❌ FirebaseAPI not available');
      showAuthError('Firebase API not loaded.');
      return;
    }

    // Wait for Firebase to actually be initialized
    if (!FirebaseAPI.isReady || !FirebaseAPI.isReady()) {
      initRetries += 1;
      if (initRetries > MAX_INIT_RETRIES) {
        showAuthScreen();
        showAuthError(
          'Firebase failed to initialize',
          'Check network access to Firebase CDN and verify firebase config in firebase-config.js.'
        );
        return;
      }

      console.warn('⏳ Firebase not ready yet, retrying in 500ms...');
      setTimeout(initAuth, 500);
      return;
    }

    initRetries = 0;
    console.log('✅ Firebase ready, initializing auth...');
    
    // Listen to auth state changes
    FirebaseAPI.auth.onAuthStateChanged((user) => {
      if (user) {
        // User signed in
        console.log('👤 User signed in:', user.email || user.uid);
        currentUser = user;
        onUserSignedIn(user);
      } else {
        // No user yet: sign in automatically without popup.
        console.log('👤 No active user session');
        currentUser = null;
        startAnonymousSession();
      }
    });
  }

  async function startAnonymousSession() {
    try {
      console.log('🔐 Starting anonymous session...');
      await FirebaseAPI.auth.signInAnonymously();
    } catch (error) {
      console.error('❌ Anonymous session failed:', error);
      showAuthScreen();

      let details = 'Enable Anonymous provider in Firebase Console > Authentication > Sign-in method.';
      if (error.code === 'auth/admin-restricted-operation') {
        details = 'Anonymous auth is disabled. Enable it in Firebase Console > Authentication > Sign-in method > Anonymous.';
      } else if (error.code === 'auth/operation-not-allowed') {
        details = 'Anonymous auth is disabled. Enable it in Firebase Console > Authentication > Sign-in method > Anonymous.';
      } else if (error.code === 'auth/unauthorized-domain') {
        details = `Add this domain in Firebase Auth > Settings > Authorized domains: ${window.location.hostname}`;
      } else if (error.code === 'auth/invalid-api-key') {
        details = 'Invalid Firebase API key. Re-copy firebaseConfig from Firebase Console > Project settings.';
      }

      showAuthError('Cannot start personal workspace session', details);

      // Hard fallback: keep app usable with localStorage instead of black screen.
      showMainApp();
      if (window.JobHuntApp && window.JobHuntApp.init) {
        window.JobHuntApp.init(null, []);
      }
    }
  }

  // ═══════════════════════════════════════════════════════════
  // UI STATE MANAGEMENT
  // ═══════════════════════════════════════════════════════════
  function onUserSignedIn(user) {
    console.log('User signed in:', user.email || user.uid);
    
    // Hide auth screen
    hideAuthScreen();
    
    // Show main app
    showMainApp();
    
    // Update user info in UI
    updateUserInfo(user);

    // Load user data from Firestore
    loadUserData(user.uid);
    
    // Setup real-time listener
    setupRealtimeListener(user.uid);
  }

  function onUserSignedOut() {
    console.log('User signed out');
    
    // Clean up listener
    if (unsubscribeListener) {
      unsubscribeListener();
      unsubscribeListener = null;
    }
    
    // Show auth screen
    showAuthScreen();
    
    // Hide main app
    hideMainApp();
  }

  // ═══════════════════════════════════════════════════════════
  // AUTH SCREEN UI
  // ═══════════════════════════════════════════════════════════
  function showAuthScreen() {
    // Error-only screen in anonymous personal mode.
    const appLayout = document.querySelector('.app-layout');
    if (appLayout) {
      appLayout.style.display = 'none';
    }

    const existing = document.getElementById('auth-screen');
    if (existing) {
      existing.style.display = 'flex';
      return;
    }

    const authScreen = document.createElement('div');
    authScreen.id = 'auth-screen';
    authScreen.innerHTML = `
      <div class="auth-container">
        <div class="auth-card">
          <div class="auth-logo">
            <span class="auth-logo-icon">JH</span>
          </div>
          <h1 class="auth-title">Job Hunt HQ</h1>
          <p class="auth-subtitle">Starting your private cloud workspace...</p>

          <div class="auth-features">
            <div class="feature"><span class="feature-icon">📊</span>Track applications</div>
            <div class="feature"><span class="feature-icon">☁️</span>Cloud sync across devices</div>
            <div class="feature"><span class="feature-icon">🔒</span>Private anonymous session</div>
          </div>

          <div id="auth-error" class="auth-error" style="display:none;"></div>

          <p class="auth-footer">Origin: <code>${window.location.origin || 'file://'}</code></p>
          <p class="auth-footer">Your data syncs to Firestore and is available on any device.</p>
        </div>
      </div>
    `;

    document.body.appendChild(authScreen);
  }

  function hideAuthScreen() {
    const authScreen = document.getElementById('auth-screen');
    if (authScreen) {
      authScreen.style.display = 'none';
    }
  }

  function showMainApp() {
    const appLayout = document.querySelector('.app-layout');
    if (appLayout) {
      appLayout.style.display = 'grid';
    }
  }

  function hideMainApp() {
    const appLayout = document.querySelector('.app-layout');
    if (appLayout) {
      appLayout.style.display = 'none';
    }
  }

  function updateUserInfo(user) {
    // Add user info to sidebar
    const sidebar = document.querySelector('.sidebar-footer');
    if (!sidebar) return;

    let userInfo = document.getElementById('user-info');
    if (!userInfo) {
      userInfo = document.createElement('div');
      userInfo.id = 'user-info';
      userInfo.className = 'user-info';
      sidebar.insertBefore(userInfo, sidebar.firstChild);
    }

    userInfo.innerHTML = `
      <div class="user-avatar">
        ${user.photoURL ? `<img src="${user.photoURL}" alt="${user.displayName}" />` : user.displayName?.charAt(0) || 'U'}
      </div>
      <div class="user-details">
        <div class="user-name">${user.displayName || (user.isAnonymous ? 'Private Workspace' : 'User')}</div>
        <div class="user-email">${user.email || (user.isAnonymous ? 'Anonymous session' : '')}</div>
      </div>
    `;
  }

  // ═══════════════════════════════════════════════════════════
  // AUTH HANDLERS
  // ═══════════════════════════════════════════════════════════
  // No explicit login/logout handlers needed in anonymous personal mode.

  function showAuthError(message, details = '') {
    const errorEl = document.getElementById('auth-error');
    if (errorEl) {
      errorEl.innerHTML = `
        <div class="error-icon">⚠️</div>
        <div class="error-content">
          <div class="error-title">${message}</div>
          ${details ? `<div class="error-details">${details}</div>` : ''}
        </div>
      `;
      errorEl.style.display = 'block';
    }
  }

  function hideAuthError() {
    const errorEl = document.getElementById('auth-error');
    if (errorEl) {
      errorEl.style.display = 'none';
    }
  }

  // ═══════════════════════════════════════════════════════════
  // DATA SYNC
  // ═══════════════════════════════════════════════════════════
  async function loadUserData(userId) {
    try {
      console.log('📦 Loading user data for:', userId);
      const applications = await FirebaseAPI.db.loadApplications(userId);

      // Ensure requested SAP job exists once in personal workspace.
      const hasDefaultJob = applications.some((item) => item.link === DEFAULT_JOB_LINK);
      if (!hasDefaultJob) {
        const seeded = {
          id: (window.crypto && typeof window.crypto.randomUUID === 'function')
            ? window.crypto.randomUUID()
            : `seed_${Date.now()}`,
          company: DEFAULT_JOB_COMPANY,
          role: DEFAULT_JOB_ROLE,
          link: DEFAULT_JOB_LINK,
          postingDate: '',
          stage: 'Applied',
          appliedDate: '',
          deadline: '',
          followupDate: '',
          contactType: '',
          contactName: '',
          contact: '',
          notes: 'Seeded automatically from requested SAP role link.',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        await FirebaseAPI.db.saveApplication(userId, seeded);
        applications.unshift(seeded);
        console.log('✅ Seeded default SAP job entry');
      }
      
      // Initialize app with userId and applications
      if (window.JobHuntApp && window.JobHuntApp.init) {
        console.log('🚀 Initializing app with', applications.length, 'applications');
        window.JobHuntApp.init(userId, applications);
      }

      // Load settings
      const settings = await FirebaseAPI.db.loadSettings(userId);
      console.log('⚙️ Loaded settings:', settings);
      
      if (settings.theme && window.JobHuntApp && window.JobHuntApp.setTheme) {
        window.JobHuntApp.setTheme(settings.theme);
      }
      if (settings.weeklyGoal && window.JobHuntApp && window.JobHuntApp.setWeeklyGoal) {
        window.JobHuntApp.setWeeklyGoal(settings.weeklyGoal);
      }

    } catch (error) {
      console.error('❌ Failed to load user data:', error);

      // Fallback to local UI instead of blank screen if cloud load fails.
      showMainApp();
      if (window.JobHuntApp && window.JobHuntApp.init) {
        window.JobHuntApp.init(userId || null, []);
      }
    }
  }

  function setupRealtimeListener(userId) {
    // Clean up existing listener
    if (unsubscribeListener) {
      unsubscribeListener();
    }

    // Setup new listener
    unsubscribeListener = FirebaseAPI.db.listenToApplications(userId, (applications) => {
      console.log('Real-time update:', applications.length, 'applications');
      
      if (window.JobHuntApp && window.JobHuntApp.setApplications) {
        window.JobHuntApp.setApplications(applications);
      }
    });
  }

  // ═══════════════════════════════════════════════════════════
  // PUBLIC API
  // ═══════════════════════════════════════════════════════════
  window.AuthManager = {
    init: initAuth,
    getCurrentUser: () => currentUser,
    isSignedIn: () => !!currentUser
  };

  // Auto-initialize when DOM is ready
  console.log('🔐 Auth: Waiting for DOM...');
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      console.log('🔐 Auth: DOM ready, starting auth init...');
      setTimeout(initAuth, 100);
    });
  } else {
    console.log('🔐 Auth: DOM already loaded, starting auth init...');
    setTimeout(initAuth, 100);
  }
})();
