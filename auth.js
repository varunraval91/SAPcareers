/**
 * ═══════════════════════════════════════════════════════════════
 * AUTH – Welcome splash + anonymous Firebase session
 * ═══════════════════════════════════════════════════════════════
 */
(() => {
  let currentUser = null;
  let unsubscribeListener = null;
  let initRetries = 0;
  const MAX_INIT_RETRIES = 12;

  // ── Welcome splash (replaces old auth-error screen) ─────────
  function showWelcomeSplash() {
    if (document.getElementById('welcome-splash')) return;
    const el = document.createElement('div');
    el.id = 'welcome-splash';
    el.style.cssText =
      'position:fixed;inset:0;display:flex;align-items:center;justify-content:center;' +
      'background:var(--bg-primary,#0f0f23);z-index:9999;transition:opacity 0.4s;';
    el.innerHTML =
      '<div style="text-align:center;">' +
        '<div style="width:60px;height:60px;border-radius:16px;background:linear-gradient(135deg,#7c3aed,#6d28d9);display:flex;align-items:center;justify-content:center;font-weight:700;color:#fff;font-size:1.2rem;margin:0 auto 1rem;">IAP</div>' +
        '<h1 style="font-size:1.5rem;color:var(--text-primary,#e2e8f0);margin:0 0 0.5rem;">Internship Application Pipeline</h1>' +
        '<p style="color:var(--text-secondary,#94a3b8);font-size:0.9rem;">Loading your workspace\u2026</p>' +
      '</div>';
    document.body.appendChild(el);
  }

  function dismissSplash() {
    const el = document.getElementById('welcome-splash');
    if (el) {
      el.style.opacity = '0';
      setTimeout(() => el.remove(), 400);
    }
  }

  // ── Initialization ──────────────────────────────────────────
  function initAuth() {
    showWelcomeSplash();

    if (window.location.protocol === 'file:') {
      console.warn('Running on file:// – Firebase requires localhost');
      dismissSplash();
      return;
    }

    if (typeof FirebaseAPI === 'undefined') {
      console.error('FirebaseAPI not available');
      dismissSplash();
      return;
    }

    if (!FirebaseAPI.isReady || !FirebaseAPI.isReady()) {
      initRetries += 1;
      if (initRetries > MAX_INIT_RETRIES) {
        console.error('Firebase failed to initialize after retries');
        dismissSplash();
        return;
      }
      setTimeout(initAuth, 500);
      return;
    }

    initRetries = 0;
    console.log('✅ Firebase ready');

    FirebaseAPI.auth.onAuthStateChanged((user) => {
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
      dismissSplash();
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
    } finally {
      dismissSplash();
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
