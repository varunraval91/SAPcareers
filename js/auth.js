/**
 * ═══════════════════════════════════════════════════════════════
 * AUTH – Sign-in required session
 * ═══════════════════════════════════════════════════════════════
 */
(() => {
  let currentUser = null;
  let unsubscribeListener = null;
  let initRetries = 0;
  let isGuestMode = false;
  const MAX_INIT_RETRIES = 12;
  const THEME_KEY = 'job_hunt_hq_theme';
  const THEME_EVENT = 'jobhunt-theme-changed';

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
    const guestBtn = getEl('auth-guest-btn');
    const email = getEl('auth-email-input');
    const password = getEl('auth-password-input');
    if (btn) {
      btn.disabled = isBusy;
      btn.innerHTML = isBusy
        ? '<span>Signing in...</span>'
        : '<span>Sign in</span><span class="btn-auth-arrow" aria-hidden="true">→</span>';
    }
    if (guestBtn) guestBtn.disabled = isBusy;
    if (email) email.disabled = isBusy;
    if (password) password.disabled = isBusy;
    setLoginError(message);
  }

  function readTheme() {
    try {
      return localStorage.getItem(THEME_KEY) || 'light';
    } catch {
      return 'light';
    }
  }

  function writeTheme(theme) {
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      // Ignore storage errors in restricted contexts.
    }
  }

  function broadcastTheme(theme) {
    window.dispatchEvent(new CustomEvent(THEME_EVENT, {
      detail: { theme }
    }));
  }

  function syncThemeIcon(theme) {
    const icon = getEl('auth-theme-icon');
    if (!icon) return;
    icon.textContent = theme === 'dark' ? '🌙' : '☀';
    icon.classList.remove('icon-pop');
    void icon.offsetWidth;
    icon.classList.add('icon-pop');
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    syncThemeIcon(theme);
  }

  function bindAuthThemeToggle() {
    const toggle = getEl('auth-theme-toggle');
    if (!toggle || toggle.dataset.bound === 'true') return;
    toggle.dataset.bound = 'true';

    applyTheme(readTheme());

    toggle.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
      const next = current === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      writeTheme(next);
      if (window.JobHuntApp && typeof window.JobHuntApp.setTheme === 'function') {
        window.JobHuntApp.setTheme(next);
      } else {
        broadcastTheme(next);
      }
    });
  }

  function bindThemeSyncListeners() {
    if (window.__jobHuntThemeSyncBound) {
      return;
    }
    window.__jobHuntThemeSyncBound = true;

    window.addEventListener('storage', (event) => {
      if (event.key !== THEME_KEY || !event.newValue) {
        return;
      }
      if (event.newValue === 'light' || event.newValue === 'dark') {
        applyTheme(event.newValue);
      }
    });

    window.addEventListener(THEME_EVENT, (event) => {
      const nextTheme = event && event.detail ? event.detail.theme : '';
      if (nextTheme === 'light' || nextTheme === 'dark') {
        applyTheme(nextTheme);
      }
    });
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

  function startGuestMode() {
    if (unsubscribeListener) {
      unsubscribeListener();
      unsubscribeListener = null;
    }

    isGuestMode = true;
    currentUser = { uid: 'guest-local', isGuest: true, email: 'Guest mode' };

    if (window.JobHuntApp && typeof window.JobHuntApp.setAuthUser === 'function') {
      window.JobHuntApp.setAuthUser(currentUser);
    }
    if (window.JobHuntApp && typeof window.JobHuntApp.startGuestMode === 'function') {
      window.JobHuntApp.startGuestMode();
    }

    setLoginBusy(false, '');
    showAppLayout();
  }

  function exitGuestMode() {
    if (!isGuestMode) {
      return;
    }
    isGuestMode = false;
    currentUser = null;

    if (window.JobHuntApp && typeof window.JobHuntApp.setAuthUser === 'function') {
      window.JobHuntApp.setAuthUser(null);
    }

    showAuthScreen();
    setLoginBusy(false, '');
  }

  function bindGuestButton() {
    const guestBtn = getEl('auth-guest-btn');
    if (!guestBtn || guestBtn.dataset.bound === 'true') return;
    guestBtn.dataset.bound = 'true';
    guestBtn.addEventListener('click', startGuestMode);
  }

  // ── Initialization ──────────────────────────────────────────
  function initAuth() {
    bindAuthThemeToggle();
    bindThemeSyncListeners();
    rotateMotivation();
    bindGuestButton();

    if (window.location.protocol === 'file:') {
      console.warn('Running on file:// – Firebase requires localhost');
      setLoginBusy(false, 'Firebase login requires localhost. You can still continue as guest.');
      return;
    }

    if (typeof FirebaseAPI === 'undefined') {
      console.error('FirebaseAPI not available');
      setLoginBusy(false, 'Firebase is not available. You can continue as guest.');
      return;
    }

    if (!FirebaseAPI.isReady || !FirebaseAPI.isReady()) {
      initRetries += 1;
      if (initRetries > MAX_INIT_RETRIES) {
        console.error('Firebase failed to initialize after retries');
        setLoginBusy(false, 'Firebase is not initialized. Update js/firebase-config.js and verify Firebase project settings.');
        return;
      }
      setTimeout(initAuth, 500);
      return;
    }

    initRetries = 0;
    console.log('✅ Firebase ready');

    bindLoginForm();

    FirebaseAPI.auth.onAuthStateChanged(async (user) => {
      if (window.JobHuntApp && typeof window.JobHuntApp.setAuthUser === 'function') {
        window.JobHuntApp.setAuthUser(user || null);
      }

      if (user && !user.isAnonymous) {
        isGuestMode = false;
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
        isGuestMode = false;
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
    isSignedIn: () => !!currentUser,
    isGuestMode: () => isGuestMode,
    startGuestMode,
    exitGuestMode
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(initAuth, 100));
  } else {
    setTimeout(initAuth, 100);
  }
})();
