(() => {
  const STORAGE_KEY = "job_hunt_hq_applications";
  const GOAL_KEY = "job_hunt_hq_weekly_goal";
  const THEME_KEY = "job_hunt_hq_theme";
  const THEME_EVENT = "jobhunt-theme-changed";
  const SUBMISSION_LOCKED = false;

  const STAGES = ["Wishlist", "Applied", "OA/Test", "Interview", "Rejected", "Offer"];
  const DEFAULT_COMPANY_SHORTCUTS = ["SAP", "Siemens", "DHL"];
  const SCROLL_TOP_THRESHOLD = 300;

    // Firebase state
    let currentUserId = null;
    let useFirebase = false;

  const anCharts = {
    bar: null,
    donut: null
  };

  const quoteState = {
    selectedQuote: "",
    typingTimer: null,
    canReplayOnScroll: true,
    observer: null
  };

    // Check if Firebase is available and ready
    function checkFirebase() {
      if (typeof FirebaseAPI === 'undefined' || typeof AuthManager === 'undefined') {
        console.log('🔍 Firebase check: API not loaded');
        return false;
      }
      if (typeof FirebaseAPI.isReady !== 'function' || !FirebaseAPI.isReady()) {
        console.log('🔍 Firebase check: Not initialized yet');
        return false;
      }
      console.log('✅ Firebase check: Ready');
      return true;
    }

  function safeStorageGet(key) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  function safeStorageSet(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch {
      // Storage may be blocked; keep app functional without persistence.
    }
  }

  function safeStorageRemove(key) {
    try {
      localStorage.removeItem(key);
    } catch {
      // Storage may be blocked; keep app functional without persistence.
    }
  }

  function broadcastTheme(theme) {
    window.dispatchEvent(new CustomEvent(THEME_EVENT, {
      detail: { theme }
    }));
  }

  const state = {
    applications: [],
    currentWeeklyGoal: parseInt(safeStorageGet(GOAL_KEY), 10) || 10,
    currentFilter: "all",
    currentCompanyFilter: "all",
    currentSort: "deadline-asc",
    searchQuery: "",
    editingId: null,
    theme: safeStorageGet(THEME_KEY) || "light"
  };

  const anState = {
    initialized: false,
    isOpen: false,
    from: "",
    to: "",
    company: "",
    location: "",
    keyword: "",
    search: "",
    statuses: new Set(["W", "A", "O", "I", "R", "F"]),
    sort: "deadline",
    filtered: []
  };

  const DOM = {
    toastContainer: document.getElementById("toast-container"),
    modalBackdrop: document.getElementById("modal-backdrop"),
    modalBox: document.getElementById("modal-box"),
    themeToggle: document.getElementById("theme-toggle"),
    themeIcon: document.getElementById("theme-icon"),
    accountStatus: document.getElementById("account-status"),
    resetGuestBtn: document.getElementById("reset-guest-btn"),
    accountLogoutBtn: document.getElementById("account-logout-btn"),
    importBtn: document.getElementById("import-data-btn"),
    importFileInput: document.getElementById("import-file-input"),
    templateBtn: document.getElementById("download-template-btn"),
    exportCsvBtn: document.getElementById("export-csv-btn"),
    openModalBtn: document.getElementById("open-modal-btn"),
    quoteShuffle: document.getElementById("quote-shuffle-btn"),
    goalBarFill: document.getElementById("goal-bar-fill"),
    goalText: document.getElementById("goal-text"),
    goalEditBtn: document.getElementById("goal-edit-btn"),
    analyticsBtn: document.getElementById("analyticsBtn"),
    dashboardBtn: document.getElementById("dashboardBtn"),
    kanbanView: document.getElementById("kanbanView"),
    analyticsView: document.getElementById("analyticsView"),
    anTopCount: document.getElementById("anTopCount"),
    anDateFrom: document.getElementById("anFrom"),
    anDateTo: document.getElementById("anTo"),
    anExportBtn: document.getElementById("anExportBtn"),
    anRefreshBtn: document.getElementById("anRefreshBtn"),
    anStatusChecks: document.getElementById("anStatusChecks"),
    anCompany: document.getElementById("anCompany"),
    anLocation: document.getElementById("anLocation"),
    anKeyword: document.getElementById("anKeyword"),
    anApplyFiltersBtn: document.getElementById("anApplyFiltersBtn"),
    anClearFiltersBtn: document.getElementById("anClearFiltersBtn"),
    anStatusCount: document.getElementById("anStatusCount"),
    anActiveChips: document.getElementById("anActiveChips"),
    anSearch: document.getElementById("anSearch"),
    anSort: document.getElementById("anSort"),
    anTableBody: document.getElementById("anTableBody"),
    anTableCount: document.getElementById("anTableCount"),
    anEmpty: document.getElementById("anEmpty"),
    anStatTotal: document.getElementById("anStatTotal"),
    anStatRate: document.getElementById("anStatRate"),
    anStatActive: document.getElementById("anStatActive"),
    anStatOffers: document.getElementById("anStatOffers"),
    anStatOfferRate: document.getElementById("anStatOfferRate"),
    anBarChart: document.getElementById("anBarChart"),
    anDonutChart: document.getElementById("anDonutChart"),
    statTotal: document.getElementById("stat-total"),
    statApplied: document.getElementById("stat-applied"),
    statInterview: document.getElementById("stat-interview"),
    statOffers: document.getElementById("stat-offers"),
    statFollowup: document.getElementById("stat-followup"),
    statResponse: document.getElementById("stat-response"),
    statRate: document.getElementById("stat-rate"),
    searchInput: document.getElementById("search-input"),
    sortSelect: document.getElementById("sort-select"),
    activeFilterBar: document.getElementById("active-filter-bar"),
    activeFilterLabel: document.getElementById("active-filter-label"),
    clearFilterBtn: document.getElementById("clear-filter-btn"),
    companyShortcuts: document.getElementById("company-shortcuts"),
    kanbanBoard: document.getElementById("kanban-board"),
    scrollToTopBtn: document.getElementById("scroll-to-top-btn")
  };

  // Fallback hook used by the inline button handler in index.html.
  window.JobHuntHQOpenModal = () => openModal();

  init();

  function init() {
      useFirebase = checkFirebase();
      if (useFirebase) {
        console.log('✅ Firebase mode – waiting for auth data');
      } else {
        console.log('⚠️ Offline mode (localStorage)');
        state.applications = loadApplications();
      }
      if (SUBMISSION_LOCKED) {
        safeStorageRemove(STORAGE_KEY);
        state.applications = [];
      }
      setupTheme();
      bindEvents();
      addListener(window, "storage", (event) => {
        if (event.key !== THEME_KEY || !event.newValue) {
          return;
        }
        if (event.newValue !== state.theme) {
          state.theme = event.newValue;
          setupTheme();
        }
      });
      addListener(window, THEME_EVENT, (event) => {
        const nextTheme = event && event.detail ? event.detail.theme : "";
        if ((nextTheme === "light" || nextTheme === "dark") && nextTheme !== state.theme) {
          state.theme = nextTheme;
          setupTheme();
        }
      });
      const currentUser = (typeof FirebaseAPI !== "undefined" && FirebaseAPI.auth && typeof FirebaseAPI.auth.getCurrentUser === "function")
        ? FirebaseAPI.auth.getCurrentUser()
        : null;
      updateAccountStatusUI(currentUser);
      applySubmissionLockUI();
      renderUI();
        an_init();
      loadMotivationalQuote();
  }

    // Called by auth.js after user signs in
    function loadUserDataAndRender(userId, applications) {
      currentUserId = userId;
      useFirebase = !!userId;
        if (Array.isArray(applications)) {
        state.applications = applications;
        } else if (!userId) {
          state.applications = loadApplications();
      }
      if (SUBMISSION_LOCKED) {
        state.applications = [];
      }
      if (typeof FirebaseAPI !== "undefined" && FirebaseAPI.auth && typeof FirebaseAPI.auth.getCurrentUser === "function") {
        updateAccountStatusUI(FirebaseAPI.auth.getCurrentUser());
      }
      renderUI();
    }

  function applySubmissionLockUI() {
    if (!SUBMISSION_LOCKED) {
      return;
    }

    [DOM.openModalBtn, DOM.importBtn, DOM.importFileInput, DOM.resetGuestBtn].forEach((el) => {
      if (el) {
        el.disabled = true;
      }
    });

    if (DOM.openModalBtn) {
      DOM.openModalBtn.title = "Locked for submission";
    }
    if (DOM.importBtn) {
      DOM.importBtn.title = "Locked for submission";
    }
  }

  function bindEvents() {
    addListener(DOM.themeToggle, "click", toggleTheme);
    addListener(DOM.accountLogoutBtn, "click", handleLogout);
    addListener(DOM.resetGuestBtn, "click", resetGuestData);
    addListener(DOM.analyticsBtn, "click", () => an_toggle(true));
    addListener(DOM.dashboardBtn, "click", (event) => {
      event.preventDefault();
      an_toggle(false);
    });
    
    // Dashboard navigation
    document.querySelectorAll('.nav-item[data-view="dashboard"]').forEach(btn => {
      addListener(btn, "click", (event) => {
        event.preventDefault();
        if (anState.isOpen) {
          an_toggle(false);
        }
        document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
        btn.classList.add('active');
      });
    });
    addListener(DOM.importBtn, "click", () => {
      if (DOM.importFileInput) {
        DOM.importFileInput.click();
      }
    });
    addListener(DOM.importFileInput, "change", onImportFileChange);
    addListener(DOM.templateBtn, "click", downloadImportTemplate);
    addListener(DOM.exportCsvBtn, "click", exportToCSV);
    addListener(DOM.openModalBtn, "click", openModal);
    addListener(DOM.modalBackdrop, "click", (e) => {
      if (e.target === DOM.modalBackdrop) {
        closeModal();
      }
    });

    addListener(DOM.quoteShuffle, "click", () => {
      if (typeof window.shuffleQuote === "function") {
        window.shuffleQuote();
      }
    });

    addListener(DOM.goalEditBtn, "click", editWeeklyGoal);

    addListener(DOM.searchInput, "input", (e) => {
      applySearchInput(e.target.value || "");
      renderFilterUI();
      renderKanban();
    });

    addListener(DOM.sortSelect, "change", (e) => {
      state.currentSort = e.target.value;
      renderKanban();
    });

    addListener(DOM.clearFilterBtn, "click", () => {
      state.currentFilter = "all";
      state.currentCompanyFilter = "all";
      state.searchQuery = "";
      if (DOM.searchInput) {
        DOM.searchInput.value = "";
      }
      renderFilterUI();
      renderKanban();
    });

    addListener(DOM.companyShortcuts, "click", (event) => {
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }

      const shortcutBtn = target.closest("button[data-company]");
      const clearBtn = target.closest("button[data-company-clear]");

      if (clearBtn) {
        state.currentCompanyFilter = "all";
      }

      if (shortcutBtn) {
        const company = (shortcutBtn.getAttribute("data-company") || "").trim();
        if (!company) {
          return;
        }
        state.currentCompanyFilter = state.currentCompanyFilter === company ? "all" : company;
      }

      renderFilterUI();
      renderKanban();
    });

    // Scroll to top button handlers
    if (DOM.scrollToTopBtn) {
      addListener(DOM.scrollToTopBtn, "click", scrollToTop);
    }
    
    const mainContent = document.querySelector('.main-content');
    if (mainContent) {
      addListener(mainContent, "scroll", handleScrollVisibility);
    }
    addListener(window, "scroll", handleScrollVisibility);
    handleScrollVisibility();

    document.querySelectorAll(".chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        const stage = chip.dataset.stage;
        if (!stage || stage === "all") {
          state.currentFilter = "all";
        } else {
          state.currentFilter = state.currentFilter === stage ? "all" : stage;
        }
        renderFilterUI();
        renderKanban();
      });
    });

    document.querySelectorAll(".stat-tile").forEach((tile) => {
      tile.addEventListener("click", () => {
        const filter = tile.dataset.filter;
        if (!filter || filter === "responserate") {
          return;
        }
        state.currentFilter = filter === "all" ? "all" : filter;
        renderFilterUI();
        renderKanban();
      });
    });
  }

  function addListener(element, eventName, handler) {
    if (!element) {
      return;
    }
    element.addEventListener(eventName, handler);
  }

  function handleScrollVisibility() {
    const mainContent = document.querySelector('.main-content');
    if (!DOM.scrollToTopBtn) {
      return;
    }

    const containerScrollTop = mainContent ? mainContent.scrollTop : 0;
    const windowScrollTop = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
    const currentScrollTop = Math.max(containerScrollTop, windowScrollTop);

    if (currentScrollTop > SCROLL_TOP_THRESHOLD) {
      DOM.scrollToTopBtn.classList.remove('hidden');
    } else {
      DOM.scrollToTopBtn.classList.add('hidden');
    }
  }

  function scrollToTop() {
    const mainContent = document.querySelector('.main-content');
    if (mainContent && mainContent.scrollTop > 0) {
      mainContent.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }

    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }

  function setupTheme() {
    document.documentElement.setAttribute("data-theme", state.theme);
    DOM.themeIcon.textContent = state.theme === "dark" ? "☀" : "🌙";

    const authThemeIcon = document.getElementById("auth-theme-icon");
    if (authThemeIcon) {
      authThemeIcon.textContent = state.theme === "dark" ? "🌙" : "☀";
    }

    if (anState.isOpen) {
      an_buildCharts();
    }
  }

  function toggleTheme() {
    state.theme = state.theme === "dark" ? "light" : "dark";
    safeStorageSet(THEME_KEY, state.theme);
    
      if (useFirebase && currentUserId) {
        FirebaseAPI.db.saveSettings(currentUserId, {
          theme: state.theme,
          weeklyGoal: state.currentWeeklyGoal
        }).catch((error) => {
          console.error('Settings save error:', error);
        });
      }
    
    setupTheme();
    broadcastTheme(state.theme);
    showToast(`Switched to ${state.theme} mode`);
  }

  async function handleLogout() {
    if (!useFirebase || !currentUserId) {
      if (typeof AuthManager !== "undefined" && typeof AuthManager.exitGuestMode === "function") {
        AuthManager.exitGuestMode();
      }
      showToast("Exited guest mode", "info");
      return;
    }

    if (typeof FirebaseAPI === "undefined" || !FirebaseAPI.auth) {
      showToast("Firebase not ready yet", "warning");
      return;
    }

    try {
      await FirebaseAPI.auth.signOut();
      showToast("Logged out", "info");
    } catch (error) {
      showToast((error && error.message) || "Logout failed", "error");
    }
  }

  function updateAccountStatusUI(user) {
    if (!DOM.accountStatus) return;

    if (DOM.resetGuestBtn) {
      DOM.resetGuestBtn.classList.add("hidden");
    }

    if (!user) {
      DOM.accountStatus.textContent = "Signed out";
      return;
    }
    if (user.isGuest) {
      DOM.accountStatus.textContent = "Guest mode";
      if (DOM.resetGuestBtn) {
        DOM.resetGuestBtn.classList.remove("hidden");
      }
      return;
    }
    DOM.accountStatus.textContent = user.email || "Email account";
  }

  function resetGuestData() {
    if (useFirebase && currentUserId) {
      showToast("Reset Guest Data is available only in guest mode", "warning");
      return;
    }

    const confirmed = window.confirm("Clear all guest applications from this browser?");
    if (!confirmed) {
      return;
    }

    safeStorageRemove(STORAGE_KEY);
    state.applications = [];
    state.currentFilter = "all";
    state.currentCompanyFilter = "all";
    state.searchQuery = "";
    if (DOM.searchInput) {
      DOM.searchInput.value = "";
    }
    renderUI();
    showToast("Guest data reset", "info");
  }

  function startGuestMode() {
    currentUserId = null;
    useFirebase = false;
    state.applications = loadApplications();
    updateAccountStatusUI({ isGuest: true });
    renderUI();
    showToast("Guest mode active", "info");
  }

  function renderUI() {
    renderStats();
    renderGoal();
    renderCompanyShortcuts();
    renderFilterUI();
    renderKanban();
    an_refresh();
  }

  function normalizeCompanyKey(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "");
  }

  function toShortcutKey(companyName) {
    const key = normalizeCompanyKey(companyName);
    return key || "company";
  }

  function getCompanyShortcutEntries() {
    const companyCount = new Map();

    state.applications.forEach((app) => {
      const companyName = String(app.company || "").trim();
      if (!companyName) {
        return;
      }
      companyCount.set(companyName, (companyCount.get(companyName) || 0) + 1);
    });

    DEFAULT_COMPANY_SHORTCUTS.forEach((companyName) => {
      if (!companyCount.has(companyName)) {
        companyCount.set(companyName, 0);
      }
    });

    return Array.from(companyCount.entries())
      .sort((a, b) => {
        if (b[1] !== a[1]) {
          return b[1] - a[1];
        }
        return a[0].localeCompare(b[0]);
      })
      .slice(0, 12)
      .map(([name]) => {
        const shortcutKey = toShortcutKey(name);
        const firstWord = String(name).trim().split(/\s+/)[0] || "";
        return {
          name,
          shortcutKey,
          aliases: [shortcutKey, normalizeCompanyKey(firstWord)]
        };
      });
  }

  function findCompanyByShortcut(rawShortcut) {
    const shortcut = normalizeCompanyKey(rawShortcut);
    if (!shortcut) {
      return "";
    }

    const hardcodedAliases = {
      semens: "Siemens",
      siemen: "Siemens",
      dhl: "DHL",
      sap: "SAP"
    };

    if (hardcodedAliases[shortcut]) {
      return hardcodedAliases[shortcut];
    }

    const match = getCompanyShortcutEntries().find((entry) =>
      entry.aliases.includes(shortcut) || entry.shortcutKey.startsWith(shortcut)
    );

    return match ? match.name : "";
  }

  function renderCompanyShortcuts() {
    if (!DOM.companyShortcuts) {
      return;
    }

    const entries = getCompanyShortcutEntries();
    DOM.companyShortcuts.innerHTML = [
      `<button type="button" class="company-chip ${state.currentCompanyFilter === "all" ? "active" : ""}" data-company-clear="true" title="Show all companies">All Companies</button>`,
      ...entries.map((entry) => {
        const isActive = state.currentCompanyFilter === entry.name;
        return `<button type="button" class="company-chip ${isActive ? "active" : ""}" data-company="${escapeAttr(entry.name)}" title="Shortcut: \\${escapeAttr(entry.shortcutKey)}">${escapeHtml(entry.name)}</button>`;
      })
    ].join("");
  }

  function applySearchInput(rawInput) {
    const trimmed = String(rawInput || "").trim();
    const parts = trimmed.split(/\s+/).filter(Boolean);
    const firstToken = parts[0] || "";

    if (firstToken.startsWith("\\") && firstToken.length > 1) {
      const shortcut = firstToken.slice(1);
      const matchedCompany = findCompanyByShortcut(shortcut);
      if (matchedCompany) {
        state.currentCompanyFilter = matchedCompany;
        state.searchQuery = parts.slice(1).join(" ").toLowerCase();
        return;
      }
    }

    state.searchQuery = trimmed.toLowerCase();
  }

  function an_stageCode(stage) {
    const normalized = String(stage || "").trim().toLowerCase();
    if (normalized === "wishlist") return "W";
    if (normalized === "applied") return "A";
    if (normalized === "oa/test" || normalized === "oa / test" || normalized === "oatest") return "O";
    if (normalized === "interview") return "I";
    if (normalized === "rejected") return "R";
    if (normalized === "offer") return "F";
    return "W";
  }

  function an_stageLabel(code) {
    const map = {
      W: "Wishlist",
      A: "Applied",
      O: "OA/Test",
      I: "Interview",
      R: "Rejected",
      F: "Offer"
    };
    return map[code] || "Wishlist";
  }

  function an_stageClass(code) {
    return ["W", "A", "O", "I", "R", "F"].includes(code) ? code : "W";
  }

  function an_dateValue(app) {
    const candidate = app.appliedDate || app.createdAt || app.postingDate || "";
    if (!candidate) {
      return "";
    }
    const date = new Date(candidate);
    if (Number.isNaN(date.getTime())) {
      return "";
    }
    return date.toISOString().slice(0, 10);
  }

  function an_init() {
    if (anState.initialized || !DOM.analyticsView) {
      return;
    }

    const statusItems = [
      { code: "W", label: "Wishlist", color: "#8b5cf6" },
      { code: "A", label: "Applied", color: "#6366f1" },
      { code: "O", label: "OA/Test", color: "#f59e0b" },
      { code: "I", label: "Interview", color: "#06b6d4" },
      { code: "R", label: "Rejected", color: "#ef4444" },
      { code: "F", label: "Offer", color: "#10b981" }
    ];

    if (DOM.anStatusChecks) {
      DOM.anStatusChecks.innerHTML = statusItems.map((item) => `
        <label class="an-s-check" data-code="${item.code}">
          <input type="checkbox" data-code="${item.code}" checked>
          <span class="an-s-dot" style="background:${item.color}"></span>
          <span class="an-s-name">${item.label}</span>
          <span class="an-s-bar"><span class="an-s-fill" data-fill="${item.code}" style="width:0%;background:${item.color}"></span></span>
          <span class="an-s-count" data-count="${item.code}">0</span>
        </label>
      `).join("");

      addListener(DOM.anStatusChecks, "change", (event) => {
        const target = event.target;
        if (!(target instanceof HTMLInputElement)) {
          return;
        }
        const code = target.getAttribute("data-code") || "";
        if (!code) {
          return;
        }
        if (target.checked) {
          anState.statuses.add(code);
        } else {
          anState.statuses.delete(code);
        }
        an_applyFilters();
      });
    }

    addListener(DOM.anDateFrom, "change", (e) => {
      anState.from = e.target.value || "";
      an_applyFilters();
    });
    addListener(DOM.anDateTo, "change", (e) => {
      anState.to = e.target.value || "";
      an_applyFilters();
    });
    addListener(DOM.anCompany, "input", (e) => {
      anState.company = (e.target.value || "").trim().toLowerCase();
    });
    addListener(DOM.anLocation, "input", (e) => {
      anState.location = (e.target.value || "").trim().toLowerCase();
    });
    addListener(DOM.anKeyword, "input", (e) => {
      anState.keyword = (e.target.value || "").trim().toLowerCase();
    });
    addListener(DOM.anSearch, "input", (e) => {
      anState.search = (e.target.value || "").trim().toLowerCase();
      an_applyFilters();
    });
    addListener(DOM.anSort, "change", (e) => {
      anState.sort = e.target.value || "deadline";
      an_applyFilters();
    });
    addListener(DOM.anApplyFiltersBtn, "click", () => an_applyFilters());
    addListener(DOM.anRefreshBtn, "click", () => an_refresh());
    addListener(DOM.anClearFiltersBtn, "click", an_clearAll);

    addListener(DOM.anTableBody, "click", (event) => {
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }
      const editBtn = target.closest("button[data-edit-id]");
      if (!editBtn) {
        return;
      }
      const id = editBtn.getAttribute("data-edit-id");
      if (id) {
        openModal(id);
      }
    });

    addListener(DOM.anExportBtn, "click", an_exportFilteredCSV);
    window.an_toggle = an_toggle;
    anState.initialized = true;
    an_refresh();
  }

  function an_toggle(forceValue) {
    const next = typeof forceValue === "boolean" ? forceValue : !anState.isOpen;
    anState.isOpen = next;

    if (DOM.kanbanView) {
      DOM.kanbanView.style.display = next ? "none" : "";
    }
    if (DOM.analyticsView) {
      DOM.analyticsView.style.display = next ? "flex" : "none";
    }
    if (DOM.analyticsBtn) {
      DOM.analyticsBtn.classList.toggle("an-active", next);
    }
    if (DOM.dashboardBtn) {
      DOM.dashboardBtn.classList.toggle("active", !next);
    }

    if (next) {
      an_refresh();
    }
  }

  function an_refresh() {
    if (!anState.initialized) {
      return;
    }
    an_applyFilters();
  }

  function an_applyFilters() {
    const from = anState.from;
    const to = anState.to;
    const company = anState.company;
    const location = anState.location;
    const keyword = anState.keyword;
    const search = anState.search;

    let rows = state.applications.filter((app) => {
      const code = an_stageCode(app.stage);
      if (!anState.statuses.has(code)) {
        return false;
      }

      const appDate = an_dateValue(app);
      if (from && (!appDate || appDate < from)) {
        return false;
      }
      if (to && (!appDate || appDate > to)) {
        return false;
      }

      const companyText = String(app.company || "").toLowerCase();
      const locationText = String(app.location || "").toLowerCase();
      const notesText = String(app.notes || "").toLowerCase();
      const roleText = String(app.role || "").toLowerCase();

      if (company && !companyText.includes(company)) {
        return false;
      }
      if (location && !locationText.includes(location)) {
        return false;
      }
      if (keyword && !(notesText.includes(keyword) || roleText.includes(keyword))) {
        return false;
      }
      if (search) {
        const haystack = `${companyText} ${roleText} ${locationText} ${notesText} ${String(app.reqId || "").toLowerCase()}`;
        if (!haystack.includes(search)) {
          return false;
        }
      }

      return true;
    });

    rows = an_sortRows(rows, anState.sort);
    anState.filtered = rows;

    an_renderStatusMeta(rows);
    an_renderActiveChips();
    an_updateStats(rows);
    an_renderTable(rows);
    an_buildCharts(rows);
  }

  function an_sortRows(rows, sort) {
    const nextRows = [...rows];
    if (sort === "company") {
      return nextRows.sort((a, b) => String(a.company || "").localeCompare(String(b.company || "")));
    }
    if (sort === "status") {
      return nextRows.sort((a, b) => an_stageLabel(an_stageCode(a.stage)).localeCompare(an_stageLabel(an_stageCode(b.stage))));
    }
    return nextRows.sort((a, b) => an_dateValue(a).localeCompare(an_dateValue(b)));
  }

  function an_renderStatusMeta(rows) {
    const counts = { W: 0, A: 0, O: 0, I: 0, R: 0, F: 0 };
    rows.forEach((app) => {
      counts[an_stageCode(app.stage)] += 1;
    });
    const total = rows.length || 1;

    if (DOM.anStatusChecks) {
      DOM.anStatusChecks.querySelectorAll("[data-count]").forEach((el) => {
        const code = el.getAttribute("data-count");
        el.textContent = String(counts[code] || 0);
      });
      DOM.anStatusChecks.querySelectorAll("[data-fill]").forEach((el) => {
        const code = el.getAttribute("data-fill");
        const pct = ((counts[code] || 0) / total) * 100;
        el.style.width = `${Math.max(4, pct)}%`;
      });
    }

    if (DOM.anStatusCount) {
      DOM.anStatusCount.textContent = String(anState.statuses.size);
    }
  }

  function an_renderActiveChips() {
    if (!DOM.anActiveChips) {
      return;
    }

    const chips = [];
    if (anState.statuses.size !== 6) {
      anState.statuses.forEach((code) => {
        chips.push(`<span class="an-chip an-chip-${an_stageClass(code)}">${an_stageLabel(code)} <span class="an-x" data-chip="status" data-value="${code}">x</span></span>`);
      });
    }
    if (anState.company) {
      chips.push(`<span class="an-chip an-chip-neutral">Company: ${escapeHtml(anState.company)} <span class="an-x" data-chip="company">x</span></span>`);
    }
    if (anState.location) {
      chips.push(`<span class="an-chip an-chip-neutral">Location: ${escapeHtml(anState.location)} <span class="an-x" data-chip="location">x</span></span>`);
    }
    if (anState.keyword) {
      chips.push(`<span class="an-chip an-chip-neutral">Keyword: ${escapeHtml(anState.keyword)} <span class="an-x" data-chip="keyword">x</span></span>`);
    }
    if (anState.search) {
      chips.push(`<span class="an-chip an-chip-neutral">Search: ${escapeHtml(anState.search)} <span class="an-x" data-chip="search">x</span></span>`);
    }

    DOM.anActiveChips.innerHTML = chips.join("") || '<span class="an-td-muted">No active filters</span>';

    DOM.anActiveChips.querySelectorAll(".an-x").forEach((btn) => {
      addListener(btn, "click", () => {
        const type = btn.getAttribute("data-chip");
        const value = btn.getAttribute("data-value") || "";
        if (type === "status" && value) {
          anState.statuses.delete(value);
          const checkbox = DOM.anStatusChecks ? DOM.anStatusChecks.querySelector(`input[data-code="${value}"]`) : null;
          if (checkbox) checkbox.checked = false;
        }
        if (type === "company") {
          anState.company = "";
          if (DOM.anCompany) DOM.anCompany.value = "";
        }
        if (type === "location") {
          anState.location = "";
          if (DOM.anLocation) DOM.anLocation.value = "";
        }
        if (type === "keyword") {
          anState.keyword = "";
          if (DOM.anKeyword) DOM.anKeyword.value = "";
        }
        if (type === "search") {
          anState.search = "";
          if (DOM.anSearch) DOM.anSearch.value = "";
        }
        an_applyFilters();
      });
    });
  }

  function an_updateStats(rows) {
    const byCode = { W: 0, A: 0, O: 0, I: 0, R: 0, F: 0 };
    rows.forEach((app) => {
      byCode[an_stageCode(app.stage)] += 1;
    });

    const active = byCode.W + byCode.A + byCode.O + byCode.I;
    const responseRate = rows.length ? Math.round(((byCode.I + byCode.F) / rows.length) * 100) : 0;
    const offerRate = rows.length ? Math.round((byCode.F / rows.length) * 100) : 0;

    if (DOM.anStatTotal) DOM.anStatTotal.textContent = String(rows.length);
    if (DOM.anStatRate) DOM.anStatRate.textContent = `${responseRate}%`;
    if (DOM.anStatActive) DOM.anStatActive.textContent = String(active);
    if (DOM.anStatOffers) DOM.anStatOffers.textContent = String(byCode.F);
    if (DOM.anStatOfferRate) DOM.anStatOfferRate.textContent = `${offerRate}% offer rate`;
    if (DOM.anTopCount) DOM.anTopCount.textContent = `${rows.length} rows`;
    if (DOM.anTableCount) DOM.anTableCount.textContent = String(rows.length);
  }

  function an_extractKeywords(app) {
    const raw = String(app.notes || "");
    if (!raw.trim()) {
      return [];
    }
    return raw
      .split(/[;,|]/)
      .map((part) => part.trim())
      .filter(Boolean)
      .slice(0, 3);
  }

  function an_renderTable(rows) {
    if (!DOM.anTableBody) {
      return;
    }

    if (!rows.length) {
      DOM.anTableBody.innerHTML = "";
      if (DOM.anEmpty) DOM.anEmpty.classList.add("show");
      return;
    }

    if (DOM.anEmpty) DOM.anEmpty.classList.remove("show");

    DOM.anTableBody.innerHTML = rows.map((app) => {
      const code = an_stageCode(app.stage);
      const deadline = app.deadline || an_dateValue(app);
      const keywords = an_extractKeywords(app);
      const keywordHtml = keywords.length
        ? keywords.map((word) => `<span class="an-kw-tag">${escapeHtml(word)}</span>`).join("")
        : '<span class="an-td-muted">-</span>';

      return `
        <tr>
          <td><input type="checkbox" aria-label="Select row" /></td>
          <td class="an-td-bold">${escapeHtml(app.company || "-")}</td>
          <td>${escapeHtml(app.role || "-")}</td>
          <td>${escapeHtml(app.location || "-")}</td>
          <td><span class="an-badge an-badge-${an_stageClass(code)}"><span class="an-badge-dot"></span>${escapeHtml(an_stageLabel(code))}</span></td>
          <td><div class="an-kw-tags">${keywordHtml}</div></td>
          <td>${deadline ? escapeHtml(deadline) : '<span class="an-td-muted">-</span>'}</td>
          <td>${escapeHtml(app.reqId || "-")}</td>
          <td>
            <div class="an-row-acts">
              <button type="button" class="an-btn an-btn-sm" data-edit-id="${escapeAttr(app.id)}">Edit</button>
            </div>
          </td>
        </tr>
      `;
    }).join("");
  }

  function an_buildCharts(rows = anState.filtered) {
    if (!anState.isOpen || typeof Chart === "undefined") {
      return;
    }

    const chartRows = Array.isArray(rows) ? rows : [];
    const counts = { W: 0, A: 0, O: 0, I: 0, R: 0, F: 0 };
    chartRows.forEach((app) => {
      counts[an_stageCode(app.stage)] += 1;
    });

    if (anCharts.bar) {
      anCharts.bar.destroy();
    }
    if (anCharts.donut) {
      anCharts.donut.destroy();
    }

    if (DOM.anBarChart) {
      anCharts.bar = new Chart(DOM.anBarChart, {
        type: "bar",
        data: {
          labels: ["Wishlist", "Applied", "OA/Test", "Interview", "Rejected", "Offer"],
          datasets: [{
            label: "Applications",
            data: [counts.W, counts.A, counts.O, counts.I, counts.R, counts.F],
            backgroundColor: ["#8b5cf6", "#6366f1", "#f59e0b", "#06b6d4", "#ef4444", "#10b981"],
            borderRadius: 8
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: { y: { beginAtZero: true, ticks: { precision: 0 } } }
        }
      });
    }

    if (DOM.anDonutChart) {
      const outcomeValues = [counts.I, counts.R, counts.F];
      anCharts.donut = new Chart(DOM.anDonutChart, {
        type: "doughnut",
        data: {
          labels: ["Interview", "Rejected", "Offer"],
          datasets: [{
            data: outcomeValues,
            backgroundColor: ["#06b6d4", "#ef4444", "#10b981"],
            borderWidth: 2,
            borderColor: state.theme === "dark" ? "#10162b" : "#ffffff"
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: "bottom",
              labels: { usePointStyle: true }
            }
          },
          cutout: "68%"
        }
      });
    }
  }

  function an_exportFilteredCSV() {
    const rows = anState.filtered || [];
    if (!rows.length) {
      showToast("No filtered rows to export", "warning");
      return;
    }

    const headers = ["Company", "Role", "Location", "Stage", "Date", "ReqID", "Notes"];
    const lines = rows.map((app) => [
      app.company || "",
      app.role || "",
      app.location || "",
      app.stage || "",
      an_dateValue(app),
      app.reqId || "",
      app.notes || ""
    ]);

    const csv = [headers, ...lines]
      .map((line) => line.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `analytics_export_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast("Analytics CSV exported");
  }

  function an_quickFilter(type, value) {
    const normalized = String(value || "").trim();
    if (!normalized) {
      return;
    }
    if (type === "company") {
      anState.company = normalized.toLowerCase();
      if (DOM.anCompany) DOM.anCompany.value = normalized;
    }
    if (type === "location") {
      anState.location = normalized.toLowerCase();
      if (DOM.anLocation) DOM.anLocation.value = normalized;
    }
    if (type === "keyword") {
      anState.keyword = normalized.toLowerCase();
      if (DOM.anKeyword) DOM.anKeyword.value = normalized;
    }
    an_applyFilters();
  }

  function an_clearAll() {
    anState.from = "";
    anState.to = "";
    anState.company = "";
    anState.location = "";
    anState.keyword = "";
    anState.search = "";
    anState.sort = "deadline";
    anState.statuses = new Set(["W", "A", "O", "I", "R", "F"]);

    if (DOM.anDateFrom) DOM.anDateFrom.value = "";
    if (DOM.anDateTo) DOM.anDateTo.value = "";
    if (DOM.anCompany) DOM.anCompany.value = "";
    if (DOM.anLocation) DOM.anLocation.value = "";
    if (DOM.anKeyword) DOM.anKeyword.value = "";
    if (DOM.anSearch) DOM.anSearch.value = "";
    if (DOM.anSort) DOM.anSort.value = "deadline";
    if (DOM.anStatusChecks) {
      DOM.anStatusChecks.querySelectorAll('input[type="checkbox"]').forEach((checkbox) => {
        checkbox.checked = true;
      });
    }

    an_applyFilters();
  }

  function an_export() {
    an_exportFilteredCSV();
  }

  window.an_toggle = an_toggle;
  window.an_applyFilters = an_applyFilters;
  window.an_quickFilter = an_quickFilter;
  window.an_clearAll = an_clearAll;
  window.an_export = an_export;

  function openModal(editId = null) {
    if (SUBMISSION_LOCKED) {
      showToast("App is locked for submission", "info");
      return;
    }

    if (!currentUserId) {
      showToast("Please sign in first", "warning");
      return;
    }

    state.editingId = editId;
    const isEdit = Boolean(editId);
    const app = isEdit
      ? state.applications.find((item) => item.id === editId)
      : createBlankApplication();

    DOM.modalBox.innerHTML = `
      <div class="modal-header" style="display:flex;justify-content:space-between;align-items:center;gap:1rem;">
        <h2 id="modal-title">${isEdit ? "Edit Application" : "New Application"}</h2>
        <button type="button" class="modal-close" id="modal-close-btn" aria-label="Close">✕</button>
      </div>

      ${isEdit ? "" : `
      <section id="source-step" style="display:grid;gap:0.9rem;margin-bottom:1rem;">
        <div style="font-weight:600;">Step 1: Choose Input Source</div>
        <div style="display:flex;gap:0.6rem;flex-wrap:wrap;">
          <button type="button" class="btn btn-secondary" id="source-link-btn" data-source="link">Use Job Link</button>
          <button type="button" class="btn btn-secondary" id="source-file-btn" data-source="file">Use File</button>
        </div>

        <div id="source-link-panel" style="display:none;">
          <label for="source-link-input">Job Link</label>
          <input type="url" id="source-link-input" placeholder="https://company.com/job/..." />
        </div>

        <div id="source-file-panel" style="display:none;">
          <label for="source-file-input">Attachment (single job: .txt, .csv, .xlsx)</label>
          <input type="file" id="source-file-input" accept=".txt,.csv,.xlsx,.xls" />
        </div>

        <div style="display:flex;justify-content:flex-end;">
          <button type="button" class="btn btn-primary" id="extract-continue-btn">Extract and Continue</button>
        </div>
        <div id="extract-loader" class="extract-loader hidden" aria-live="polite">
          <span class="loader-spinner" aria-hidden="true"></span>
          <span id="extract-loader-text">Fetching job details...</span>
        </div>
        <small class="text-muted">Step 2 form will open after extraction for one job. For multiple jobs, use sidebar Import CSV.</small>
      </section>
      `}

      <form id="app-form" style="display:grid;gap:1rem;${isEdit ? "" : "display:none;"}">
        <input type="hidden" id="form-id" value="${app.id}" />
        <input type="hidden" id="form-link" value="${escapeAttr(app.link)}" />

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
          <div class="form-group">
            <label for="form-company">Company Name</label>
            <input type="text" id="form-company" maxlength="120" value="${escapeAttr(app.company)}" />
          </div>
          <div class="form-group">
            <label for="form-role">Job Title</label>
            <input type="text" id="form-role" maxlength="200" value="${escapeAttr(app.role)}" />
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
          <div class="form-group">
            <label for="form-location">Location</label>
            <input type="text" id="form-location" maxlength="120" value="${escapeAttr(app.location || '')}" placeholder="e.g. Walldorf, Munich" />
          </div>
          <div class="form-group">
            <label for="form-req-id">Requisition ID</label>
            <input type="text" id="form-req-id" maxlength="120" value="${escapeAttr(app.reqId || '')}" placeholder="Requisition / Job ID" />
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
          <div class="form-group">
            <label for="form-posting-date">Job Posting Date</label>
            <input type="date" id="form-posting-date" value="${escapeAttr(app.postingDate || '')}" />
          </div>
          <div class="form-group">
            <label for="form-stage">Stage</label>
            <select id="form-stage">
              ${STAGES.map((stage) => `<option value="${stage}" ${app.stage === stage ? "selected" : ""}>${stage}</option>`).join("")}
            </select>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr;gap:1rem;">
          <div class="form-group">
            <label for="form-deadline">Self Deadline</label>
            <input type="date" id="form-deadline" value="${escapeAttr(app.deadline || '')}" />
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
          <div class="form-group">
            <label for="form-contact-type">Contact Person Type</label>
            <select id="form-contact-type">
              <option value="">Select type</option>
              <option value="HR" ${app.contactType === "HR" ? "selected" : ""}>HR</option>
              <option value="Friend" ${app.contactType === "Friend" ? "selected" : ""}>Friend</option>
              <option value="Company Employee" ${app.contactType === "Company Employee" ? "selected" : ""}>Company Employee</option>
            </select>
          </div>
          <div class="form-group">
            <label for="form-contact-name">Contact Name</label>
            <input type="text" id="form-contact-name" maxlength="120" value="${escapeAttr(app.contactName || '')}" placeholder="Name of HR/Friend/Employee" />
          </div>
        </div>

        <div class="form-group">
          <label for="form-notes">Notes</label>
          <textarea id="form-notes" maxlength="500" placeholder="Any notes...">${escapeHtml(app.notes || '')}</textarea>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
          <button type="button" class="btn btn-secondary" id="cancel-modal-btn">Cancel</button>
          <button type="submit" class="btn btn-primary">Save Application</button>
        </div>
      </form>
    `;

    DOM.modalBackdrop.classList.remove("hidden");

    document.getElementById("modal-close-btn").addEventListener("click", closeModal);
    document.getElementById("cancel-modal-btn").addEventListener("click", closeModal);
    document.getElementById("app-form").addEventListener("submit", saveApplicationFromForm);

    if (isEdit) {
      return;
    }

    setupSourceStepForNewApplication();
  }

  function setupSourceStepForNewApplication() {
    const form = document.getElementById("app-form");
    const sourceStep = document.getElementById("source-step");
    const linkBtn = document.getElementById("source-link-btn");
    const fileBtn = document.getElementById("source-file-btn");
    const linkPanel = document.getElementById("source-link-panel");
    const filePanel = document.getElementById("source-file-panel");
    const extractBtn = document.getElementById("extract-continue-btn");
    const sourceLinkInput = document.getElementById("source-link-input");
    const sourceFileInput = document.getElementById("source-file-input");
    const extractLoader = document.getElementById("extract-loader");
    const extractLoaderText = document.getElementById("extract-loader-text");

    let sourceMode = "";

    function setExtractionLoading(isLoading, message) {
      if (extractLoader) {
        extractLoader.classList.toggle("hidden", !isLoading);
      }
      if (extractLoaderText && message) {
        extractLoaderText.textContent = message;
      }
      [extractBtn, linkBtn, fileBtn, sourceLinkInput, sourceFileInput].forEach((el) => {
        if (el) el.disabled = isLoading;
      });
    }

    function setSourceMode(mode) {
      sourceMode = mode;
      const isLink = mode === "link";
      linkPanel.style.display = isLink ? "block" : "none";
      filePanel.style.display = !isLink ? "block" : "none";
      linkBtn.classList.toggle("btn-primary", isLink);
      linkBtn.classList.toggle("btn-secondary", !isLink);
      fileBtn.classList.toggle("btn-primary", !isLink);
      fileBtn.classList.toggle("btn-secondary", isLink);
    }

    linkBtn.addEventListener("click", () => setSourceMode("link"));
    fileBtn.addEventListener("click", () => setSourceMode("file"));

    extractBtn.addEventListener("click", async () => {
      if (!sourceMode) {
        showToast("Select Job Link or File first", "warning");
        return;
      }

      let extracted = null;
      try {
        setExtractionLoading(true, "Starting extraction...");
        if (sourceMode === "link") {
          const linkValue = (sourceLinkInput.value || "").trim();
          if (!linkValue) {
            showToast("Please provide a job link", "warning");
            setExtractionLoading(false);
            return;
          }

          // Store link in hidden field
          const hiddenLink = document.getElementById("form-link");
          if (hiddenLink) hiddenLink.value = linkValue;

          // 1) Try fetching page for structured data
          setExtractionLoading(true, "Fetching and scraping webpage...");
          const fetched = await fetchJobPageDetails(linkValue);

          // 2) Parse URL for fallback data
          setExtractionLoading(true, "Parsing URL and merging fields...");
          const inferred = inferFromJobLink(linkValue);

          // 3) Merge: fetched data takes priority
          extracted = {
            link: linkValue,
            company: (fetched && fetched.company) || (inferred && inferred.company) || "",
            role: (fetched && fetched.title) || (inferred && inferred.role) || "",
            location: (fetched && fetched.location) || (inferred && inferred.location) || "",
            reqId: (fetched && fetched.reqId) || (inferred && inferred.reqId) || "",
            postingDate: (fetched && fetched.postingDate) || (inferred && inferred.postingDate) || "",
            stage: "Applied"
          };
        } else {
          const [file] = sourceFileInput.files || [];
          if (!file) {
            showToast("Please choose a file", "warning");
            setExtractionLoading(false);
            return;
          }
          setExtractionLoading(true, "Reading and parsing attachment...");
          extracted = await parseFormAttachment(file);
        }
      } catch (error) {
        setExtractionLoading(false);
        showToast(error.message || "Failed to extract data", "error");
        return;
      } finally {
        setExtractionLoading(false);
      }

      form.style.display = "grid";
      sourceStep.style.display = "none";

      if (extracted) {
        applyFormData(extracted, true);
      }

      const companyVal = getValue("form-company").trim();
      const roleVal = getValue("form-role").trim();
      if (companyVal || roleVal) {
        showToast("Data extracted. Verify and submit.");
      } else {
        showToast("Could not extract enough data. Please fill manually.", "warning");
      }
    });
  }

  function closeModal() {
    state.editingId = null;
    DOM.modalBackdrop.classList.add("hidden");
  }

  function applyLinkAutoFill(rawLink, force = false) {
    const inferred = inferFromJobLink(rawLink);
    if (!inferred) {
      return;
    }

    const companyEl = document.getElementById("form-company");
    const roleEl = document.getElementById("form-role");
    const postingEl = document.getElementById("form-posting-date");
    const locationEl = document.getElementById("form-location");
    const reqIdEl = document.getElementById("form-req-id");

    if (companyEl && inferred.company && (force || !companyEl.value.trim())) {
      companyEl.value = inferred.company;
    }
    if (roleEl && inferred.role && (force || !roleEl.value.trim())) {
      roleEl.value = inferred.role;
    }
    if (postingEl && inferred.postingDate && (force || !postingEl.value)) {
      postingEl.value = inferred.postingDate;
    }
    if (locationEl && inferred.location && (force || !locationEl.value.trim())) {
      locationEl.value = inferred.location;
    }
    if (reqIdEl && inferred.reqId && (force || !reqIdEl.value.trim())) {
      reqIdEl.value = inferred.reqId;
    }
  }

  async function parseFormAttachment(file) {
    const lowerName = file.name.toLowerCase();

    if (lowerName.endsWith(".txt")) {
      const text = await file.text();
      return parseTextAttachment(text);
    }

    if (lowerName.endsWith(".csv")) {
      const text = await file.text();
      const rows = parseCSVText(text);
      if (!rows.length) {
        return null;
      }
      if (rows.length > 1) {
        throw new Error("This step supports one job only. Use sidebar Import CSV for bulk files.");
      }
      return normalizeImportedEntry(rows[0]);
    }

    if (lowerName.endsWith(".xlsx") || lowerName.endsWith(".xls")) {
      if (typeof window.XLSX === "undefined") {
        throw new Error("Excel parser not available. Please retry with internet connection or use CSV/TXT.");
      }
      const buffer = await file.arrayBuffer();
      const workbook = window.XLSX.read(buffer, { type: "array" });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = window.XLSX.utils.sheet_to_json(firstSheet, {
        defval: "",
        raw: false,
        dateNF: "yyyy-mm-dd"
      });
      if (!rows.length) {
        return null;
      }
      if (rows.length > 1) {
        throw new Error("This step supports one job only. Use sidebar Import CSV for bulk files.");
      }
      return normalizeImportedEntry(rows[0]);
    }

    throw new Error("Unsupported attachment type. Use TXT, CSV, or Excel.");
  }

  function parseTextAttachment(text) {
    if (!text || !text.trim()) {
      return null;
    }

    const map = {};
    text.split(/\r?\n/).forEach((line) => {
      const [rawKey, ...rest] = line.split(":");
      if (!rawKey || rest.length === 0) {
        return;
      }
      const key = normalizeKey(rawKey);
      const value = rest.join(":").trim();
      if (key && value) {
        map[key] = value;
      }
    });

    const possibleUrl = text.match(/https?:\/\/[^\s]+/i);
    const link = (map.joblink || map.link || map.url || (possibleUrl ? possibleUrl[0] : "")).trim();
    const inferred = inferFromJobLink(link);

    return {
      link,
      company: map.company || map.companyname || (inferred ? inferred.company : ""),
      role: map.jobtitle || map.title || map.role || (inferred ? inferred.role : ""),
      location: map.location || map.city || map.joblocation || (inferred ? inferred.location : ""),
      reqId: map.reqid || map.jobid || map.jobnumber || map.requisitionid || map.requesitionid || map.requisitionnumber || map.fullrequisitionid || map.referenceid || map.referencenumber || (inferred ? inferred.reqId : ""),
      postingDate: toIsoDate(map.jobpostingdate || map.jobpostdate || map.postingdate || map.jobpost || map.posteddate || map.publicationdate || map.publisheddate || map.dateposted || map.datepublished || (inferred ? inferred.postingDate : "")),
      stage: map.stage || "Applied",
      appliedDate: toIsoDate(map.applieddate || map.dateapplied || ""),
      deadline: toIsoDate(map.selfdeadline || map.deadline || ""),
      followupDate: toIsoDate(map.followupdate || map.followup || ""),
      contactType: map.contacttype || map.contactpersontype || "",
      contactName: map.contactname || map.contactperson || map.contact || "",
      notes: map.notes || map.remark || map.comments || ""
    };
  }

  function applyFormData(data, force = false) {
    if (!data) {
      return;
    }

    setFormValue("form-link", data.link, force);
    setFormValue("form-company", data.company, force);
    setFormValue("form-role", data.role, force);
    setFormValue("form-location", data.location, force);
    setFormValue("form-req-id", data.reqId, force);
    setFormValue("form-posting-date", data.postingDate, force);
    setFormValue("form-stage", data.stage, force);
    setFormValue("form-deadline", data.deadline, force);
    setFormValue("form-contact-type", data.contactType, force);
    setFormValue("form-contact-name", data.contactName, force);
    setFormValue("form-notes", data.notes, force);

    if (data.link) {
      applyLinkAutoFill(data.link, force);
    }
  }

  function setFormValue(id, value, force = false) {
    const el = document.getElementById(id);
    if (!el || value === undefined || value === null || value === "") {
      return;
    }
    if (!force && String(el.value || "").trim()) {
      return;
    }
    el.value = value;
  }

  // ── Fetch job page for structured data (JSON-LD / meta) ──
  async function fetchJobPageDetails(url) {
    const extractPostingDateFromText = (text) => {
      if (!text) return "";

      // Direct ISO-like date first
      const iso = extractDateFromString(text);
      if (iso) return iso;

      // SAP style: Tue Feb 24 00:00:00 UTC 2026
      const sapLong = text.match(/datePosted[^\n\r<]{0,120}([A-Za-z]{3}\s+[A-Za-z]{3}\s+\d{1,2}[^\n\r<]{0,30}\d{4})/i);
      if (sapLong && sapLong[1]) {
        const parsed = new Date(sapLong[1]);
        if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
      }

      // Label-based ISO date (Listed, publication date, etc.)
      const labeledIso = text.match(/(?:job\s*post(?:ing)?\s*date|posting\s*date|publication\s*date|posted\s*date|listed|date\s*posted|published|date\s*published|published\s*on)\s*[:#-]?\s*(20\d{2}[-\/](0?[1-9]|1[0-2])[-\/](0?[1-9]|[12]\d|3[01]))/i);
      if (labeledIso && labeledIso[1]) {
        return toIsoDate(labeledIso[1]);
      }

      // Human-readable fallback: Feb 24, 2026
      const friendly = text.match(/(?:job\s*post(?:ing)?\s*date|posting\s*date|publication\s*date|posted|date\s*posted|published|date\s*published|published\s*on)[^\n\r<]{0,60}([A-Za-z]{3,9}\s+\d{1,2},?\s+\d{4})/i);
      if (friendly && friendly[1]) {
        const parsed = new Date(friendly[1]);
        if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
      }

      return "";
    };

    const extractLocationFromText = (text) => {
      if (!text) return "";
      const compact = String(text).replace(/\s+/g, " ");
      const match = compact.match(/(?:location|city|job\s*location)\s*[:#-]?\s*([^\n\r<|;]{2,90})/i);
      if (!match || !match[1]) return "";
      const value = match[1].trim();
      return value.replace(/\s{2,}/g, " ").replace(/[.,;:]+$/, "");
    };

    const extractReqIdFromText = (text) => {
      if (!text) return "";
      const compact = String(text).replace(/\s+/g, " ");
      const match = compact.match(/(?:job\s*number|job\s*id|req\s*id|requisition\s*id|requesition\s*id|requisition\s*number|full\s*requisition\s*id|reference\s*id|reference\s*number)\s*[:#-]?\s*([A-Za-z0-9][A-Za-z0-9._-]{2,})/i);
      return match && match[1] ? String(match[1]).trim() : "";
    };

    const parseDbApiPayload = (payload) => {
      if (!payload || typeof payload !== "object") return null;
      const html = payload.html || "";
      const applyUri = payload.apply_uri || "";
      if (!html && !applyUri) return null;

      const parsed = parseHtmlForJobMeta(html || "");
      const inferredApply = applyUri ? inferFromJobLink(applyUri) : null;
      return {
        title: (parsed && parsed.title) || (inferredApply && inferredApply.role) || "",
        company: (parsed && parsed.company) || "Deutsche Bank",
        postingDate: (parsed && parsed.postingDate) || "",
        location: (parsed && parsed.location) || (inferredApply && inferredApply.location) || "",
        reqId: (parsed && parsed.reqId) || (inferredApply && inferredApply.reqId) || ""
      };
    };

    const parseHtmlForJobMeta = (html) => {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const fullText = [doc.body ? doc.body.textContent : "", html].join(" ");

      let extracted = { title: "", company: "", postingDate: "", location: "", reqId: "" };

      for (const script of doc.querySelectorAll('script[type="application/ld+json"]')) {
        try {
          let data = JSON.parse(script.textContent);
          if (Array.isArray(data)) data = data.find(d => d['@type'] === 'JobPosting');
          if (data && data['@type'] === 'JobPosting') {
            const loc = data.jobLocation;
            let locStr = '';
            if (loc) {
              if (Array.isArray(loc)) locStr = loc.map(l => l.address?.addressLocality || l.name || '').filter(Boolean).join(', ');
              else locStr = loc.address?.addressLocality || loc.name || '';
            }
            extracted = {
              title: data.title || '',
              company: data.hiringOrganization?.name || '',
              postingDate: data.datePosted ? data.datePosted.slice(0, 10) : '',
              location: locStr,
              reqId: data.identifier?.value || data.identifier?.name || ''
            };
            break;
          }
        } catch {
          // ignore malformed JSON-LD blocks
        }
      }

      let postingDate = extracted.postingDate || '';
      const datePostedMeta = doc.querySelector('meta[itemprop="datePosted"]');
      if (datePostedMeta) {
        const raw = datePostedMeta.getAttribute('content') || '';
        const d = new Date(raw);
        if (!isNaN(d.getTime())) postingDate = d.toISOString().slice(0, 10);
      }

      if (!postingDate) {
        postingDate = extractPostingDateFromText(fullText);
      }

      let reqId = extracted.reqId || '';
      if (!reqId) {
        const reqMetaCandidates = [
          'meta[itemprop="identifier"]',
          'meta[name="job_id"]',
          'meta[name="jobid"]',
          'meta[name="reqid"]',
          'meta[name="requisitionid"]'
        ];
        for (const selector of reqMetaCandidates) {
          const node = doc.querySelector(selector);
          const val = node ? (node.getAttribute('content') || '').trim() : '';
          if (val) {
            reqId = val;
            break;
          }
        }
      }
      if (!reqId) {
        reqId = extractReqIdFromText(fullText);
      }

      let location = extracted.location || '';
      if (!location) {
        const locationMeta = [
          'meta[property="job:location"]',
          'meta[name="job_location"]',
          'meta[name="location"]'
        ];
        for (const selector of locationMeta) {
          const node = doc.querySelector(selector);
          const val = node ? (node.getAttribute('content') || '').trim() : '';
          if (val) {
            location = val;
            break;
          }
        }
      }
      if (!location) {
        location = extractLocationFromText(fullText);
      }

      const ogTitle = doc.querySelector('meta[property="og:title"]');
      const title = extracted.title || (ogTitle ? ogTitle.content : '');
      const company = extracted.company || '';
      if (postingDate || title || reqId || company || location) {
        return { title, postingDate, company, location, reqId };
      }
      return null;
    };

    // DB careers pages are SPA pages; pull structured details from the public jobhtml API.
    try {
      const parsedUrl = new URL(url);
      if (parsedUrl.hostname.replace('www.', '').toLowerCase().includes('db.com')) {
        const routeBlob = `${parsedUrl.pathname} ${decodeURIComponent(parsedUrl.hash || '')}`;
        const dbIdMatch = routeBlob.match(/\/job\/([A-Za-z0-9_-]+)/i);
        if (dbIdMatch && dbIdMatch[1]) {
          const jobToken = dbIdMatch[1];
          const dbApiUrl = `https://api-deutschebank.beesite.de/jobhtml/${encodeURIComponent(jobToken)}.json`;
          const dbAttempts = [
            dbApiUrl,
            `https://api.allorigins.win/raw?url=${encodeURIComponent(dbApiUrl)}`
          ];
          for (const endpoint of dbAttempts) {
            try {
              const resp = await fetch(endpoint, { redirect: 'follow' });
              if (!resp.ok) continue;
              const payload = await resp.json();
              const dbParsed = parseDbApiPayload(payload);
              if (dbParsed) return dbParsed;
            } catch {
              // continue to next endpoint
            }
          }
        }
      }
    } catch {
      // continue with generic extraction flow
    }

    const attempts = [
      url,
      `https://r.jina.ai/http://${String(url).replace(/^https?:\/\//, '')}`,
      `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`
    ];

    for (const attemptUrl of attempts) {
      try {
        const resp = await fetch(attemptUrl, { redirect: 'follow' });
        if (!resp.ok) continue;
        const text = await resp.text();
        const parsed = parseHtmlForJobMeta(text);
        if (parsed) return parsed;

        // Some endpoints return JSON with HTML payload (common in SPA job platforms).
        try {
          const asJson = JSON.parse(text);
          const dbParsed = parseDbApiPayload(asJson);
          if (dbParsed) return dbParsed;
        } catch {
          // non-JSON response
        }
      } catch {
        // continue trying next fallback endpoint
      }
    }

    return null;
  }

  function inferFromJobLink(rawLink) {
    if (!rawLink) return null;
    try {
      const url = new URL(rawLink);
      const host = url.hostname.replace('www.', '').toLowerCase();
      const segments = url.pathname.split('/').filter(Boolean).map(s => decodeURIComponent(s));
      const hashSegments = decodeURIComponent(url.hash || "").split('/').filter(Boolean).map((s) => decodeURIComponent(s));

      // Company from hostname
      let company = '';
      if (host.includes('sap.com')) company = 'SAP';
      else if (host.includes('siemens.com')) company = 'Siemens';
      else if (host.includes('bosch.com')) company = 'Bosch';
      else if (host.includes('bmw.com')) company = 'BMW';
      else if (host.includes('db.com')) company = 'Deutsche Bank';
      else {
        const parts = host.split('.');
        company = parts.length >= 2 ? toTitleCase(parts[parts.length - 2].replace(/[-_]/g, ' ')) : '';
      }

      let role = '', location = '', reqId = '';

      // SAP pattern: /job/{City}-{Role}-{ID}/{ID}/
      if (host.includes('sap.com') && segments[0] === 'job' && segments.length >= 2) {
        const slug = segments[1];
        const parts = slug.split('-');
        if (parts.length > 2) {
          location = toTitleCase(parts[0]);
          const last = parts[parts.length - 1];
          if (/^\d+$/.test(last)) {
            reqId = last;
            role = toTitleCase(parts.slice(1, -1).join(' '));
          } else {
            role = toTitleCase(parts.slice(1).join(' '));
          }
        }
        // second segment may also be a numeric ID
        if (segments[2] && /^\d+$/.test(segments[2])) {
          reqId = reqId || segments[2];
        }
      }
      // Siemens pattern: /{location}/{role-slug}/{hex-id}/job/
      else if (host.includes('siemens.com') && segments.length >= 3) {
        location = toTitleCase(segments[0].replace(/-deu|-usa|-gbr|-ind|-chn|-fra/gi, '').replace(/-/g, ' '));
        role = toTitleCase(segments[1].replace(/-/g, ' '));
        if (/^[0-9A-F]{10,}$/i.test(segments[2])) reqId = segments[2];
      }
      // DB careers SPA hash route pattern: #/professional/job/{id}
      else if (host.includes('db.com')) {
        const allRoute = [...segments, ...hashSegments];
        const jobIndex = allRoute.findIndex((part) => part.toLowerCase() === 'job');
        if (jobIndex >= 0 && allRoute[jobIndex + 1]) {
          reqId = allRoute[jobIndex + 1];
        }
        role = inferRoleFromUrlGeneric(url, allRoute);
      }
      // Generic fallback
      else {
        role = inferRoleFromUrlGeneric(url, [...segments, ...hashSegments]);
      }

      const params = url.searchParams;
      const reqFromParams = [
        params.get('jobId'),
        params.get('jobID'),
        params.get('reqId'),
        params.get('requisitionId'),
        params.get('requesitionId'),
        params.get('jobNumber')
      ].find(Boolean);
      if (!reqId && reqFromParams) {
        reqId = String(reqFromParams).trim();
      }

      const postingDate = extractDateFromString(
        [
          url.pathname,
          url.search,
          params.get('postingDate') || '',
          params.get('publicationDate') || '',
          params.get('publishedDate') || ''
        ].join(' ')
      );

      return { company, role, location, reqId, postingDate: postingDate || '' };
    } catch { return null; }
  }

  function inferRoleFromUrlGeneric(url, segments) {
    const skip = new Set(['jobs','job','careers','career','apply','position','positions','vacancies','opening','openings','view']);
    const candidates = segments
      .map(s => s.replace(/\.[a-zA-Z0-9]+$/, '').replace(/[0-9]{3,}/g, ' ').replace(/[+_\-]+/g, ' ').replace(/[^a-zA-Z\s]/g, ' ').replace(/\s+/g, ' ').trim())
      .filter(s => s.length >= 3 && !skip.has(s.toLowerCase()));
    const best = candidates.sort((a, b) => b.length - a.length)[0];
    return best ? toTitleCase(best) : '';
  }

  function saveApplicationFromForm(event) {
    if (SUBMISSION_LOCKED) {
      event.preventDefault();
      showToast("App is locked for submission", "info");
      return;
    }

    event.preventDefault();

    const id = getValue("form-id");
    const typedCompany = getValue("form-company").trim();
    const typedRole = getValue("form-role").trim();
    const link = getValue("form-link").trim();
    const typedLocation = getValue("form-location").trim();
    const typedReqId = getValue("form-req-id").trim();
    const typedPostingDate = getValue("form-posting-date");
    const stage = getValue("form-stage") || "Applied";
    const deadline = getValue("form-deadline");
    const contactType = getValue("form-contact-type");
    const contactName = getValue("form-contact-name").trim();
    const notes = getValue("form-notes").trim();

    const inferred = inferFromJobLink(link);
    const company = typedCompany || (inferred ? inferred.company : "") || (link ? "Unknown Company" : "");
    const role = typedRole || (inferred ? inferred.role : "") || (link ? "Unknown Role" : "");
    const postingDate = typedPostingDate || (inferred ? inferred.postingDate : "") || "";
    const location = typedLocation || (inferred ? inferred.location : "") || "";
    const reqId = typedReqId || (inferred ? inferred.reqId : "") || "";

    if (!company || !role) {
      showToast("Please provide a Job Link or upload an attachment", "error");
      return;
    }

    const payload = {
      id,
      company,
      role,
      link,
      location,
      reqId,
      postingDate,
      stage,
      deadline,
      contactType,
      contactName,
      contact: [contactType, contactName].filter(Boolean).join(": "),
      notes,
      updatedAt: new Date().toISOString()
    };

    const existingIndex = state.applications.findIndex((app) => app.id === id);

    if (existingIndex >= 0) {
      state.applications[existingIndex] = {
        ...state.applications[existingIndex],
        ...payload
      };
      showToast("Application updated");
    } else {
        payload.createdAt = new Date().toISOString();
      state.applications.unshift({
          ...payload
      });
      showToast("Application added");
    }

      // Save to Firebase or localStorage
      if (useFirebase && currentUserId) {
        const appToSave = existingIndex >= 0 
          ? state.applications[existingIndex]
          : state.applications[0];
      
        FirebaseAPI.db.saveApplication(currentUserId, appToSave)
          .then(() => {
            console.log('✅ Saved to Firebase');
          })
          .catch((error) => {
            console.error('Firebase save error:', error);
            showToast('Failed to save to cloud. Check connection.', 'error');
          });
      } else {
        saveApplications();
      }
    
    closeModal();
    renderUI();
  }

  function loadMotivationalQuote() {
    const quotes = [
      "Every rejection is redirection. Keep applying, your breakthrough is coming.",
      "The job hunt is a marathon, not a sprint. Persistence always wins.",
      "Your dream role is out there. Every application brings you one step closer.",
      "Success is the sum of small efforts repeated day after day. Keep going!",
      "Today's 'no' is tomorrow's 'yes'. Don't stop when you're tired, stop when you're done.",
      "The only way to guarantee failure is to stop trying. Your next application could be the one.",
      "Hard work beats talent when talent doesn't work hard. Stay consistent."
    ];

    const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
    const container = document.getElementById('motivational-quote-container');
    if (!container) return;

    quoteState.selectedQuote = randomQuote;
    runQuoteTypewriter();
    setupQuoteScrollAnimation();
  }

  function runQuoteTypewriter() {
    const container = document.getElementById('motivational-quote-container');
    if (!container || !quoteState.selectedQuote) return;

    if (quoteState.typingTimer) {
      clearInterval(quoteState.typingTimer);
      quoteState.typingTimer = null;
    }

    container.textContent = "";
    container.classList.add("is-typing");

    let index = 0;
    quoteState.typingTimer = setInterval(() => {
      index += 1;
      container.textContent = quoteState.selectedQuote.slice(0, index);

      if (index >= quoteState.selectedQuote.length) {
        clearInterval(quoteState.typingTimer);
        quoteState.typingTimer = null;
        container.classList.remove("is-typing");
      }
    }, 38);
  }

  function setupQuoteScrollAnimation() {
    const quoteSection = document.querySelector('.quote-banner');
    if (!quoteSection) return;

    if (quoteState.observer) {
      quoteState.observer.disconnect();
    }

    quoteState.observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && quoteState.canReplayOnScroll) {
          runQuoteTypewriter();
          quoteState.canReplayOnScroll = false;
        }

        if (!entry.isIntersecting) {
          quoteState.canReplayOnScroll = true;
        }
      });
    }, {
      threshold: 0.45
    });

    quoteState.observer.observe(quoteSection);
  }

  function renderStats() {
    const apps = state.applications;
    const wishlist = apps.filter((a) => a.stage === "Wishlist").length;
    const applied = apps.filter((a) => a.stage === "Applied").length;
    const oa = apps.filter((a) => a.stage === "OA/Test").length;
    const interviews = apps.filter((a) => a.stage === "Interview").length;
    const rejected = apps.filter((a) => a.stage === "Rejected").length;
    const offers = apps.filter((a) => a.stage === "Offer").length;
    const responseRate = apps.length > 0
      ? Math.round(((interviews + offers) / apps.length) * 100)
      : 0;

    if (DOM.statTotal) DOM.statTotal.textContent = String(wishlist);
    if (DOM.statApplied) DOM.statApplied.textContent = String(applied);
    if (DOM.statInterview) DOM.statInterview.textContent = String(oa);
    if (DOM.statOffers) DOM.statOffers.textContent = String(interviews);
    if (DOM.statFollowup) DOM.statFollowup.textContent = String(rejected);
    if (DOM.statResponse) DOM.statResponse.textContent = String(offers);
    if (DOM.statRate) DOM.statRate.textContent = `${responseRate}%`;
  }

  function renderGoal() {
    const thisWeekCount = getApplicationsThisWeek().length;
    const percentage = Math.min(100, (thisWeekCount / state.currentWeeklyGoal) * 100);
    DOM.goalBarFill.style.width = `${percentage}%`;
    DOM.goalText.textContent = `${thisWeekCount} / ${state.currentWeeklyGoal} applications this week`;
  }

  function renderFilterUI() {
    document.querySelectorAll(".chip").forEach((chip) => {
      chip.classList.toggle("chip-active", chip.dataset.stage === state.currentFilter);
    });

    document.querySelectorAll(".company-chip[data-company]").forEach((chip) => {
      const company = (chip.getAttribute("data-company") || "").trim();
      chip.classList.toggle("active", company === state.currentCompanyFilter);
    });

    document.querySelectorAll(".company-chip[data-company-clear]").forEach((chip) => {
      chip.classList.toggle("active", state.currentCompanyFilter === "all");
    });

    if (!DOM.activeFilterBar || !DOM.activeFilterLabel) {
      return;
    }

    if (state.currentFilter !== "all" || state.currentCompanyFilter !== "all" || state.searchQuery) {
      const labels = [];
      if (state.currentFilter !== "all") {
        labels.push(`Stage: ${state.currentFilter}`);
      }
      if (state.currentCompanyFilter !== "all") {
        labels.push(`Company: ${state.currentCompanyFilter}`);
      }
      if (state.searchQuery) {
        labels.push(`Search: \"${state.searchQuery}\"`);
      }
      const label = labels.join(" | ");
      DOM.activeFilterLabel.textContent = label;
      DOM.activeFilterBar.removeAttribute("hidden");
    } else {
      DOM.activeFilterBar.setAttribute("hidden", "");
    }
  }

  function renderKanban(onlyFollowup = false) {
    const filtered = getFilteredApplications().filter((app) => (onlyFollowup ? isFollowupDue(app) : true));
    const visibleStages = STAGES;

    DOM.kanbanBoard.innerHTML = visibleStages.map((stage) => {
      const stageItems = filtered.filter((a) => a.stage === stage);
      const stageSlug = stage.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
      return `
        <section class="kanban-column" data-stage="${stage}">
          <div class="column-header stage-${stageSlug}">
            <div class="column-title">${stage}</div>
            <div class="column-count">${stageItems.length}</div>
          </div>
          <div class="column-list" id="column-${stage.replace(/[^a-zA-Z0-9]/g, "")}" data-stage="${stage}">
            ${stageItems.length === 0 ? `<div class="empty-column"><div class="empty-icon">+</div><div class="empty-text">Drop here or add new</div></div>` : ""}
          </div>
        </section>
      `;
    }).join("");

    visibleStages.forEach((stage) => {
      const id = `column-${stage.replace(/[^a-zA-Z0-9]/g, "")}`;
      const container = document.getElementById(id);
      const items = filtered.filter((a) => a.stage === stage);
      items.forEach((app) => container.appendChild(renderCard(app)));
    });

    bindKanbanDnD();
  }

  function renderCard(app) {
    const card = document.createElement("article");
    const urgency = getUrgency(app.deadline);
    card.className = `kanban-card urgent-${urgency}`;
    card.draggable = true;
    card.dataset.appId = app.id;

    const deadlineText = app.deadline ? formatDate(app.deadline) : "-";
    const stageSlug = String(app.stage || "applied").replace(/[^a-zA-Z0-9]/g, "").toLowerCase();

    card.innerHTML = `
      <div class="card-head-row">
        <div class="card-brand">
          <div>
            <p class="card-company">${escapeHtml(app.company || "Unknown Company")}</p>
            <p class="card-location">${escapeHtml(app.location || "No location")}</p>
          </div>
        </div>
        <details class="card-menu-wrap">
          <summary class="card-menu-btn" aria-label="Card actions">...</summary>
          <div class="card-menu">
            <button type="button" data-action="edit">Edit</button>
            <button type="button" data-action="delete">Delete</button>
          </div>
        </details>
      </div>

      <h4 class="card-title">${escapeHtml(app.role || "Untitled role")}</h4>

      <div class="card-meta-row">
        <span class="card-meta-item">${app.deadline ? `Due ${deadlineText}` : "No deadline"}</span>
        <span class="card-meta-item">ID ${escapeHtml(app.reqId || "N/A")}</span>
      </div>

      <div class="card-footer-row">
        <span class="stage-pill stage-pill-${stageSlug}">${escapeHtml(app.stage || "Applied")}</span>
        ${app.link ? `<a class="open-link-btn" href="${escapeAttr(app.link)}" target="_blank" rel="noopener noreferrer">Open</a>` : ""}
      </div>

      ${app.notes ? `<div class="card-notes">${escapeHtml(app.notes)}</div>` : ""}
    `;

    const editBtn = card.querySelector('[data-action="edit"]');
    const deleteBtn = card.querySelector('[data-action="delete"]');

    if (editBtn) {
      editBtn.addEventListener("click", () => openModal(app.id));
    }
    if (deleteBtn) {
      deleteBtn.addEventListener("click", () => deleteApplication(app.id));
    }

    // Quick edit: double-click a card to open it in edit mode.
    card.addEventListener("dblclick", () => {
      openModal(app.id);
    });

    card.addEventListener("dragstart", (event) => {
      event.dataTransfer.setData("text/plain", app.id);
      event.dataTransfer.effectAllowed = "move";
      card.classList.add("dragging");
    });

    card.addEventListener("dragend", () => {
      card.classList.remove("dragging");
    });

    return card;
  }

  function bindKanbanDnD() {
    document.querySelectorAll(".column-list").forEach((column) => {
      column.addEventListener("dragover", (event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
        column.classList.add("drag-over");
      });

      column.addEventListener("dragleave", () => {
        column.classList.remove("drag-over");
      });

      column.addEventListener("drop", (event) => {
        event.preventDefault();
        column.classList.remove("drag-over");

        const appId = event.dataTransfer.getData("text/plain");
        const targetStage = column.dataset.stage;
        if (!appId || !targetStage) {
          return;
        }

        moveApplicationToStage(appId, targetStage);
      });
    });
  }

  function moveApplicationToStage(appId, targetStage) {
    if (SUBMISSION_LOCKED) {
      showToast("App is locked for submission", "info");
      return;
    }

    const appIndex = state.applications.findIndex((item) => item.id === appId);
    if (appIndex < 0) {
      return;
    }

    const current = state.applications[appIndex];
    if (current.stage === targetStage) {
      return;
    }

    state.applications[appIndex] = {
      ...current,
      stage: targetStage,
      updatedAt: new Date().toISOString()
    };

    if (useFirebase && currentUserId) {
      FirebaseAPI.db.saveApplication(currentUserId, state.applications[appIndex])
        .catch((error) => {
          console.error("Failed to save dragged stage update:", error);
          showToast("Could not update stage in cloud", "error");
        });
    } else {
      saveApplications();
    }

    renderUI();
    showToast(`Moved to ${targetStage}`);
  }

  function deleteApplication(id) {
    if (SUBMISSION_LOCKED) {
      showToast("App is locked for submission", "info");
      return;
    }

    const app = state.applications.find((item) => item.id === id);
    if (!app) {
      return;
    }

    const shouldDelete = window.confirm(`Delete ${app.company} - ${app.role}?`);
    if (!shouldDelete) {
      return;
    }

    state.applications = state.applications.filter((item) => item.id !== id);
    
      if (useFirebase && currentUserId) {
        FirebaseAPI.db.deleteApplication(currentUserId, id)
          .then(() => {
            console.log('✅ Deleted from Firebase');
          })
          .catch((error) => {
            console.error('Firebase delete error:', error);
            showToast('Failed to delete from cloud', 'error');
          });
      } else {
        saveApplications();
      }
    
    renderUI();
    showToast("Application deleted");
  }

  async function onImportFileChange(event) {
    if (SUBMISSION_LOCKED) {
      showToast("App is locked for submission", "info");
      if (DOM.importFileInput) {
        DOM.importFileInput.value = "";
      }
      return;
    }

    const [file] = event.target.files || [];
    if (!file) {
      return;
    }

    try {
      const imported = await parseImportFile(file);
      if (!imported.length) {
        showToast("No valid rows found in file", "warning");
        return;
      }

      let added = 0;
      const savePromises = [];

      imported.forEach((entry) => {
        const normalized = normalizeImportedEntry(entry);
        if (!normalized.company || !normalized.role) {
          return;
        }

        const newApp = {
          ...createBlankApplication(),
          ...normalized,
          id: generateId(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        state.applications.unshift(newApp);
        added += 1;

        // Save each imported app to Firebase
        if (useFirebase && currentUserId) {
          savePromises.push(
            FirebaseAPI.db.saveApplication(currentUserId, newApp)
              .catch((error) => {
                console.error('Failed to save imported app to Firebase:', error);
              })
          );
        }
      });

      if (added === 0) {
        showToast("No rows imported. Ensure columns include job link or company/title", "warning");
      } else {
        // Wait for all Firebase saves to complete
        if (savePromises.length > 0) {
          await Promise.all(savePromises);
        } else {
          saveApplications();
        }
        renderUI();
        showToast(`Imported ${added} application(s)`);
      }
    } catch (error) {
      showToast(error.message || "Import failed", "error");
    } finally {
      DOM.importFileInput.value = "";
    }
  }

  async function parseImportFile(file) {
    const lowerName = file.name.toLowerCase();
    if (lowerName.endsWith(".txt")) {
      const text = await file.text();
      return parseCSVText(text);
    }

    if (lowerName.endsWith(".csv")) {
      const text = await file.text();
      return parseCSVText(text);
    }

    if (lowerName.endsWith(".xlsx") || lowerName.endsWith(".xls")) {
      if (typeof window.XLSX === "undefined") {
        throw new Error("Excel parser not available. Please retry with internet connection or use CSV.");
      }
      const buffer = await file.arrayBuffer();
      const workbook = window.XLSX.read(buffer, { type: "array" });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      return window.XLSX.utils.sheet_to_json(firstSheet, {
        defval: "",
        raw: false,
        dateNF: "yyyy-mm-dd"
      });
    }

    throw new Error("Unsupported file type. Please upload TXT or CSV file.");
  }

  function parseCSVText(text) {
    const lines = text.split(/\r?\n/).filter((line) => line.trim());
    if (lines.length < 2) {
      return [];
    }

    const headers = parseCSVRow(lines[0]);
    return lines.slice(1).map((line) => {
      const values = parseCSVRow(line);
      const row = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || "";
      });
      return row;
    });
  }

  function parseCSVRow(row) {
    const result = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < row.length; i += 1) {
      const char = row[i];
      const next = row[i + 1];

      if (char === '"') {
        if (inQuotes && next === '"') {
          current += '"';
          i += 1;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === "," && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }

    result.push(current.trim());
    return result;
  }

  function normalizeImportedEntry(raw) {
    const normalized = {};
    const map = {};

    Object.keys(raw).forEach((key) => {
      map[normalizeKey(key)] = raw[key];
    });

    const link = valueFromMap(map, ["joblink", "link", "url"]);
    const inferred = inferFromJobLink(link);

    normalized.link = link;
    normalized.company = valueFromMap(map, ["company", "companyname"]) || (inferred ? inferred.company : "");
    normalized.role = valueFromMap(map, ["jobtitle", "title", "role", "position"]) || (inferred ? inferred.role : "");
    normalized.location = valueFromMap(map, ["location", "city", "joblocation"]) || (inferred ? inferred.location : "");
    normalized.reqId = valueFromMap(map, ["reqid", "requisitionid", "requesitionid", "requisitionnumber", "fullrequisitionid", "jobid", "jobnumber", "referenceid", "referencenumber"]) || (inferred ? inferred.reqId : "");
    normalized.postingDate = toIsoDate(valueFromMap(map, ["jobpostingdate", "jobpostdate", "postingdate", "jobpost", "posteddate", "publicationdate", "publisheddate", "dateposted", "datepublished"]) || (inferred ? inferred.postingDate : ""));
    normalized.stage = valueFromMap(map, ["stage"]) || "Applied";
    normalized.appliedDate = toIsoDate(valueFromMap(map, ["applieddate", "dateapplied"]));
    normalized.deadline = toIsoDate(valueFromMap(map, ["selfdeadline", "deadline"]));
    normalized.contactType = valueFromMap(map, ["contacttype", "contactpersontype"]);
    normalized.contactName = valueFromMap(map, ["contactname", "contactperson", "contact"]);
    normalized.contact = [normalized.contactType, normalized.contactName].filter(Boolean).join(": ");
    normalized.notes = valueFromMap(map, ["notes", "remark", "comments"]);

    if (!STAGES.includes(normalized.stage)) {
      normalized.stage = "Applied";
    }

    return normalized;
  }

  function normalizeKey(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");
  }

  function valueFromMap(map, keys) {
    for (let i = 0; i < keys.length; i += 1) {
      const val = map[keys[i]];
      if (val !== undefined && val !== null && String(val).trim() !== "") {
        return String(val).trim();
      }
    }
    return "";
  }

  function exportToCSV() {
    if (!state.applications.length) {
      showToast("No applications to export", "warning");
      return;
    }

    const headers = [
      "Company",
      "Job Title",
      "Location",
      "Req ID",
      "Job Link",
      "Job Posting Date",
      "Stage",
      "Self Deadline",
      "Contact Type",
      "Contact Name",
      "Notes"
    ];

    const rows = state.applications.map((app) => [
      app.company || "",
      app.role || "",
      app.location || "",
      app.reqId || "",
      app.link || "",
      app.postingDate || "",
      app.stage || "",
      app.deadline || "",
      app.contactType || "",
      app.contactName || "",
      app.notes || ""
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.map(csvEscape).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `job-hunt-hq-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);

    showToast("Exported CSV successfully");
  }

  function downloadImportTemplate() {
    const headers = [
      "Job Link",
      "Company",
      "Job Title",
      "Location",
      "Req ID",
      "Job Posting Date",
      "Applied Date",
      "Stage",
      "Self Deadline",
      "Contact Type",
      "Contact Name",
      "Notes"
    ];

    const filenamePrefix = `job-hunt-hq-template-${new Date().toISOString().slice(0, 10)}`;

    if (typeof window.XLSX !== "undefined") {
      const worksheet = window.XLSX.utils.aoa_to_sheet([headers]);
      worksheet["!cols"] = [
        { wch: 34 },
        { wch: 22 },
        { wch: 24 },
        { wch: 18 },
        { wch: 16 },
        { wch: 16 },
        { wch: 14 },
        { wch: 14 },
        { wch: 14 },
        { wch: 16 },
        { wch: 22 },
        { wch: 34 }
      ];

      const workbook = window.XLSX.utils.book_new();
      window.XLSX.utils.book_append_sheet(workbook, worksheet, "Applications");
      window.XLSX.writeFile(workbook, `${filenamePrefix}.xlsx`);
      showToast("Downloaded Excel template");
      return;
    }

    const csv = headers.map(csvEscape).join(",");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${filenamePrefix}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    showToast("Downloaded CSV template");
  }

  function csvEscape(value) {
    const text = String(value ?? "");
    return `"${text.replace(/"/g, '""')}"`;
  }

  function editWeeklyGoal() {
    const raw = window.prompt("Set weekly application goal", String(state.currentWeeklyGoal));
    if (raw === null) {
      return;
    }

    const parsed = parseInt(raw, 10);
    if (Number.isNaN(parsed) || parsed < 1) {
      showToast("Please enter a valid positive number", "error");
      return;
    }

    state.currentWeeklyGoal = parsed;
    
      if (useFirebase && currentUserId) {
        FirebaseAPI.db.saveSettings(currentUserId, {
          theme: state.theme,
          weeklyGoal: state.currentWeeklyGoal
        }).catch((error) => {
          console.error('Settings save error:', error);
        });
      } else {
        safeStorageSet(GOAL_KEY, String(parsed));
      }
    
    renderGoal();
    showToast("Weekly goal updated");
  }

  function getFilteredApplications() {
    let filtered = [...state.applications];

    if (state.currentFilter !== "all") {
      filtered = filtered.filter((app) => app.stage === state.currentFilter);
    }

    if (state.currentCompanyFilter !== "all") {
      const selectedCompanyKey = normalizeCompanyKey(state.currentCompanyFilter);
      filtered = filtered.filter((app) => {
        const appCompanyKey = normalizeCompanyKey(app.company);
        return appCompanyKey.includes(selectedCompanyKey) || selectedCompanyKey.includes(appCompanyKey);
      });
    }

    if (state.searchQuery) {
      const q = state.searchQuery;
      filtered = filtered.filter((app) => {
        const hay = [
          app.company,
          app.role,
          app.contactType,
          app.contactName,
          app.notes
        ].join(" ").toLowerCase();
        return hay.includes(q);
      });
    }

    filtered.sort((a, b) => {
      switch (state.currentSort) {
        case "deadline-desc":
          return compareDates(a.deadline, b.deadline, false);
        case "date-desc":
          return compareDates(a.createdAt, b.createdAt, false);
        case "date-asc":
          return compareDates(a.createdAt, b.createdAt, true);
        case "company-asc":
          return String(a.company || "").localeCompare(String(b.company || ""));
        default:
          return compareDates(a.deadline, b.deadline, true);
      }
    });

    return filtered;
  }

  function compareDates(a, b, asc) {
    if (!a && !b) {
      return 0;
    }
    if (!a) {
      return 1;
    }
    if (!b) {
      return -1;
    }
    const diff = new Date(a) - new Date(b);
    return asc ? diff : -diff;
  }

  function getApplicationsThisWeek() {
    const now = new Date();
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    start.setDate(now.getDate() - now.getDay());

    return state.applications.filter((app) => {
      if (!app.createdAt) {
        return false;
      }
      return new Date(app.createdAt) >= start;
    });
  }

  function isFollowupDue(app) {
    if (!app.followupDate) {
      return false;
    }
    if (app.stage === "Rejected" || app.stage === "Offer") {
      return false;
    }
    return new Date(app.followupDate) <= new Date();
  }

  function getUrgency(deadline) {
    if (!deadline) {
      return "none";
    }
    const today = new Date();
    const target = new Date(deadline);
    const dayDiff = Math.ceil((target - today) / (1000 * 60 * 60 * 24));
    if (dayDiff <= 1) {
      return "critical";
    }
    if (dayDiff <= 7) {
      return "soon";
    }
    return "safe";
  }

  function createBlankApplication() {
    return {
      id: generateId(),
      company: "",
      role: "",
      link: "",
      location: "",
      reqId: "",
      postingDate: "",
      stage: "Applied",
      deadline: "",
      contactType: "",
      contactName: "",
      contact: "",
      notes: "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  function generateId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return window.crypto.randomUUID();
    }
    return `app_${Date.now()}_${Math.floor(Math.random() * 1000000)}`;
  }

  function loadApplications() {
      if (useFirebase) {
        // Firebase loads data after auth
        return [];
      }
    try {
      const raw = safeStorageGet(STORAGE_KEY);
      if (!raw) {
        return [];
      }
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function saveApplications() {
      if (useFirebase && currentUserId) {
        // Firebase saves handled per-application in saveApplicationFromForm
        return;
      }
    safeStorageSet(STORAGE_KEY, JSON.stringify(state.applications));
  }

  function getValue(id) {
    const el = document.getElementById(id);
    return el ? el.value : "";
  }

  function escapeHtml(value) {
    const div = document.createElement("div");
    div.textContent = String(value ?? "");
    return div.innerHTML;
  }

  function escapeAttr(value) {
    return escapeHtml(String(value ?? "")).replace(/"/g, "&quot;");
  }

  function showToast(message, type = "success") {
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.textContent = message;
    DOM.toastContainer.appendChild(toast);
    window.setTimeout(() => {
      toast.style.opacity = "0";
      window.setTimeout(() => toast.remove(), 280);
    }, 2400);
  }

  function toIsoDate(raw) {
    if (!raw) {
      return "";
    }
    const text = String(raw).trim();
    if (!text) {
      return "";
    }

    const extracted = extractDateFromString(text);
    if (extracted) {
      return extracted;
    }

    const parsed = new Date(text);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString().slice(0, 10);
    }

    return "";
  }

  function extractDateFromString(value) {
    if (!value) {
      return "";
    }
    const text = String(value);

    const ymd = text.match(/(20\d{2})[-/](0?[1-9]|1[0-2])[-/](0?[1-9]|[12]\d|3[01])/);
    if (ymd) {
      const y = ymd[1];
      const m = ymd[2].padStart(2, "0");
      const d = ymd[3].padStart(2, "0");
      return `${y}-${m}-${d}`;
    }

    const dmy = text.match(/(0?[1-9]|[12]\d|3[01])[-/](0?[1-9]|1[0-2])[-/](20\d{2})/);
    if (dmy) {
      const d = dmy[1].padStart(2, "0");
      const m = dmy[2].padStart(2, "0");
      const y = dmy[3];
      return `${y}-${m}-${d}`;
    }

    return "";
  }

  function toTitleCase(text) {
    return String(text || "")
      .split(" ")
      .filter(Boolean)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  }

  function formatDate(dateValue) {
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) {
      return "-";
    }
    return date.toLocaleDateString();
  }

    // ═══════════════════════════════════════════════════════════════
    // PUBLIC API FOR AUTH INTEGRATION
    // ═══════════════════════════════════════════════════════════════
    window.JobHuntApp = {
      setApplications: (applications) => {
        if (SUBMISSION_LOCKED) {
          state.applications = [];
          renderUI();
          return;
        }
        state.applications = applications;
        renderUI();
      },
      setTheme: (theme) => {
        if (theme !== "light" && theme !== "dark") {
          return;
        }
        state.theme = theme;
        safeStorageSet(THEME_KEY, theme);
        setupTheme();
        broadcastTheme(theme);
      },
      setWeeklyGoal: (goal) => {
        state.currentWeeklyGoal = goal;
        renderGoal();
      },
      setAuthUser: (user) => {
        if (!user) {
          currentUserId = null;
          useFirebase = false;
          state.applications = SUBMISSION_LOCKED ? [] : loadApplications();
          renderUI();
        }
        updateAccountStatusUI(user);
      },
      startGuestMode,
      init: loadUserDataAndRender
    };
})();
