(() => {
  const STORAGE_KEY = "job_hunt_hq_applications";
  const GOAL_KEY = "job_hunt_hq_weekly_goal";
  const THEME_KEY = "job_hunt_hq_theme";

  const STAGES = ["Wishlist", "Applied", "OA/Test", "Interview", "Rejected", "Offer"];

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
    setupTheme();
    bindEvents();
    renderUI();
  }

  function bindEvents() {
    addListener(DOM.themeToggle, "click", toggleTheme);
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
    safeStorageSet(THEME_KEY, state.theme);
    setupTheme();
    showToast(`Switched to ${state.theme} mode`);
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

      <form id="app-form" style="display:grid;gap:1rem;">
        <input type="hidden" id="form-id" value="${app.id}" />

        <div class="form-group">
          <label for="form-link">Job Link</label>
          <input type="url" id="form-link" placeholder="https://company.com/job/..." value="${escapeAttr(app.link)}" />
          <small class="text-muted">Autofills company, role, and posting date from link pattern.</small>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
          <div class="form-group">
            <label for="form-company">Company Name *</label>
            <input type="text" id="form-company" maxlength="120" required value="${escapeAttr(app.company)}" />
          </div>
          <div class="form-group">
            <label for="form-role">Job Title *</label>
            <input type="text" id="form-role" maxlength="200" required value="${escapeAttr(app.role)}" />
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
          <div class="form-group">
            <label for="form-posting-date">Job Posting Date</label>
            <input type="date" id="form-posting-date" value="${escapeAttr(app.postingDate || "")}" />
          </div>
          <div class="form-group">
            <label for="form-stage">Stage</label>
            <select id="form-stage">
              ${STAGES.map((stage) => `<option value="${stage}" ${app.stage === stage ? "selected" : ""}>${stage}</option>`).join("")}
            </select>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:1rem;">
          <div class="form-group">
            <label for="form-applied-date">Applied Date</label>
            <input type="date" id="form-applied-date" value="${escapeAttr(app.appliedDate || "")}" />
          </div>
          <div class="form-group">
            <label for="form-deadline">Self Deadline</label>
            <input type="date" id="form-deadline" value="${escapeAttr(app.deadline || "")}" />
          </div>
          <div class="form-group">
            <label for="form-followup">Follow-up Date</label>
            <input type="date" id="form-followup" value="${escapeAttr(app.followupDate || "")}" />
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
            <input type="text" id="form-contact-name" maxlength="120" value="${escapeAttr(app.contactName || "")}" placeholder="Name of HR/Friend/Employee" />
          </div>
        </div>

        <div class="form-group">
          <label for="form-notes">Notes</label>
          <textarea id="form-notes" maxlength="500" placeholder="Any notes...">${escapeHtml(app.notes || "")}</textarea>
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

    const linkInput = document.getElementById("form-link");
    linkInput.addEventListener("blur", () => applyLinkAutoFill(linkInput.value));
  }

  function closeModal() {
    state.editingId = null;
    DOM.modalBackdrop.classList.add("hidden");
  }

  function applyLinkAutoFill(rawLink) {
    const inferred = inferFromJobLink(rawLink);
    if (!inferred) {
      return;
    }

    const companyEl = document.getElementById("form-company");
    const roleEl = document.getElementById("form-role");
    const postingEl = document.getElementById("form-posting-date");

    if (companyEl && !companyEl.value.trim() && inferred.company) {
      companyEl.value = inferred.company;
    }
    if (roleEl && !roleEl.value.trim() && inferred.role) {
      roleEl.value = inferred.role;
    }
    if (postingEl && !postingEl.value && inferred.postingDate) {
      postingEl.value = inferred.postingDate;
    }
  }

  function inferFromJobLink(rawLink) {
    if (!rawLink) {
      return null;
    }

    try {
      const url = new URL(rawLink);
      const hostParts = url.hostname.replace("www.", "").split(".");
      const company = hostParts.length >= 2 ? toTitleCase(hostParts[hostParts.length - 2].replace(/[-_]/g, " ")) : "";

      const segments = url.pathname.split("/").filter(Boolean).map((part) => decodeURIComponent(part));
      const slug = segments[segments.length - 1] || "";
      const cleanSlug = slug
        .replace(/\.[a-zA-Z0-9]+$/, "")
        .replace(/[0-9]{3,}/g, " ")
        .replace(/[-_]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();

      const role = toTitleCase(cleanSlug);

      const postingDate = extractDateFromString(`${url.pathname} ${url.search}`);

      return {
        company: company || "",
        role: role || "",
        postingDate: postingDate || ""
      };
    } catch {
      return null;
    }
  }

  function saveApplicationFromForm(event) {
    event.preventDefault();

    const id = getValue("form-id");
    const company = getValue("form-company").trim();
    const role = getValue("form-role").trim();
    const link = getValue("form-link").trim();
    const postingDate = getValue("form-posting-date");
    const stage = getValue("form-stage") || "Applied";
    const appliedDate = getValue("form-applied-date");
    const deadline = getValue("form-deadline");
    const followupDate = getValue("form-followup");
    const contactType = getValue("form-contact-type");
    const contactName = getValue("form-contact-name").trim();
    const notes = getValue("form-notes").trim();

    if (!company || !role) {
      showToast("Company and Job Title are required", "error");
      return;
    }

    const payload = {
      id,
      company,
      role,
      link,
      postingDate,
      stage,
      appliedDate,
      deadline,
      followupDate,
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
      state.applications.unshift({
        ...payload,
        createdAt: new Date().toISOString()
      });
      showToast("Application added");
    }

    saveApplications();
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

    DOM.kanbanBoard.innerHTML = STAGES.map((stage) => {
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

    STAGES.forEach((stage) => {
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
    const appliedText = app.appliedDate ? formatDate(app.appliedDate) : "-";
    const deadlineText = app.deadline ? formatDate(app.deadline) : "-";

    card.innerHTML = `
      <div class="card-header">
        <div>
          <p class="card-company">${escapeHtml(app.company)}</p>
          <h4 class="card-title">${escapeHtml(app.role)}</h4>
        </div>
      </div>
      <div class="card-meta">
        <span class="card-meta-item">Post: ${postingText}</span>
        <span class="card-meta-item">Applied: ${appliedText}</span>
        <span class="card-meta-item">Deadline: ${deadlineText}</span>
      </div>
      ${app.followupDate ? `<div class="card-meta-item">Follow-up: ${formatDate(app.followupDate)}</div>` : ""}
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
    saveApplications();
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
    normalized.postingDate = toIsoDate(valueFromMap(map, ["jobpostingdate", "postingdate", "posteddate"]) || (inferred ? inferred.postingDate : ""));
    normalized.stage = valueFromMap(map, ["stage"]) || "Applied";
    normalized.appliedDate = toIsoDate(valueFromMap(map, ["applieddate", "dateapplied"]));
    normalized.deadline = toIsoDate(valueFromMap(map, ["selfdeadline", "deadline"]));
    normalized.followupDate = toIsoDate(
      valueFromMap(map, ["followupdate", "followup", "followupon", "nextfollowup"])
    );
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
      "Job Link",
      "Job Posting Date",
      "Stage",
      "Applied Date",
      "Self Deadline",
      "Follow-up Date",
      "Contact Type",
      "Contact Name",
      "Notes"
    ];

    const rows = state.applications.map((app) => [
      app.company || "",
      app.role || "",
      app.link || "",
      app.postingDate || "",
      app.stage || "",
      app.appliedDate || "",
      app.deadline || "",
      app.followupDate || "",
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
    safeStorageSet(GOAL_KEY, String(parsed));
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
      postingDate: "",
      stage: "Applied",
      appliedDate: "",
      deadline: "",
      followupDate: "",
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
})();
