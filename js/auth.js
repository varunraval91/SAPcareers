/**
 * ═══════════════════════════════════════════════════════════════
 * AUTH – Sign-in required session
 * ═══════════════════════════════════════════════════════════════
 */
(() => {
  let currentUser = null;
  let unsubscribeListener = null;
  let initRetries = 0;
  const MAX_INIT_RETRIES = 12;

  const authPhrases = [
    '"Consistency turns effort into offers."',
    '"Each application is a step closer to your role."',
    '"Discipline today creates opportunities tomorrow."',
    '"One focused hour beats a day of uncertainty."'
  ];

  function getEl(id) {
    return document.getElementById(id);
  }

  function showAppLayout() {
    const layout = getEl('app-layout');
    const authScreen = getEl('auth-screen');
    if (layout) layout.classList.remove('hidden');
    if (authScreen) authScreen.classList.add('hidden');
  }

  function showAuthScreen() {
    const layout = getEl('app-layout');
    const authScreen = getEl('auth-screen');
    if (layout) layout.classList.add('hidden');
    if (authScreen) authScreen.classList.remove('hidden');
  }

  function setLoginBusy(isBusy, message = '') {
    const btn = getEl('auth-login-btn');
    const email = getEl('auth-email-input');
    const password = getEl('auth-password-input');
    if (btn) {
      btn.disabled = isBusy;
      btn.textContent = isBusy ? 'Signing In...' : 'Sign In';
    }
    if (email) email.disabled = isBusy;
    if (password) password.disabled = isBusy;
    setLoginError(message);
  }

  function setLoginError(message) {
    const errorEl = getEl('auth-error');
    if (!errorEl) return;
    if (!message) {
      errorEl.textContent = '';
      errorEl.classList.add('hidden');
      return;
    }
    errorEl.textContent = message;
    errorEl.classList.remove('hidden');
  }

  function rotateMotivation() {
    const quote = getEl('auth-quote');
    if (!quote) return;
    const random = authPhrases[Math.floor(Math.random() * authPhrases.length)];
    quote.textContent = random;
  }

  function bindLoginForm() {
    const form = getEl('auth-login-form');
    if (!form || form.dataset.bound === 'true') return;
    form.dataset.bound = 'true';

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const email = (getEl('auth-email-input')?.value || '').trim();
      const password = getEl('auth-password-input')?.value || '';

      if (!email || !email.includes('@')) {
        setLoginError('Enter a valid email address.');
        return;
      }
      if (!password || password.length < 6) {
        setLoginError('Password must be at least 6 characters.');
        return;
      }

      try {
        setLoginBusy(true);
        await FirebaseAPI.auth.signInWithEmail(email, password);
      } catch (error) {
        const code = error && error.code ? error.code : '';
        let message = 'Sign in failed. Please try again.';
        if (code === 'auth/invalid-credential' || code === 'auth/wrong-password') {
          message = 'Invalid email or password.';
        } else if (code === 'auth/user-not-found') {
          message = 'No account found for this email.';
        } else if (code === 'auth/too-many-requests') {
          message = 'Too many attempts. Please wait and retry.';
        } else if (code === 'auth/operation-not-allowed') {
          message = 'Email/password provider is disabled in Firebase.';
        }
        setLoginBusy(false, message);
      }
    });
  }

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

    bindLoginForm();
    rotateMotivation();

    FirebaseAPI.auth.onAuthStateChanged(async (user) => {
      if (window.JobHuntApp && typeof window.JobHuntApp.setAuthUser === 'function') {
        window.JobHuntApp.setAuthUser(user || null);
      }

      if (user && !user.isAnonymous) {
        console.log('👤 Signed in:', user.uid);
        currentUser = user;
        showAppLayout();
        setLoginBusy(false, '');
        loadUserData(user.uid);
        setupRealtimeListener(user.uid);
      } else {
        if (user && user.isAnonymous) {
          try {
            await FirebaseAPI.auth.signOut();
          } catch (error) {
            console.warn('Anonymous sign-out cleanup failed:', error);
          }
        }
        currentUser = null;
        if (unsubscribeListener) {
          unsubscribeListener();
          unsubscribeListener = null;
        }
        showAuthScreen();
        setLoginBusy(false, '');
      }
    });
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
