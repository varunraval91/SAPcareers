/**
 * ═══════════════════════════════════════════════════════════════
 * AUTH – Anonymous Firebase session
 * ═══════════════════════════════════════════════════════════════
 */
(() => {
  let currentUser = null;
  let unsubscribeListener = null;
  let initRetries = 0;
  const MAX_INIT_RETRIES = 12;

  // ── Initialization ──────────────────────────────────────────
  function initAuth() {
    if (window.location.protocol === 'file:') {
      console.warn('Running on file:// – Firebase requires localhost');
      return;
    }

    if (typeof FirebaseAPI === 'undefined') {
      console.error('FirebaseAPI not available');
      return;
    }

    if (!FirebaseAPI.isReady || !FirebaseAPI.isReady()) {
      initRetries += 1;
      if (initRetries > MAX_INIT_RETRIES) {
        console.error('Firebase failed to initialize after retries');
        return;
      }
      setTimeout(initAuth, 500);
      return;
    }

    initRetries = 0;
    console.log('✅ Firebase ready');

    FirebaseAPI.auth.onAuthStateChanged((user) => {
      if (window.JobHuntApp && typeof window.JobHuntApp.setAuthUser === 'function') {
        window.JobHuntApp.setAuthUser(user || null);
      }

      if (user) {
        console.log('👤 Signed in:', user.uid);
        currentUser = user;
        loadUserData(user.uid);
        setupRealtimeListener(user.uid);
      } else {
        currentUser = null;
        startAnonymousSession();
      }
    });
  }

  async function startAnonymousSession() {
    try {
      await FirebaseAPI.auth.signInAnonymously();
    } catch (error) {
      console.error('Anonymous session failed:', error.code, error.message);
      // Proceed with local-only mode – dashboard is already visible
      if (window.JobHuntApp && window.JobHuntApp.init) {
        window.JobHuntApp.init(null, []);
      }
    }
  }

  // ── Data sync ───────────────────────────────────────────────
  async function loadUserData(userId) {
    try {
      const applications = await FirebaseAPI.db.loadApplications(userId);

      if (window.JobHuntApp && window.JobHuntApp.init) {
        window.JobHuntApp.init(userId, applications);
      }

      const settings = await FirebaseAPI.db.loadSettings(userId);
      if (settings.theme && window.JobHuntApp && window.JobHuntApp.setTheme) {
        window.JobHuntApp.setTheme(settings.theme);
      }
      if (settings.weeklyGoal && window.JobHuntApp && window.JobHuntApp.setWeeklyGoal) {
        window.JobHuntApp.setWeeklyGoal(settings.weeklyGoal);
      }
    } catch (error) {
      console.error('Failed to load user data:', error);
      if (window.JobHuntApp && window.JobHuntApp.init) {
        window.JobHuntApp.init(userId || null, []);
      }
    }
  }

  function setupRealtimeListener(userId) {
    if (unsubscribeListener) unsubscribeListener();
    unsubscribeListener = FirebaseAPI.db.listenToApplications(userId, (applications) => {
      console.log('Real-time update:', applications.length, 'applications');
      if (window.JobHuntApp && window.JobHuntApp.setApplications) {
        window.JobHuntApp.setApplications(applications);
      }
    });
  }

  // ── Public API ──────────────────────────────────────────────
  window.AuthManager = {
    init: initAuth,
    getCurrentUser: () => currentUser,
    isSignedIn: () => !!currentUser
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(initAuth, 100));
  } else {
    setTimeout(initAuth, 100);
  }
})();
