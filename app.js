(() => {
  const STORAGE_KEY = "job_hunt_hq_applications";
  const GOAL_KEY = "job_hunt_hq_weekly_goal";
  const THEME_KEY = "job_hunt_hq_theme";

  const STAGES = ["Wishlist", "Applied", "OA/Test", "Interview", "Rejected", "Offer"];

    // Firebase state
    let currentUserId = null;
    let useFirebase = false;

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

  const state = {
    applications: loadApplications(),
    currentWeeklyGoal: parseInt(safeStorageGet(GOAL_KEY), 10) || 10,
    currentFilter: "all",
    currentSort: "deadline-asc",
    searchQuery: "",
    editingId: null,
    theme: safeStorageGet(THEME_KEY) || "dark"
  };

  const DOM = {
    toastContainer: document.getElementById("toast-container"),
    modalBackdrop: document.getElementById("modal-backdrop"),
    modalBox: document.getElementById("modal-box"),
    themeToggle: document.getElementById("theme-toggle"),
    themeIcon: document.getElementById("theme-icon"),
    accountStatus: document.getElementById("account-status"),
    accountSyncBtn: document.getElementById("account-sync-btn"),
    accountLogoutBtn: document.getElementById("account-logout-btn"),
    importBtn: document.getElementById("import-data-btn"),
    importFileInput: document.getElementById("import-file-input"),
    exportCsvBtn: document.getElementById("export-csv-btn"),
    openModalBtn: document.getElementById("open-modal-btn"),
    quoteShuffle: document.getElementById("quote-shuffle-btn"),
    goalBarFill: document.getElementById("goal-bar-fill"),
    goalText: document.getElementById("goal-text"),
    goalEditBtn: document.getElementById("goal-edit-btn"),
    statTotal: document.getElementById("stat-total"),
    statApplied: document.getElementById("stat-applied"),
    statInterview: document.getElementById("stat-interview"),
    statOffers: document.getElementById("stat-offers"),
    statFollowup: document.getElementById("stat-followup"),
    statResponse: document.getElementById("stat-response"),
    stageDistribution: document.getElementById("stage-distribution"),
    searchInput: document.getElementById("search-input"),
    sortSelect: document.getElementById("sort-select"),
    activeFilterBar: document.getElementById("active-filter-bar"),
    activeFilterLabel: document.getElementById("active-filter-label"),
    clearFilterBtn: document.getElementById("clear-filter-btn"),
    kanbanBoard: document.getElementById("kanban-board")
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
      }
      setupTheme();
      bindEvents();
      const currentUser = (typeof FirebaseAPI !== "undefined" && FirebaseAPI.auth && typeof FirebaseAPI.auth.getCurrentUser === "function")
        ? FirebaseAPI.auth.getCurrentUser()
        : null;
      updateAccountStatusUI(currentUser);
      renderUI();
  }

    // Called by auth.js after user signs in
    function loadUserDataAndRender(userId, applications) {
      currentUserId = userId;
      useFirebase = !!userId;
      if (applications) {
        state.applications = applications;
      }
      if (typeof FirebaseAPI !== "undefined" && FirebaseAPI.auth && typeof FirebaseAPI.auth.getCurrentUser === "function") {
        updateAccountStatusUI(FirebaseAPI.auth.getCurrentUser());
      }
      renderUI();
    }

  function bindEvents() {
    addListener(DOM.themeToggle, "click", toggleTheme);
    addListener(DOM.accountSyncBtn, "click", openAccountSyncFlow);
    addListener(DOM.accountLogoutBtn, "click", handleLogout);
    addListener(DOM.importBtn, "click", () => {
      if (DOM.importFileInput) {
        DOM.importFileInput.click();
      }
    });
    addListener(DOM.importFileInput, "change", onImportFileChange);
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
      state.searchQuery = e.target.value.trim().toLowerCase();
      renderFilterUI();
      renderKanban();
    });

    addListener(DOM.sortSelect, "change", (e) => {
      state.currentSort = e.target.value;
      renderKanban();
    });

    addListener(DOM.clearFilterBtn, "click", () => {
      state.currentFilter = "all";
      state.searchQuery = "";
      if (DOM.searchInput) {
        DOM.searchInput.value = "";
      }
      renderFilterUI();
      renderKanban();
    });

    document.querySelectorAll(".chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        state.currentFilter = chip.dataset.stage;
        renderFilterUI();
        renderKanban();
      });
    });

    document.querySelectorAll(".stat-tile").forEach((tile) => {
      tile.addEventListener("click", () => {
        const filter = tile.dataset.filter;
        if (filter === "responserate") {
          showToast("Response rate is calculated automatically", "info");
          return;
        }
        if (filter === "followup") {
          state.currentFilter = "all";
          state.searchQuery = "";
          if (DOM.searchInput) {
            DOM.searchInput.value = "";
          }
          renderFilterUI();
          renderKanban(true);
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

  function setupTheme() {
    document.documentElement.setAttribute("data-theme", state.theme);
    DOM.themeIcon.textContent = state.theme === "dark" ? "☀" : "🌙";
  }

  function toggleTheme() {
    state.theme = state.theme === "dark" ? "light" : "dark";
    
      if (useFirebase && currentUserId) {
        FirebaseAPI.db.saveSettings(currentUserId, {
          theme: state.theme,
          weeklyGoal: state.currentWeeklyGoal
        }).catch((error) => {
          console.error('Settings save error:', error);
        });
      } else {
        safeStorageSet(THEME_KEY, state.theme);
      }
    
    setupTheme();
    showToast(`Switched to ${state.theme} mode`);
  }

  function openAccountSyncFlow() {
    if (typeof FirebaseAPI === "undefined" || !FirebaseAPI.auth) {
      showToast("Firebase not ready yet", "warning");
      return;
    }

    DOM.modalBox.innerHTML = `
      <div class="auth-panel">
        <div class="auth-panel-title">Account Login & Sync</div>
        <div class="auth-panel-subtitle">Use one email account across browsers/devices. Existing guest data can be upgraded safely.</div>

        <div class="form-group">
          <label for="auth-email">Email</label>
          <input type="email" id="auth-email" placeholder="you@example.com" />
        </div>

        <div class="form-group">
          <label for="auth-password">Password</label>
          <input type="password" id="auth-password" placeholder="Minimum 6 characters" />
        </div>

        <div class="form-group" style="margin:0;display:flex;gap:0.5rem;align-items:flex-start;">
          <input type="checkbox" id="auth-upgrade-guest" checked />
          <label for="auth-upgrade-guest" style="margin:0;">If currently in guest mode, migrate all guest applications to this email account.</label>
        </div>

        <div id="auth-status" class="text-muted" style="font-size:var(--text-sm);min-height:1.2rem;"></div>

        <div class="auth-panel-actions">
          <button type="button" class="btn btn-secondary" id="auth-close-btn">Cancel</button>
          <button type="button" class="btn btn-primary" id="auth-signin-btn">Sign In</button>
          <button type="button" class="btn btn-secondary" id="auth-create-btn">Create Account</button>
          <button type="button" class="btn btn-primary" id="auth-upgrade-btn">Create & Migrate Guest Data</button>
        </div>
      </div>
    `;

    DOM.modalBackdrop.classList.remove("hidden");

    const emailEl = document.getElementById("auth-email");
    const passwordEl = document.getElementById("auth-password");
    const upgradeEl = document.getElementById("auth-upgrade-guest");
    const statusEl = document.getElementById("auth-status");
    const closeBtn = document.getElementById("auth-close-btn");
    const signInBtn = document.getElementById("auth-signin-btn");
    const createBtn = document.getElementById("auth-create-btn");
    const upgradeBtn = document.getElementById("auth-upgrade-btn");

    const setBusy = (busy, message = "") => {
      [signInBtn, createBtn, upgradeBtn, closeBtn, emailEl, passwordEl, upgradeEl].forEach((el) => {
        if (el) el.disabled = busy;
      });
      if (statusEl) {
        statusEl.textContent = message;
      }
    };

    const readCreds = () => {
      const email = (emailEl?.value || "").trim();
      const password = passwordEl?.value || "";
      if (!email || !email.includes("@")) {
        throw new Error("Enter a valid email");
      }
      if (!password || password.length < 6) {
        throw new Error("Password must be at least 6 characters");
      }
      return { email, password };
    };

    const mapAuthError = (error) => {
      const code = error && error.code ? error.code : "";
      if (code === "auth/email-already-in-use") return "Email already exists. Use Sign In.";
      if (code === "auth/wrong-password" || code === "auth/invalid-credential") return "Wrong email/password";
      if (code === "auth/user-not-found") return "Account not found. Create account first.";
      if (code === "auth/operation-not-allowed") return "Email/password provider is disabled in Firebase.";
      return (error && error.message) || "Authentication failed";
    };

    closeBtn?.addEventListener("click", closeModal);

    signInBtn?.addEventListener("click", async () => {
      try {
        const { email, password } = readCreds();
        setBusy(true, "Signing in...");
        await FirebaseAPI.auth.signInWithEmail(email, password);
        closeModal();
        showToast("Signed in. Syncing data from cloud...");
      } catch (error) {
        showToast(mapAuthError(error), "error");
        setBusy(false, "");
      }
    });

    createBtn?.addEventListener("click", async () => {
      try {
        const { email, password } = readCreds();
        setBusy(true, "Creating account...");
        await FirebaseAPI.auth.createUserWithEmail(email, password);
        closeModal();
        showToast("Account created successfully");
      } catch (error) {
        showToast(mapAuthError(error), "error");
        setBusy(false, "");
      }
    });

    upgradeBtn?.addEventListener("click", async () => {
      try {
        const { email, password } = readCreds();
        const shouldMigrate = Boolean(upgradeEl?.checked);
        setBusy(true, shouldMigrate ? "Migrating guest data to new account..." : "Creating account...");

        if (shouldMigrate) {
          await FirebaseAPI.auth.upgradeAnonymousToEmail(email, password);
          closeModal();
          showToast("Guest account upgraded and data migrated");
          return;
        }

        await FirebaseAPI.auth.createUserWithEmail(email, password);
        closeModal();
        showToast("Account created successfully");
      } catch (error) {
        showToast(mapAuthError(error), "error");
        setBusy(false, "");
      }
    });
  }

  async function handleLogout() {
    if (typeof FirebaseAPI === "undefined" || !FirebaseAPI.auth) {
      showToast("Firebase not ready yet", "warning");
      return;
    }

    try {
      await FirebaseAPI.auth.signOut();
      showToast("Logged out. Guest session will start automatically.", "info");
    } catch (error) {
      showToast((error && error.message) || "Logout failed", "error");
    }
  }

  function updateAccountStatusUI(user) {
    if (!DOM.accountStatus) return;
    if (!user) {
      DOM.accountStatus.textContent = "No session";
      return;
    }
    if (user.isAnonymous) {
      DOM.accountStatus.textContent = "Guest session";
      return;
    }
    DOM.accountStatus.textContent = user.email || "Email account";
  }

  function renderUI() {
    renderStats();
    renderGoal();
    renderStageDistribution();
    renderFilterUI();
    renderKanban();
  }

  function openModal(editId = null) {
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
          <label for="source-file-input">Attachment (.txt, .csv, .xlsx)</label>
          <input type="file" id="source-file-input" accept=".txt,.csv,.xlsx,.xls" />
        </div>

        <div style="display:flex;justify-content:flex-end;">
          <button type="button" class="btn btn-primary" id="extract-continue-btn">Extract and Continue</button>
        </div>
        <div id="extract-loader" class="extract-loader hidden" aria-live="polite">
          <span class="loader-spinner" aria-hidden="true"></span>
          <span id="extract-loader-text">Fetching job details...</span>
        </div>
        <small class="text-muted">Step 2 form will open after extraction. If extraction is partial, you can manually edit before saving.</small>
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

  function renderStats() {
    const apps = state.applications;
    const applied = apps.filter((a) => a.stage === "Applied").length;
    const interviews = apps.filter((a) => a.stage === "Interview").length;
    const offers = apps.filter((a) => a.stage === "Offer").length;
    const followupDue = apps.filter((a) => isFollowupDue(a)).length;
    const responseRate = apps.length > 0
      ? Math.round(((interviews + offers) / apps.length) * 100)
      : 0;

    DOM.statTotal.textContent = String(apps.length);
    DOM.statApplied.textContent = String(applied);
    DOM.statInterview.textContent = String(interviews);
    DOM.statOffers.textContent = String(offers);
    DOM.statFollowup.textContent = String(followupDue);
    DOM.statResponse.textContent = `${responseRate}%`;
  }

  function renderGoal() {
    const thisWeekCount = getApplicationsThisWeek().length;
    const percentage = Math.min(100, (thisWeekCount / state.currentWeeklyGoal) * 100);
    DOM.goalBarFill.style.width = `${percentage}%`;
    DOM.goalText.textContent = `${thisWeekCount} / ${state.currentWeeklyGoal} applications this week`;
  }

  function renderStageDistribution() {
    const total = state.applications.length;
    const stageColors = {
      Wishlist: "var(--stage-wishlist)",
      Applied: "var(--stage-applied)",
      "OA/Test": "var(--stage-oa)",
      Interview: "var(--stage-interview)",
      Rejected: "var(--stage-rejected)",
      Offer: "var(--stage-offer)"
    };

    if (total === 0) {
      DOM.stageDistribution.innerHTML = "<div class=\"stage-segment\" style=\"background:var(--urgent-none)\"></div>";
      return;
    }

    DOM.stageDistribution.innerHTML = STAGES
      .map((stage) => {
        const count = state.applications.filter((a) => a.stage === stage).length;
        if (!count) {
          return "";
        }
        return `<div class="stage-segment" style="flex:${count};background:${stageColors[stage]}" title="${stage}: ${count}"></div>`;
      })
      .join("");
  }

  function renderFilterUI() {
    document.querySelectorAll(".chip").forEach((chip) => {
      chip.classList.toggle("chip-active", chip.dataset.stage === state.currentFilter);
    });

    if (state.currentFilter !== "all" || state.searchQuery) {
      const label = state.currentFilter === "all"
        ? `Search: \"${state.searchQuery}\"`
        : `Stage: ${state.currentFilter}`;
      DOM.activeFilterLabel.textContent = label;
      DOM.activeFilterBar.removeAttribute("hidden");
    } else {
      DOM.activeFilterBar.setAttribute("hidden", "");
    }
  }

  function renderKanban(onlyFollowup = false) {
    const filtered = getFilteredApplications().filter((app) => (onlyFollowup ? isFollowupDue(app) : true));
    const visibleStages = state.currentFilter !== "all" ? [state.currentFilter] : STAGES;

    DOM.kanbanBoard.innerHTML = visibleStages.map((stage) => {
      const stageItems = filtered.filter((a) => a.stage === stage);
      return `
        <div class="kanban-column">
          <div class="column-header">
            <div class="column-title">${stage}</div>
            <div class="column-count">${stageItems.length}</div>
          </div>
          <div class="column-list" id="column-${stage.replace(/[^a-zA-Z0-9]/g, "")}">
            ${stageItems.length === 0 ? "<div class=\"text-muted\">No applications</div>" : ""}
          </div>
        </div>
      `;
    }).join("");

    visibleStages.forEach((stage) => {
      const id = `column-${stage.replace(/[^a-zA-Z0-9]/g, "")}`;
      const container = document.getElementById(id);
      const items = filtered.filter((a) => a.stage === stage);
      items.forEach((app) => container.appendChild(renderCard(app)));
    });
  }

  function renderCard(app) {
    const card = document.createElement("article");
    const urgency = getUrgency(app.deadline);
    card.className = `card urgent-${urgency}`;

    const postingText = app.postingDate ? formatDate(app.postingDate) : "-";
    const deadlineText = app.deadline ? formatDate(app.deadline) : "-";

    card.innerHTML = `
      <div class="card-header">
        <div>
          <p class="card-company">${escapeHtml(app.company)}${app.location ? ' &middot; ' + escapeHtml(app.location) : ''}</p>
          <h4 class="card-title">${escapeHtml(app.role)}</h4>
        </div>
      </div>
      <div class="card-meta">
        <span class="card-meta-item">Post: ${postingText}</span>
        <span class="card-meta-item">Deadline: ${deadlineText}</span>
      </div>
      ${app.reqId ? `<div class="card-meta-item">Requisition ID: ${escapeHtml(app.reqId)}</div>` : ""}
      ${app.contactType || app.contactName ? `<div class="card-meta-item">Contact: ${escapeHtml([app.contactType, app.contactName].filter(Boolean).join(" - "))}</div>` : ""}
      ${app.link ? `<a href="${escapeAttr(app.link)}" target="_blank" rel="noopener noreferrer">Open Job Link</a>` : ""}
      ${app.notes ? `<div class="card-notes">${escapeHtml(app.notes)}</div>` : ""}
      <div class="card-actions">
        <button type="button" data-action="edit">Edit</button>
        <button type="button" data-action="delete">Delete</button>
      </div>
    `;

    card.querySelector('[data-action="edit"]').addEventListener("click", () => openModal(app.id));
    card.querySelector('[data-action="delete"]').addEventListener("click", () => deleteApplication(app.id));

    return card;
  }

  function deleteApplication(id) {
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
      imported.forEach((entry) => {
        const normalized = normalizeImportedEntry(entry);
        if (!normalized.company || !normalized.role) {
          return;
        }

        state.applications.unshift({
          ...createBlankApplication(),
          ...normalized,
          id: generateId(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
        added += 1;
      });

      if (added === 0) {
        showToast("No rows imported. Ensure columns include job link or company/title", "warning");
      } else {
        saveApplications();
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

    throw new Error("Unsupported file type. Please upload CSV or Excel file.");
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
        state.applications = applications;
        renderUI();
      },
      setTheme: (theme) => {
        state.theme = theme;
        setupTheme();
      },
      setWeeklyGoal: (goal) => {
        state.currentWeeklyGoal = goal;
        renderGoal();
      },
      setAuthUser: (user) => {
        updateAccountStatusUI(user);
      },
      init: loadUserDataAndRender
    };
})();
