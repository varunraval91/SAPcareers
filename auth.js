/**
 * ═══════════════════════════════════════════════════════════════
 * AUTHENTICATION UI & FLOW
 * ═══════════════════════════════════════════════════════════════
 */

(() => {
  let currentUser = null;
  let unsubscribeListener = null;

  // ═══════════════════════════════════════════════════════════
  // INITIALIZATION
  // ═══════════════════════════════════════════════════════════
  function initAuth() {
    console.log('🔐 Auth: Checking Firebase...');
    
    // Wait for Firebase API and initialization
    if (typeof FirebaseAPI === 'undefined') {
      console.error('❌ FirebaseAPI not available');
      showAuthError('Firebase API not loaded.');
      return;
    }

    // Wait for Firebase to actually be initialized
    if (!FirebaseAPI.isReady || !FirebaseAPI.isReady()) {
      console.warn('⏳ Firebase not ready yet, retrying in 500ms...');
      setTimeout(initAuth, 500);
      return;
    }

    console.log('✅ Firebase ready, initializing auth...');
    
    // Listen to auth state changes
    FirebaseAPI.auth.onAuthStateChanged((user) => {
      if (user) {
        // User signed in
        console.log('👤 User signed in:', user.email);
        currentUser = user;
        onUserSignedIn(user);
      } else {
        // User signed out
        console.log('👤 User signed out');
        currentUser = null;
        onUserSignedOut();
      }
    });
  }

  // ═══════════════════════════════════════════════════════════
  // UI STATE MANAGEMENT
  // ═══════════════════════════════════════════════════════════
  function onUserSignedIn(user) {
    console.log('User signed in:', user.email);
    
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
    const existing = document.getElementById('auth-screen');
    if (existing) {
      existing.style.display = 'flex';
      return;
    }

    const authScreen = document.createElement('div');
    authScreen.id = 'auth-screen';
    authScreen.innerHTML = `
      <div class="auth-container">
        <div class="auth-logo">
          <span class="logo-mark">JH</span>
        </div>
        <h1 class="auth-title">Job Hunt HQ</h1>
        <p class="auth-subtitle">Track your applications. Land your dream job.</p>
        
        <button id="google-signin-btn" class="btn btn-primary btn-auth">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
            <path d="M9.003 18c2.43 0 4.467-.806 5.956-2.18L12.05 13.56c-.806.54-1.836.86-3.047.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9.003 18z" fill="#34A853"/>
            <path d="M3.964 10.712c-.18-.54-.282-1.117-.282-1.71 0-.593.102-1.17.282-1.71V4.96H.957C.347 6.175 0 7.55 0 9.002c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
            <path d="M9.003 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.464.891 11.428 0 9.003 0 5.482 0 2.438 2.017.957 4.958L3.964 7.29c.708-2.127 2.692-3.71 5.036-3.71z" fill="#EA4335"/>
          </svg>
          Sign in with Google
        </button>
        
        <div id="auth-error" class="auth-error" style="display:none;"></div>
        
        <p class="auth-footer">Your data is securely stored in the cloud and syncs across all your devices.</p>
      </div>
    `;

    document.body.appendChild(authScreen);

    // Add click handler
    document.getElementById('google-signin-btn').addEventListener('click', handleGoogleSignIn);
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
        <div class="user-name">${user.displayName || 'User'}</div>
        <div class="user-email">${user.email}</div>
      </div>
      <button id="signout-btn" class="btn-icon" title="Sign out">
        ↪
      </button>
    `;

    document.getElementById('signout-btn').addEventListener('click', handleSignOut);
  }

  // ═══════════════════════════════════════════════════════════
  // AUTH HANDLERS
  // ═══════════════════════════════════════════════════════════
  async function handleGoogleSignIn() {
    const btn = document.getElementById('google-signin-btn');
    const originalText = btn.innerHTML;
    
    try {
      btn.disabled = true;
      btn.innerHTML = '<span style="display: inline-block; animation: spin 1s linear infinite;">⟳</span> Signing in...';
      hideAuthError();

      console.log('🔐 Initiating Google Sign-In...');
      await FirebaseAPI.auth.signInWithGoogle();
      console.log('✅ Sign-In successful!');
      
      // Success - onAuthStateChanged will handle UI
    } catch (error) {
      console.error('❌ Sign-in error:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      
      let message = error.message || 'Sign-in failed. Please try again.';
      let details = '';
      
      if (error.code === 'auth/popup-blocked') {
        message = 'Popup was blocked by your browser';
        details = 'Please allow popups for this site and try again.';
      } else if (error.code === 'auth/popup-closed-by-user') {
        message = 'Sign-in cancelled';
        details = 'You closed the sign-in window. Please try again.';
      } else if (error.code === 'auth/network-request-failed') {
        message = 'Network error';
        details = 'Check your internet connection and try again.';
      } else if (error.code === 'auth/operation-not-allowed') {
        message = 'Sign-in not configured';
        details = 'Google Sign-In is not enabled. Please check Firebase Console.';
      } else if (error.code === 'auth/unauthorized-domain') {
        message = 'Domain not authorized';
        details = 'This domain is not authorized for Google Sign-In. Go to Firebase Console → Authentication → Settings → Authorized domains and add this domain.';
      }
      
      showAuthError(message, details);
      btn.disabled = false;
      btn.innerHTML = originalText;
    }
  }

  async function handleSignOut() {
    if (!confirm('Sign out?')) return;

    try {
      await FirebaseAPI.auth.signOut();
      // onAuthStateChanged will handle UI
    } catch (error) {
      console.error('Sign-out error:', error);
      alert('Sign-out failed. Please try again.');
    }
  }

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
