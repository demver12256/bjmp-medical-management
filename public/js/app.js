/**
 * BJMP Medical Officer Management System - Core Frontend Application
 * Fully responsive client handling RBAC, Clinical Workflows, Telemetry, and State Machines
 */

const API_BASE = "/api";

// Demo accounts for quick 1-click testing
const DEMO_ACCOUNTS = {
  doctor: { username: "dr.santos", role: "MedicalOfficer", title: "Medical Officer", name: "Dr. Maria Elena Santos, MD" },
  nurse: { username: "nurse.cruz", role: "Nurse", title: "Health Personnel / Nurse", name: "Nurse Juan Dela Cruz, RN" },
  officer: { username: "jo.gomez", role: "JailOfficer", title: "Jail Escort Officer", name: "JO2 Ricardo 'Cardo' Gomez" },
  admin: { username: "admin", role: "SystemAdministrator", title: "System Administrator", name: "Alexander Ramos, MIT" }
};

// Dedicated Page Route per Role
const ROLE_ROUTES = {
  MedicalOfficer: "/medical-officer",
  Nurse: "/nurse",
  JailOfficer: "/jail-officer",
  SystemAdministrator: "/admin"
};

const appState = {
  token: localStorage.getItem("bjmp_token") || null,
  currentUser: null,
  activeTab: "overview",
  pdls: [],
  referrals: [],
  requests: [],
  prescriptions: [],
  auditLogs: [],
  activeAlerts: [],
  selectedPdl: null,
  selectedRecord: null,
  pollTimer: null
};

// ==========================================
// API HELPER
// ==========================================
async function apiCall(endpoint, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };

  if (appState.token) {
    headers["Authorization"] = `Bearer ${appState.token}`;
  }

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers
    });

    const data = await response.json();

    if (!response.ok) {
      if (response.status === 401 && !endpoint.includes("/auth/login")) {
        handleLogout();
      }
      throw new Error(data.message || (data.errors && data.errors.join(", ")) || "API Request Failed");
    }

    return data;
  } catch (error) {
    console.error(`API Error [${endpoint}]:`, error);
    throw error;
  }
}

// ==========================================
// TOAST NOTIFICATIONS
// ==========================================
function showToast(message, type = "info") {
  const container = document.getElementById("toastContainer");
  if (!container) return;

  const toast = document.createElement("div");
  const bgColors = {
    success: "bg-emerald-600/95 border-emerald-400 text-white",
    error: "bg-red-600/95 border-red-400 text-white",
    warning: "bg-amber-600/95 border-amber-300 text-white",
    info: "bg-blue-600/95 border-blue-400 text-white"
  };

  const icons = {
    success: "✓",
    error: "✕",
    warning: "⚠",
    info: "ℹ"
  };

  toast.className = `flex items-center gap-3 px-4 py-3 rounded-lg shadow-xl border text-sm font-medium transition-all duration-300 transform translate-y-2 opacity-0 ${bgColors[type] || bgColors.info}`;
  toast.innerHTML = `
    <span class="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center font-bold text-xs">${icons[type]}</span>
    <span class="flex-1">${message}</span>
  `;

  container.appendChild(toast);
  requestAnimationFrame(() => {
    toast.classList.remove("translate-y-2", "opacity-0");
  });

  setTimeout(() => {
    toast.classList.add("opacity-0", "translate-y-2");
    setTimeout(() => toast.remove(), 300);
  }, 4500);
}

// ==========================================
// AUTHENTICATION & QUICK ROLE SWITCHER
// ==========================================
async function quickLogin(roleKey) {
  const account = DEMO_ACCOUNTS[roleKey];
  if (!account) return;

  const passwords = {
    doctor: "Doctor123!",
    nurse: "Nurse123!",
    officer: "Officer123!",
    admin: "Admin123!"
  };

  try {
    const res = await apiCall("/auth/login", {
      method: "POST",
      body: JSON.stringify({
        username: account.username,
        password: passwords[roleKey]
      })
    });

    appState.token = res.token;
    appState.currentUser = res.user;
    localStorage.setItem("bjmp_token", res.token);
    localStorage.setItem("bjmp_user", JSON.stringify(res.user));

    const targetUrl = ROLE_ROUTES[res.user.role] || "/medical-officer";
    if (window.location.pathname !== targetUrl) {
      window.location.href = targetUrl;
      return;
    }

    updateUserInterface();
    showToast(`Logged in as ${res.user.full_name} (${res.user.role})`, "success");
    await loadInitialData();
  } catch (err) {
    showToast(`Login failed: ${err.message}`, "error");
  }
}

async function handleCustomLogin(e) {
  e.preventDefault();
  const username = document.getElementById("loginUsername").value;
  const password = document.getElementById("loginPassword").value;

  try {
    const res = await apiCall("/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password })
    });

    appState.token = res.token;
    appState.currentUser = res.user;
    localStorage.setItem("bjmp_token", res.token);
    localStorage.setItem("bjmp_user", JSON.stringify(res.user));

    const targetUrl = ROLE_ROUTES[res.user.role] || "/medical-officer";
    window.location.href = targetUrl;
  } catch (err) {
    showToast(err.message, "error");
  }
}

async function handleLogout() {
  try {
    await fetch(`${API_BASE}/auth/logout`, { method: "POST" });
  } catch (e) {}
  appState.token = null;
  appState.currentUser = null;
  localStorage.removeItem("bjmp_token");
  localStorage.removeItem("bjmp_user");
  window.location.href = "/login";
}

function updateUserInterface() {
  const pageRole = window.PAGE_ROLE || null;
  const userNameEl = document.getElementById("currentUserName");
  const userRoleEl = document.getElementById("currentUserRole");
  const userDetailEl = document.getElementById("currentUserDetail");
  const userAvatarEl = document.getElementById("currentUserAvatar");

  // If on Login page and already logged in, redirect to user's dedicated role page
  if (pageRole === "Login") {
    if (appState.token && appState.currentUser && ROLE_ROUTES[appState.currentUser.role]) {
      window.location.href = ROLE_ROUTES[appState.currentUser.role];
    }
    return;
  }

  // If on a protected role page and not logged in, redirect to /login
  if (!appState.token || !appState.currentUser) {
    window.location.href = "/login";
    return;
  }

  const user = appState.currentUser;

  // Enforce role isolation: if logged-in user visits another role's page, redirect to their own page
  if (pageRole && pageRole !== user.role && ROLE_ROUTES[user.role]) {
    window.location.href = ROLE_ROUTES[user.role];
    return;
  }

  if (userNameEl) userNameEl.innerText = user.full_name;
  if (userRoleEl) {
    const roleColors = {
      MedicalOfficer: "bg-blue-500/20 text-blue-300 border-blue-500/40",
      Nurse: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
      JailOfficer: "bg-amber-500/20 text-amber-300 border-amber-500/40",
      SystemAdministrator: "bg-purple-500/20 text-purple-300 border-purple-500/40"
    };
    userRoleEl.className = `px-2 py-0.5 text-xs font-semibold rounded border ${roleColors[user.role] || "bg-gray-500/20 text-gray-300"}`;
    userRoleEl.innerText = user.role;
  }

  if (userAvatarEl) {
    const avatarInitials = {
      MedicalOfficer: "MD",
      Nurse: "RN",
      JailOfficer: "JO",
      SystemAdministrator: "IT"
    };
    const avatarStyles = {
      MedicalOfficer: "bg-blue-600/30 border-blue-500/40 text-blue-300",
      Nurse: "bg-emerald-600/30 border-emerald-500/40 text-emerald-300",
      JailOfficer: "bg-amber-600/30 border-amber-500/40 text-amber-300",
      SystemAdministrator: "bg-purple-600/30 border-purple-500/40 text-purple-300"
    };
    userAvatarEl.className = `w-8 h-8 rounded-lg border flex items-center justify-center font-bold text-xs ${avatarStyles[user.role] || avatarStyles.MedicalOfficer}`;
    userAvatarEl.innerText = avatarInitials[user.role] || "BJ";
  }

  if (userDetailEl) {
    if (user.license_number) {
      userDetailEl.innerText = `PRC Lic: ${user.license_number} | ${user.specialization || "Physician"}`;
    } else if (user.badge_number) {
      userDetailEl.innerText = `Badge: ${user.badge_number} | ID: ${user.personnel_id || "N/A"}`;
    } else {
      userDetailEl.innerText = `Personnel ID: ${user.personnel_id || user.username}`;
    }
  }
}

// ==========================================
// TAB SWITCHING (Role-Specific Sub-Tabs)
// ==========================================
function switchTab(tabName) {
  appState.activeTab = tabName;
  const tabs = ["medical", "nurse", "jail", "admin", "referrals", "prescriptions", "requests", "directory", "audits", "telemetry"];
  tabs.forEach((t) => {
    const btn = document.getElementById(`tabBtn_${t}`);
    const panel = document.getElementById(`tabPanel_${t}`);
    if (btn) {
      if (t === tabName) {
        btn.classList.add("bg-blue-600/30", "text-blue-400", "border-blue-500/50");
        btn.classList.remove("text-slate-400", "border-transparent");
      } else {
        btn.classList.remove("bg-blue-600/30", "text-blue-400", "border-blue-500/50");
        btn.classList.add("text-slate-400", "border-transparent");
      }
    }
    if (panel) {
      if (t === tabName) panel.classList.remove("hidden");
      else panel.classList.add("hidden");
    }
  });

  if (tabName === "telemetry" && window.vitalMonitor) {
    setTimeout(() => {
      const c = document.getElementById("ecgCanvas");
      if (c) window.vitalMonitor.init(c);
    }, 100);
  }
}

// ==========================================
// DATA FETCHING & RENDERING (Role-Scoped)
// ==========================================
async function loadInitialData() {
  if (!appState.currentUser || window.PAGE_ROLE === "Login") return;
  const role = appState.currentUser.role;

  const tasks = [
    fetchPdls(),
    fetchReferrals(),
    fetchRequests(),
    fetchPrescriptions(),
    fetchAlerts()
  ];

  if (role === "SystemAdministrator") {
    tasks.push(fetchAuditLogs(), fetchAdminOverview());
  }

  await Promise.allSettled(tasks);
  startAlertPolling();
}

async function fetchPdls(query = "") {
  try {
    const res = await apiCall(`/pdls?q=${encodeURIComponent(query)}`);
    appState.pdls = res.data || [];
    renderDoctorQueue();
    renderNurseRegistry();
    renderJailPdlSelect();
    renderJailDirectory();
    updateStatCounts();
  } catch (e) {
    console.error("Fetch PDLs error:", e);
  }
}

async function fetchReferrals() {
  try {
    const res = await apiCall("/referrals");
    appState.referrals = res.data || [];
    renderReferralsTable();
    renderJailEscortBoard();
    updateStatCounts();
  } catch (e) {
    console.error("Fetch Referrals error:", e);
  }
}

async function fetchRequests() {
  try {
    const res = await apiCall("/requests");
    appState.requests = res.data || [];
    renderRequestsTable();
    updateStatCounts();
  } catch (e) {
    console.error("Fetch Requests error:", e);
  }
}

async function fetchPrescriptions() {
  try {
    const res = await apiCall("/clinical/prescriptions");
    appState.prescriptions = res.data || [];
    renderPrescriptionsTable();
    updateStatCounts();
  } catch (e) {
    console.error("Fetch Prescriptions error:", e);
  }
}

async function fetchAuditLogs() {
  try {
    const res = await apiCall("/admin/audit-logs?limit=50");
    appState.auditLogs = res.data || [];
    renderAuditLogsTable();
  } catch (e) {
    console.error("Fetch Audit Logs error:", e);
  }
}

async function fetchAdminOverview() {
  if (!appState.currentUser || appState.currentUser.role !== "SystemAdministrator") return;
  try {
    const res = await apiCall("/admin/overview");
    renderAdminOverview(res.data);
  } catch (e) {
    console.error("Fetch admin overview error:", e);
  }
}

async function fetchAlerts() {
  try {
    const res = await apiCall("/alerts");
    appState.activeAlerts = res.data || [];
    handleActiveAlerts(appState.activeAlerts);
  } catch (e) {
    console.error("Fetch alerts error:", e);
  }
}

function startAlertPolling() {
  if (appState.pollTimer) clearInterval(appState.pollTimer);
  appState.pollTimer = setInterval(async () => {
    if (appState.token) {
      await fetchAlerts();
    }
  }, 4000);
}

// ==========================================
// VITAL ALARM BANNER & ACKNOWLEDGEMENT
// ==========================================
function handleActiveAlerts(alerts) {
  const banner = document.getElementById("vitalAlarmBanner");
  const countBadge = document.getElementById("alertCountBadge");
  if (!banner) return;

  if (alerts && alerts.length > 0) {
    const latest = alerts[0];
    banner.classList.remove("hidden");
    banner.classList.add("vital-alarm-active");

    const pdlEl = document.getElementById("alarmPdlInfo");
    const reasonEl = document.getElementById("alarmReason");
    const latencyEl = document.getElementById("alarmLatency");

    if (pdlEl) pdlEl.innerText = `${latest.pdl_name} (${latest.pdl_number}) - Cell: ${latest.cell_number}`;
    if (reasonEl) reasonEl.innerText = latest.trigger_reason;
    if (latencyEl) latencyEl.innerText = `${latest.dispatch_latency_ms || 18.2} ms`;

    const ackBtn = document.getElementById("acknowledgeAlarmBtn");
    if (ackBtn) {
      ackBtn.onclick = () => acknowledgeAlert(latest.alert_id);
    }

    if (countBadge) {
      countBadge.innerText = alerts.length;
      countBadge.classList.remove("hidden");
    }

    if (window.vitalMonitor && window.vitalMonitor.currentState !== "SENDING") {
      window.vitalMonitor.setAlarm(latest);
    }
  } else {
    banner.classList.add("hidden");
    banner.classList.remove("vital-alarm-active");
    if (countBadge) countBadge.classList.add("hidden");
    if (window.vitalMonitor && window.vitalMonitor.currentState === "SENDING") {
      window.vitalMonitor.clearAlarm();
    }
  }
}

async function acknowledgeAlert(alertId) {
  try {
    await apiCall(`/alerts/${alertId}/acknowledge`, { method: "POST" });
    showToast("Vital spike alert acknowledged. Alert transitioned to SILENT.", "info");
    if (window.vitalMonitor) window.vitalMonitor.clearAlarm();
    await fetchAlerts();
  } catch (err) {
    showToast(`Failed to acknowledge alert: ${err.message}`, "error");
  }
}

async function triggerSimulation(scenario) {
  try {
    const res = await apiCall("/alerts/simulate", {
      method: "POST",
      body: JSON.stringify({ scenario })
    });
    showToast(res.message, "warning");
    await fetchAlerts();
    switchTab("telemetry");
  } catch (err) {
    showToast(err.message, "error");
  }
}

// ==========================================
// RENDERERS
// ==========================================
function updateStatCounts() {
  const pendingExams = appState.pdls.filter((p) => p.medicalRecord && ["PENDING EVALUATION", "UNDER EXAMINATION"].includes(p.medicalRecord.case_status)).length;
  const activeTreatments = appState.pdls.filter((p) => p.medicalRecord && p.medicalRecord.case_status === "UNDER TREATMENT").length;
  const activeReferrals = appState.referrals.filter((r) => r.referral_status !== "Discharged").length;
  const pendingRequests = appState.requests.filter((r) => r.request_status === "Pending").length;
  const reviewedRequests = appState.requests.filter((r) => r.request_status === "Reviewed").length;
  const pendingRx = appState.prescriptions.filter((rx) => rx.prescription_status === "Pending").length;

  const docPendingEl = document.getElementById("statDocPending");
  const docTreatEl = document.getElementById("statDocTreatments");
  const docRefEl = document.getElementById("statDocReferrals");
  const docReqEl = document.getElementById("statDocRequests");
  const nurseTotalEl = document.getElementById("statNurseTotalPdls");
  const nurseRxEl = document.getElementById("statNursePendingRx");
  const jailReviewedEl = document.getElementById("statJailReviewedReqs");

  if (docPendingEl) docPendingEl.innerText = pendingExams;
  if (docTreatEl) docTreatEl.innerText = activeTreatments;
  if (docRefEl) docRefEl.innerText = activeReferrals;
  if (docReqEl) docReqEl.innerText = pendingRequests;
  if (nurseTotalEl) nurseTotalEl.innerText = appState.pdls.length;
  if (nurseRxEl) nurseRxEl.innerText = pendingRx;
  if (jailReviewedEl) jailReviewedEl.innerText = reviewedRequests;
}

// Status Badge Styling Helper
function getStatusBadge(status) {
  const styles = {
    "Case Created": "bg-slate-700/60 text-slate-300 border-slate-500/40",
    "PENDING EVALUATION": "bg-amber-500/20 text-amber-300 border-amber-500/40",
    "UNDER EXAMINATION": "bg-blue-500/20 text-blue-300 border-blue-500/40",
    "UNDER TREATMENT": "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
    "REFERRAL PENDING": "bg-rose-500/20 text-rose-300 border-rose-500/40",
    "OUTPATIENT REFERRAL": "bg-purple-500/20 text-purple-300 border-purple-500/40",
    "RECOVERY & OBSERVATION": "bg-teal-500/20 text-teal-300 border-teal-500/40",
    "RESOLVED (CLOSED)": "bg-gray-600/30 text-gray-400 border-gray-600/40",
    Drafted: "bg-slate-600/30 text-slate-300 border-slate-500/30",
    "Escort Requested": "bg-amber-500/20 text-amber-300 border-amber-500/40",
    "Warden Approved": "bg-cyan-500/20 text-cyan-300 border-cyan-500/40",
    "Outpatient Referred": "bg-purple-500/20 text-purple-300 border-purple-500/40",
    Discharged: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
    Pending: "bg-amber-500/20 text-amber-300 border-amber-500/40",
    Reviewed: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
    Dispensed: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
    Active: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
    Inactive: "bg-rose-500/20 text-rose-300 border-rose-500/40",
    Urgent: "bg-red-500/20 text-red-300 border-red-500/50 font-bold",
    Normal: "bg-slate-500/20 text-slate-300 border-slate-500/30"
  };

  const currentClass = styles[status] || "bg-slate-700/50 text-slate-300 border-slate-600/40";
  return `<span class="px-2.5 py-0.5 text-xs font-semibold rounded-full border ${currentClass}">${status}</span>`;
}

// 1. Doctor Examination Queue
function renderDoctorQueue() {
  const container = document.getElementById("doctorQueueTableBody");
  if (!container) return;

  if (appState.pdls.length === 0) {
    container.innerHTML = `<tr><td colspan="6" class="px-6 py-8 text-center text-slate-400">No PDL patients currently loaded.</td></tr>`;
    return;
  }

  container.innerHTML = appState.pdls
    .map((pdl) => {
      const rec = pdl.medicalRecord || {};
      const status = rec.case_status || "PENDING EVALUATION";
      return `
      <tr class="hover:bg-slate-800/40 transition-colors border-b border-slate-800">
        <td class="px-5 py-4 font-mono font-medium text-slate-200">${pdl.pdl_number}</td>
        <td class="px-5 py-4">
          <div class="font-bold text-white">${pdl.full_name}</div>
          <div class="text-xs text-slate-400">DOB: ${pdl.date_of_birth} | ${pdl.cell_number}</div>
        </td>
        <td class="px-5 py-4">
          <div class="text-xs text-slate-300 max-w-xs truncate" title="${rec.medical_history || 'None'}">
            <span class="text-slate-400">Hx:</span> ${rec.medical_history || 'None'}
          </div>
          <div class="text-xs text-rose-400 font-semibold truncate" title="${rec.allergies || 'NKDA'}">
            <span class="text-slate-400">Allergies:</span> ${rec.allergies || 'NKDA'}
          </div>
        </td>
        <td class="px-5 py-4">${getStatusBadge(status)}</td>
        <td class="px-5 py-4">
          <span class="text-xs text-slate-300">${pdl.assigned_facility}</span>
        </td>
        <td class="px-5 py-4 text-right space-x-2">
          <button onclick="openExaminationModal(${pdl.pdl_id})" class="px-3 py-1.5 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-500 text-white shadow-md transition-all">
            Examine / Decide
          </button>
          <button onclick="openPrintableAbstract(${pdl.pdl_id})" class="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 border border-slate-600 transition-all" title="Print Clinical Abstract">
            🖨️ Abstract
          </button>
        </td>
      </tr>
    `;
    })
    .join("");
}

// 2. Nurse PDL Registry & Triage List
function renderNurseRegistry() {
  const container = document.getElementById("nurseRegistryTableBody");
  if (!container) return;

  container.innerHTML = appState.pdls
    .map((pdl) => {
      const rec = pdl.medicalRecord || {};
      return `
      <tr class="hover:bg-slate-800/40 transition-colors border-b border-slate-800">
        <td class="px-5 py-4 font-mono font-medium text-slate-200">${pdl.pdl_number}</td>
        <td class="px-5 py-4 font-bold text-white">${pdl.full_name}</td>
        <td class="px-5 py-4 text-xs text-slate-300">${pdl.cell_number} (${pdl.assigned_facility})</td>
        <td class="px-5 py-4">${getStatusBadge(rec.case_status || "PENDING EVALUATION")}</td>
        <td class="px-5 py-4 text-right space-x-2">
          <button onclick="openTriageModal(${pdl.pdl_id})" class="px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-md transition-all">
            + Triage Vitals
          </button>
          <button onclick="openObservationModal(${pdl.pdl_id})" class="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 border border-slate-600 transition-all">
            + Observation
          </button>
        </td>
      </tr>
    `;
    })
    .join("");
}

function renderJailPdlSelect() {
  const select = document.getElementById("requestPdlSelect");
  if (!select) return;
  select.innerHTML = '<option value="">-- Choose PDL under custody --</option>' +
    appState.pdls.map((p) => `<option value="${p.pdl_id}">${p.pdl_number} - ${p.full_name} (${p.cell_number})</option>`).join("");
}

function renderJailDirectory() {
  const container = document.getElementById("jailDirectoryTableBody");
  if (!container) return;

  if (appState.pdls.length === 0) {
    container.innerHTML = `<tr><td colspan="5" class="px-6 py-6 text-center text-slate-400">No PDLs found.</td></tr>`;
    return;
  }

  container.innerHTML = appState.pdls
    .map((pdl) => {
      const rec = pdl.medicalRecord || {};
      return `
      <tr class="hover:bg-slate-800/40 transition-colors border-b border-slate-800">
        <td class="px-5 py-4 font-mono font-medium text-slate-200">${pdl.pdl_number}</td>
        <td class="px-5 py-4 font-bold text-white">${pdl.full_name}</td>
        <td class="px-5 py-4 text-xs text-amber-300 font-mono">${pdl.cell_number}</td>
        <td class="px-5 py-4 text-xs text-slate-300">${pdl.assigned_facility}</td>
        <td class="px-5 py-4">${getStatusBadge(rec.case_status || "PENDING EVALUATION")}</td>
      </tr>
    `;
    })
    .join("");
}

// 3. Hospital Referrals
function renderReferralsTable() {
  const container = document.getElementById("referralsTableBody");
  if (!container) return;

  if (appState.referrals.length === 0) {
    container.innerHTML = `<tr><td colspan="6" class="px-6 py-6 text-center text-slate-400">No hospital referrals recorded yet.</td></tr>`;
    return;
  }

  container.innerHTML = appState.referrals
    .map((ref) => {
      const patient = ref.medicalRecord && ref.medicalRecord.pdl ? ref.medicalRecord.pdl : { full_name: "PDL Patient", pdl_number: "N/A" };
      const doctor = ref.authorizer ? ref.authorizer.full_name : "Medical Officer";
      const escort = ref.escortOfficer ? `${ref.escortOfficer.full_name} (${ref.escortOfficer.badge_number || 'JO'})` : "Pending Assignment";

      return `
      <tr class="hover:bg-slate-800/40 transition-colors border-b border-slate-800">
        <td class="px-5 py-4 font-mono font-medium text-slate-300">#REF-${ref.referral_id}</td>
        <td class="px-5 py-4">
          <div class="font-bold text-white">${patient.full_name}</div>
          <div class="text-xs text-slate-400 font-mono">${patient.pdl_number}</div>
        </td>
        <td class="px-5 py-4">
          <div class="font-semibold text-slate-200">${ref.destination_hospital}</div>
          <div class="text-xs text-slate-400 truncate max-w-xs" title="${ref.reason}">${ref.reason}</div>
        </td>
        <td class="px-5 py-4">${getStatusBadge(ref.referral_status)}</td>
        <td class="px-5 py-4 text-xs">
          <div class="text-slate-300"><span class="text-slate-400">Escort:</span> ${escort}</div>
          <div class="text-slate-400"><span class="text-slate-500">Vehicle:</span> ${ref.vehicle_plate || 'Unassigned'}</div>
        </td>
        <td class="px-5 py-4 text-right">
          <button onclick="openEscortModal(${ref.referral_id})" class="px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-all">
            Escort / Status
          </button>
        </td>
      </tr>
    `;
    })
    .join("");
}

// 4. Jail Officer Escort Board
function renderJailEscortBoard() {
  const container = document.getElementById("jailEscortBoardBody");
  if (!container) return;

  container.innerHTML = appState.referrals
    .map((ref) => {
      const patient = ref.medicalRecord && ref.medicalRecord.pdl ? ref.medicalRecord.pdl : { full_name: "PDL Patient", pdl_number: "N/A", cell_number: "N/A" };
      return `
      <tr class="hover:bg-slate-800/40 transition-colors border-b border-slate-800">
        <td class="px-5 py-4 font-mono font-bold text-blue-400">REF-${ref.referral_id}</td>
        <td class="px-5 py-4">
          <div class="font-bold text-white">${patient.full_name}</div>
          <div class="text-xs text-slate-400 font-mono">${patient.pdl_number} | ${patient.cell_number}</div>
        </td>
        <td class="px-5 py-4 font-semibold text-slate-200">${ref.destination_hospital}</td>
        <td class="px-5 py-4">${getStatusBadge(ref.referral_status)}</td>
        <td class="px-5 py-4 font-mono text-xs text-amber-300">${ref.vehicle_plate || "UNASSIGNED"}</td>
        <td class="px-5 py-4 text-right">
          <button onclick="openEscortModal(${ref.referral_id})" class="px-3 py-1.5 text-xs font-bold rounded-lg bg-amber-600 hover:bg-amber-500 text-white shadow-md">
            Dispatch / Update
          </button>
        </td>
      </tr>
    `;
    })
    .join("");
}

// 5. Checkup Requests
function renderRequestsTable() {
  const container = document.getElementById("requestsTableBody");
  const jailContainer = document.getElementById("jailRequestsTableBody");

  const markup = appState.requests.length === 0
    ? `<tr><td colspan="5" class="px-6 py-6 text-center text-slate-400">No medical checkup requests submitted yet.</td></tr>`
    : appState.requests
        .map((req) => {
          const patient = req.pdl || { full_name: "PDL Patient", pdl_number: "N/A", cell_number: "N/A" };
          const requester = req.requester ? req.requester.full_name : "Jail Officer";
          return `
          <tr class="hover:bg-slate-800/40 transition-colors border-b border-slate-800">
            <td class="px-5 py-4">
              <div class="font-bold text-white">${patient.full_name}</div>
              <div class="text-xs text-slate-400 font-mono">${patient.pdl_number} (${patient.cell_number})</div>
            </td>
            <td class="px-5 py-4 text-xs text-slate-300">${req.reason_for_request}</td>
            <td class="px-5 py-4">${getStatusBadge(req.priority)}</td>
            <td class="px-5 py-4">${getStatusBadge(req.request_status)}</td>
            <td class="px-5 py-4 text-right">
              ${req.request_status === "Pending" ? `
                <button onclick="updateRequestStatus(${req.request_id}, 'Reviewed')" class="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white">
                  Mark Reviewed
                </button>
              ` : `<span class="text-xs text-slate-500">Processed</span>`}
            </td>
          </tr>
        `;
        })
        .join("");

  if (container) container.innerHTML = markup;
  if (jailContainer) jailContainer.innerHTML = markup;
}

// 6. Prescriptions
function renderPrescriptionsTable() {
  const container = document.getElementById("prescriptionsTableBody");
  if (!container) return;

  if (appState.prescriptions.length === 0) {
    container.innerHTML = `<tr><td colspan="6" class="px-6 py-6 text-center text-slate-400">No prescriptions recorded.</td></tr>`;
    return;
  }

  container.innerHTML = appState.prescriptions
    .map((rx) => {
      const patient = rx.treatment && rx.treatment.diagnosis && rx.treatment.diagnosis.medicalRecord && rx.treatment.diagnosis.medicalRecord.pdl
        ? rx.treatment.diagnosis.medicalRecord.pdl
        : { full_name: "PDL Patient", pdl_number: "N/A" };
      const meds = (rx.medications || []).map((m) => `• <b>${m.medication_name}</b> (${m.dosage}) - ${m.instructions}`).join("<br/>");
      const doctor = rx.authorizer ? rx.authorizer.full_name : "Medical Officer";

      return `
      <tr class="hover:bg-slate-800/40 transition-colors border-b border-slate-800">
        <td class="px-5 py-4 font-mono font-medium text-slate-300">#RX-${rx.prescription_id}</td>
        <td class="px-5 py-4">
          <div class="font-bold text-white">${patient.full_name}</div>
          <div class="text-xs text-slate-400 font-mono">${patient.pdl_number}</div>
        </td>
        <td class="px-5 py-4 text-xs text-slate-200">${meds || rx.dosage_instructions || "No itemized medications"}</td>
        <td class="px-5 py-4 text-xs text-slate-300">${doctor}</td>
        <td class="px-5 py-4">${getStatusBadge(rx.prescription_status)}</td>
        <td class="px-5 py-4 text-right">
          ${rx.prescription_status === "Pending" ? `
            <button onclick="dispenseRx(${rx.prescription_id})" class="px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white">
              Dispense
            </button>
          ` : `<span class="text-xs text-emerald-400 font-semibold">✓ Dispensed</span>`}
        </td>
      </tr>
    `;
    })
    .join("");
}

async function dispenseRx(rxId) {
  try {
    await apiCall(`/clinical/prescriptions/${rxId}/dispense`, { method: "PATCH" });
    showToast(`Prescription #${rxId} dispensed successfully.`, "success");
    await fetchPrescriptions();
  } catch (err) {
    showToast(err.message, "error");
  }
}

// 7. Audit Logs Table
function renderAuditLogsTable() {
  const container = document.getElementById("auditLogsTableBody");
  if (!container) return;

  if (appState.auditLogs.length === 0) {
    container.innerHTML = `<tr><td colspan="5" class="px-6 py-6 text-center text-slate-400">No audit logs available.</td></tr>`;
    return;
  }

  container.innerHTML = appState.auditLogs
    .map((log) => {
      const user = log.user ? `${log.user.full_name} (${log.user.username})` : "System Engine";
      const timeStr = new Date(log.timestamp).toLocaleString();
      return `
      <tr class="hover:bg-slate-800/40 transition-colors border-b border-slate-800">
        <td class="px-4 py-3 font-mono text-xs text-slate-400">${timeStr}</td>
        <td class="px-4 py-3 text-xs font-semibold text-slate-200">${user}</td>
        <td class="px-4 py-3 font-mono text-xs text-blue-400 font-bold">${log.action}</td>
        <td class="px-4 py-3 text-xs"><span class="px-2 py-0.5 rounded bg-slate-700/60 text-slate-300">${log.module}</span></td>
        <td class="px-4 py-3 text-xs text-slate-300 font-mono">${log.details}</td>
      </tr>
    `;
    })
    .join("");
}

// 8. Admin Overview
function renderAdminOverview(overview) {
  if (!overview) return;
  const { stats, system } = overview;

  const usersCountEl = document.getElementById("adminStatUsers");
  const auditCountEl = document.getElementById("adminStatAudits");
  const nodeVerEl = document.getElementById("adminSystemNode");
  const memEl = document.getElementById("adminSystemMem");
  const uptimeEl = document.getElementById("adminSystemUptime");

  if (usersCountEl) usersCountEl.innerText = stats.totalUsers;
  if (auditCountEl) auditCountEl.innerText = stats.totalAuditLogs;
  if (nodeVerEl) nodeVerEl.innerText = system.nodeVersion;
  if (memEl) memEl.innerText = `${system.memoryRssMb} MB`;
  if (uptimeEl) uptimeEl.innerText = `${Math.floor(system.uptimeSeconds / 60)} mins`;

  // Render users table if available
  fetchAdminUsers();
}

async function fetchAdminUsers() {
  const container = document.getElementById("adminUsersTableBody");
  if (!container) return;

  try {
    const res = await apiCall("/admin/users");
    const users = res.data || [];
    container.innerHTML = users
      .map((u) => {
        const role = u.role ? u.role.role_name : "N/A";
        const isToggleActive = u.account_status === "Active" ? "Inactive" : "Active";
        return `
        <tr class="hover:bg-slate-800/40 transition-colors border-b border-slate-800">
          <td class="px-5 py-4 font-mono text-slate-300">#${u.user_id}</td>
          <td class="px-5 py-4 font-bold text-white">${u.full_name} (${u.username})</td>
          <td class="px-5 py-4 text-xs font-semibold text-blue-300">${role}</td>
          <td class="px-5 py-4">${getStatusBadge(u.account_status)}</td>
          <td class="px-5 py-4 text-right">
            <button onclick="toggleUserStatus(${u.user_id}, '${isToggleActive}')" class="px-3 py-1 text-xs font-semibold rounded border ${u.account_status === 'Active' ? 'border-rose-500/40 text-rose-300 hover:bg-rose-500/20' : 'border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/20'}">
              Set ${isToggleActive}
            </button>
          </td>
        </tr>
      `;
      })
      .join("");
  } catch (e) {
    console.error("fetch admin users error:", e);
  }
}

async function toggleUserStatus(userId, targetStatus) {
  try {
    await apiCall(`/admin/users/${userId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ account_status: targetStatus })
    });
    showToast(`User status updated to ${targetStatus}`, "success");
    await fetchAdminUsers();
  } catch (err) {
    showToast(err.message, "error");
  }
}

function openCreateUserModal() {
  const modal = document.getElementById("createUserModal");
  if (modal) modal.classList.remove("hidden");
}

function closeCreateUserModal() {
  const modal = document.getElementById("createUserModal");
  if (modal) modal.classList.add("hidden");
}

async function handleCreateUserSubmit(e) {
  e.preventDefault();
  const fullName = document.getElementById("newUserFullName").value.trim();
  const username = document.getElementById("newUserUsername").value.trim();
  const password = document.getElementById("newUserPassword").value;
  const roleName = document.getElementById("newUserRole").value;
  const licenseOrBadge = document.getElementById("newUserLicense").value.trim();
  const personnelOrSpec = document.getElementById("newUserSpec").value.trim();

  try {
    await apiCall("/admin/users", {
      method: "POST",
      body: JSON.stringify({
        full_name: fullName,
        username,
        password,
        role_name: roleName,
        license_number: roleName === "MedicalOfficer" ? licenseOrBadge : null,
        badge_number: roleName !== "MedicalOfficer" ? licenseOrBadge : null,
        specialization: roleName === "MedicalOfficer" ? personnelOrSpec : null,
        personnel_id: roleName !== "MedicalOfficer" ? personnelOrSpec : null
      })
    });
    showToast(`Officer account ${username} (${roleName}) created!`, "success");
    closeCreateUserModal();
    await fetchAdminOverview();
    await fetchAuditLogs();
  } catch (err) {
    showToast(err.message, "error");
  }
}

// ==========================================
// CLINICAL WORKSPACE MODAL & FORMS
// ==========================================
function openExaminationModal(pdlId) {
  const pdl = appState.pdls.find((p) => p.pdl_id === pdlId);
  if (!pdl) return;

  appState.selectedPdl = pdl;
  const modal = document.getElementById("examModal");
  if (!modal) return;

  document.getElementById("examModalPdlName").innerText = pdl.full_name;
  document.getElementById("examModalPdlNumber").innerText = pdl.pdl_number;
  document.getElementById("examModalPdlCell").innerText = `${pdl.cell_number} - ${pdl.assigned_facility}`;
  document.getElementById("examModalHistory").innerText = pdl.medicalRecord ? pdl.medicalRecord.medical_history : "No chronic history recorded.";
  document.getElementById("examModalAllergies").innerText = pdl.medicalRecord ? pdl.medicalRecord.allergies : "NKDA";
  document.getElementById("examRecordId").value = pdl.medicalRecord ? pdl.medicalRecord.record_id : "";

  // Reset exam inputs
  document.getElementById("examSymptoms").value = "";
  document.getElementById("examFindings").value = "";
  document.getElementById("examDiagnosis").value = "";
  document.getElementById("examTreatmentPlan").value = "";
  document.getElementById("examBp").value = "120/80";
  document.getElementById("examHr").value = "76";
  document.getElementById("examTemp").value = "36.8";
  document.getElementById("examSpo2").value = "98";
  document.getElementById("examRr").value = "18";

  // Reset dynamic prescription medications list
  const medContainer = document.getElementById("dynamicMedsContainer");
  if (medContainer) {
    medContainer.innerHTML = "";
    addMedicationRow(); // Add one default row
  }

  // Reset referral section
  const refCheckbox = document.getElementById("enableReferralCheckbox");
  const refDrawer = document.getElementById("referralDrawer");
  if (refCheckbox) refCheckbox.checked = false;
  if (refDrawer) refDrawer.classList.add("hidden");

  modal.classList.remove("hidden");
}

function closeExaminationModal() {
  const modal = document.getElementById("examModal");
  if (modal) modal.classList.add("hidden");
}

function addMedicationRow(name = "", dosage = "", instructions = "") {
  const container = document.getElementById("dynamicMedsContainer");
  if (!container) return;

  const row = document.createElement("div");
  row.className = "flex gap-2 items-center medication-row";
  row.innerHTML = `
    <input type="text" placeholder="Drug Name (e.g. Amlodipine)" value="${name}" class="med-name flex-1 px-3 py-2 text-xs rounded bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-blue-500" required />
    <input type="text" placeholder="Dosage (e.g. 10mg PO OD)" value="${dosage}" class="med-dosage w-44 px-3 py-2 text-xs rounded bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-blue-500" required />
    <input type="text" placeholder="Instructions (e.g. Morning with water)" value="${instructions}" class="med-inst flex-1 px-3 py-2 text-xs rounded bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-blue-500" required />
    <button type="button" onclick="this.parentElement.remove()" class="px-2 py-2 text-xs text-rose-400 hover:text-rose-300 font-bold" title="Remove medication">✕</button>
  `;
  container.appendChild(row);
}

function toggleReferralDrawer() {
  const checkbox = document.getElementById("enableReferralCheckbox");
  const drawer = document.getElementById("referralDrawer");
  if (checkbox && drawer) {
    if (checkbox.checked) drawer.classList.remove("hidden");
    else drawer.classList.add("hidden");
  }
}

async function handleClinicalExamSubmit(e) {
  e.preventDefault();
  const recordId = Number(document.getElementById("examRecordId").value);
  const symptoms = document.getElementById("examSymptoms").value;
  const findings = document.getElementById("examFindings").value;
  const diagnosisDescription = document.getElementById("examDiagnosis").value;
  const treatmentPlan = document.getElementById("examTreatmentPlan").value;

  const vitalSigns = {
    blood_pressure: document.getElementById("examBp").value,
    heart_rate: Number(document.getElementById("examHr").value),
    temperature: Number(document.getElementById("examTemp").value),
    spo2: Number(document.getElementById("examSpo2").value),
    respiratory_rate: Number(document.getElementById("examRr").value)
  };

  // Collect dynamic medications
  const medRows = document.querySelectorAll("#dynamicMedsContainer .medication-row");
  const medications = [];
  medRows.forEach((row) => {
    const name = row.querySelector(".med-name").value.trim();
    const dosage = row.querySelector(".med-dosage").value.trim();
    const instructions = row.querySelector(".med-inst").value.trim();
    if (name) {
      medications.push({ medication_name: name, dosage, instructions });
    }
  });

  // Check referral
  let referral = null;
  const enableReferral = document.getElementById("enableReferralCheckbox").checked;
  if (enableReferral) {
    const dest = document.getElementById("referralHospital").value.trim();
    const reason = document.getElementById("referralReason").value.trim();
    if (!dest) {
      showToast("Please provide the destination hospital for referral.", "error");
      return;
    }
    referral = { destination_hospital: dest, reason };
  }

  try {
    const res = await apiCall("/clinical/examine", {
      method: "POST",
      body: JSON.stringify({
        record_id: recordId,
        symptoms,
        findings,
        vital_signs: vitalSigns,
        diagnosis_description: diagnosisDescription,
        treatment_plan: treatmentPlan,
        medications,
        referral
      })
    });

    showToast("Clinical consultation committed! Case state machine updated.", "success");
    closeExaminationModal();
    await loadInitialData();
  } catch (err) {
    showToast(`Submission failed: ${err.message}`, "error");
  }
}

// ==========================================
// NURSE TRIAGE MODAL
// ==========================================
function openTriageModal(pdlId) {
  const pdl = appState.pdls.find((p) => p.pdl_id === pdlId);
  if (!pdl) return;

  document.getElementById("triagePdlName").innerText = pdl.full_name;
  document.getElementById("triagePdlNumber").innerText = pdl.pdl_number;
  document.getElementById("triageRecordId").value = pdl.medicalRecord ? pdl.medicalRecord.record_id : "";

  document.getElementById("triageBp").value = "120/80";
  document.getElementById("triageHr").value = "76";
  document.getElementById("triageTemp").value = "36.6";
  document.getElementById("triageSpo2").value = "98";
  document.getElementById("triageRr").value = "16";
  document.getElementById("triageSymptoms").value = "";

  document.getElementById("triageModal").classList.remove("hidden");
}

function closeTriageModal() {
  document.getElementById("triageModal").classList.add("hidden");
}

async function handleTriageSubmit(e) {
  e.preventDefault();
  const recordId = Number(document.getElementById("triageRecordId").value);
  const symptoms = document.getElementById("triageSymptoms").value;
  const vitalSigns = {
    blood_pressure: document.getElementById("triageBp").value,
    heart_rate: Number(document.getElementById("triageHr").value),
    temperature: Number(document.getElementById("triageTemp").value),
    spo2: Number(document.getElementById("triageSpo2").value),
    respiratory_rate: Number(document.getElementById("triageRr").value)
  };

  try {
    await apiCall("/clinical/triage", {
      method: "POST",
      body: JSON.stringify({ record_id: recordId, vital_signs: vitalSigns, symptoms })
    });

    showToast("Triage vitals recorded successfully. Queue updated.", "success");
    closeTriageModal();
    await loadInitialData();
  } catch (err) {
    showToast(err.message, "error");
  }
}

// ==========================================
// REGISTER NEW PDL MODAL
// ==========================================
function openRegisterPdlModal() {
  const numSuffix = Math.floor(1000 + Math.random() * 9000);
  document.getElementById("regPdlNumber").value = `BJMP-MNL-2026-${numSuffix}`;
  document.getElementById("regPdlModal").classList.remove("hidden");
}

function closeRegisterPdlModal() {
  document.getElementById("regPdlModal").classList.add("hidden");
}

async function handleRegisterPdlSubmit(e) {
  e.preventDefault();
  const pdlNumber = document.getElementById("regPdlNumber").value.trim();
  const fullName = document.getElementById("regFullName").value.trim();
  const dob = document.getElementById("regDob").value;
  const admissionDate = document.getElementById("regAdmissionDate").value;
  const facility = document.getElementById("regFacility").value;
  const cellNumber = document.getElementById("regCell").value.trim();
  const history = document.getElementById("regHistory").value.trim();
  const allergies = document.getElementById("regAllergies").value.trim();

  try {
    await apiCall("/pdls", {
      method: "POST",
      body: JSON.stringify({
        pdl_number: pdlNumber,
        full_name: fullName,
        date_of_birth: dob,
        admission_date: admissionDate,
        assigned_facility: facility,
        cell_number: cellNumber,
        initial_medical_history: history,
        initial_allergies: allergies
      })
    });

    showToast(`PDL ${fullName} registered with Medical Record!`, "success");
    closeRegisterPdlModal();
    await fetchPdls();
  } catch (err) {
    showToast(err.message, "error");
  }
}

// ==========================================
// OBSERVATION MODAL
// ==========================================
function openObservationModal(pdlId) {
  const pdl = appState.pdls.find((p) => p.pdl_id === pdlId);
  if (!pdl) return;

  document.getElementById("obsPdlName").innerText = pdl.full_name;
  document.getElementById("obsRecordId").value = pdl.medicalRecord ? pdl.medicalRecord.record_id : "";
  document.getElementById("obsNotes").value = "";
  document.getElementById("obsModal").classList.remove("hidden");
}

function closeObservationModal() {
  document.getElementById("obsModal").classList.add("hidden");
}

async function handleObservationSubmit(e) {
  e.preventDefault();
  const recordId = Number(document.getElementById("obsRecordId").value);
  const notes = document.getElementById("obsNotes").value.trim();

  try {
    await apiCall("/clinical/observation", {
      method: "POST",
      body: JSON.stringify({
        record_id: recordId,
        observation_notes: notes
      })
    });
    showToast("Observation note recorded.", "success");
    closeObservationModal();
  } catch (err) {
    showToast(err.message, "error");
  }
}

// ==========================================
// ESCORT DISPATCH MODAL (JAIL OFFICER)
// ==========================================
function openEscortModal(referralId) {
  const ref = appState.referrals.find((r) => r.referral_id === referralId);
  if (!ref) return;

  document.getElementById("escortReferralId").value = ref.referral_id;
  document.getElementById("escortModalRefNum").innerText = `#REF-${ref.referral_id}`;
  document.getElementById("escortModalDest").innerText = ref.destination_hospital;
  document.getElementById("escortStatusSelect").value = ref.referral_status;
  document.getElementById("escortVehiclePlate").value = ref.vehicle_plate || "";
  document.getElementById("escortNotes").value = ref.escort_notes || "";

  document.getElementById("escortModal").classList.remove("hidden");
}

function closeEscortModal() {
  document.getElementById("escortModal").classList.add("hidden");
}

async function handleEscortSubmit(e) {
  e.preventDefault();
  const referralId = Number(document.getElementById("escortReferralId").value);
  const status = document.getElementById("escortStatusSelect").value;
  const plate = document.getElementById("escortVehiclePlate").value.trim();
  const notes = document.getElementById("escortNotes").value.trim();

  try {
    await apiCall(`/referrals/${referralId}`, {
      method: "PATCH",
      body: JSON.stringify({
        referral_status: status,
        vehicle_plate: plate,
        escort_notes: notes,
        escort_officer_id: appState.currentUser ? appState.currentUser.user_id : null
      })
    });

    showToast(`Referral #${referralId} status updated to "${status}".`, "success");
    closeEscortModal();
    await fetchReferrals();
  } catch (err) {
    showToast(err.message, "error");
  }
}

// ==========================================
// JAIL OFFICER NEW CHECKUP REQUEST MODAL
// ==========================================
function openNewRequestModal() {
  renderJailPdlSelect();
  document.getElementById("requestReason").value = "";
  document.getElementById("requestPriority").value = "Normal";
  document.getElementById("newRequestModal").classList.remove("hidden");
}

function closeNewRequestModal() {
  document.getElementById("newRequestModal").classList.add("hidden");
}

async function handleNewRequestSubmit(e) {
  e.preventDefault();
  const pdlId = Number(document.getElementById("requestPdlSelect").value);
  const reason = document.getElementById("requestReason").value.trim();
  const priority = document.getElementById("requestPriority").value;

  if (!pdlId) {
    showToast("Please select a PDL.", "error");
    return;
  }

  try {
    await apiCall("/requests", {
      method: "POST",
      body: JSON.stringify({ pdl_id: pdlId, reason_for_request: reason, priority })
    });

    showToast("Medical checkup request submitted to Medical Officers.", "success");
    closeNewRequestModal();
    await fetchRequests();
  } catch (err) {
    showToast(err.message, "error");
  }
}

async function updateRequestStatus(requestId, status) {
  try {
    await apiCall(`/requests/${requestId}`, {
      method: "PATCH",
      body: JSON.stringify({ request_status: status })
    });
    showToast(`Request marked as ${status}.`, "success");
    await fetchRequests();
  } catch (err) {
    showToast(err.message, "error");
  }
}

// ==========================================
// PRINTABLE CLINICAL ABSTRACT MODAL
// ==========================================
async function openPrintableAbstract(pdlId) {
  try {
    const res = await apiCall(`/pdls/${pdlId}/profile`);
    const record = res.data;
    const pdl = record.pdl || {};
    const latestExam = (record.examinations && record.examinations[0]) || {};
    const latestDiag = (record.diagnoses && record.diagnoses[0]) || {};
    const activeRef = (record.hospitalReferrals && record.hospitalReferrals[0]) || null;
    const vitals = latestExam.vital_signs || {};

    let rxRows = "";
    if (latestDiag.treatments) {
      latestDiag.treatments.forEach((t) => {
        if (t.prescriptions) {
          t.prescriptions.forEach((rx) => {
            if (rx.medications) {
              rx.medications.forEach((m) => {
                rxRows += `<tr>
                  <td class="border px-2 py-1 font-semibold">${m.medication_name}</td>
                  <td class="border px-2 py-1">${m.dosage}</td>
                  <td class="border px-2 py-1">${m.instructions}</td>
                </tr>`;
              });
            }
          });
        }
      });
    }

    if (!rxRows) {
      rxRows = `<tr><td colspan="3" class="border px-2 py-1 text-center text-gray-500">No active medication regimen recorded.</td></tr>`;
    }

    const printContainer = document.getElementById("printableAbstractContent");
    printContainer.innerHTML = `
      <div class="print-only-sheet bg-white text-black p-8 font-serif leading-relaxed text-sm">
        <!-- Official Government Letterhead -->
        <div class="text-center border-b-2 border-black pb-4 mb-4">
          <div class="text-xs uppercase tracking-widest font-sans font-bold">Republic of the Philippines</div>
          <div class="text-xs uppercase tracking-wider font-sans font-semibold">Department of the Interior and Local Government</div>
          <div class="text-lg font-bold font-sans tracking-wide text-blue-900 mt-1">BUREAU OF JAIL MANAGEMENT AND PENOLOGY</div>
          <div class="text-xs font-sans tracking-wider text-gray-700">DIRECTORATE FOR HEALTH SERVICE • NATIONAL HEADQUARTERS</div>
          <div class="text-xs font-sans italic text-gray-600 mt-0.5">${pdl.assigned_facility || "Regional Jail Facility"}</div>
          <div class="mt-3 text-base font-bold uppercase underline font-sans tracking-wider">OFFICIAL CLINICAL ABSTRACT & MEDICAL CLEARANCE</div>
        </div>

        <!-- Meta Details -->
        <div class="grid grid-cols-2 gap-4 border border-gray-400 p-3 mb-4 text-xs font-sans">
          <div>
            <p><b>PDL BOOKING NUMBER:</b> <span class="font-mono font-bold">${pdl.pdl_number}</span></p>
            <p><b>PATIENT FULL NAME:</b> ${pdl.full_name}</p>
            <p><b>DATE OF BIRTH:</b> ${pdl.date_of_birth}</p>
            <p><b>ASSIGNED DORM / CELL:</b> ${pdl.cell_number}</p>
          </div>
          <div>
            <p><b>CLINICAL CASE STATUS:</b> <span class="font-bold underline">${record.case_status}</span></p>
            <p><b>ADMISSION DATE:</b> ${pdl.admission_date}</p>
            <p><b>DOCUMENT ISSUE DATE:</b> ${new Date().toLocaleDateString()}</p>
            <p><b>KNOWN ALLERGIES:</b> <span class="text-red-700 font-bold">${record.allergies || 'NKDA'}</span></p>
          </div>
        </div>

        <!-- Clinical Synopsis -->
        <div class="mb-4">
          <h4 class="font-sans font-bold text-xs uppercase bg-gray-200 px-2 py-1 mb-1 border-l-4 border-blue-900">I. Baseline Medical History & Triage Symptoms</h4>
          <p class="text-xs mb-1"><b>Past Medical History:</b> ${record.medical_history || 'No prior chronic conditions recorded.'}</p>
          <p class="text-xs"><b>Presenting Symptoms:</b> ${latestExam.symptoms || 'Routine clinical round follow-up.'}</p>
        </div>

        <!-- Vital Signs Record -->
        <div class="mb-4">
          <h4 class="font-sans font-bold text-xs uppercase bg-gray-200 px-2 py-1 mb-1 border-l-4 border-blue-900">II. Vital Signs & Diagnostic Baseline</h4>
          <div class="grid grid-cols-5 text-center text-xs border border-gray-300 py-1 font-sans">
            <div><b>BP:</b> ${vitals.blood_pressure || '--'} mmHg</div>
            <div><b>Heart Rate:</b> ${vitals.heart_rate || '--'} bpm</div>
            <div><b>Temp:</b> ${vitals.temperature || '--'} °C</div>
            <div><b>SpO2:</b> ${vitals.spo2 || '--'} %</div>
            <div><b>Resp Rate:</b> ${vitals.respiratory_rate || '--'} cpm</div>
          </div>
        </div>

        <!-- Physical Findings & Diagnosis -->
        <div class="mb-4">
          <h4 class="font-sans font-bold text-xs uppercase bg-gray-200 px-2 py-1 mb-1 border-l-4 border-blue-900">III. Clinical Findings & Formal Diagnosis</h4>
          <p class="text-xs mb-2"><b>Physical Examination:</b> ${latestExam.findings || 'Conscious, coherent, oriented.'}</p>
          <p class="text-xs font-bold text-blue-950"><b>Final Diagnosis:</b> ${latestDiag.diagnosis_description || 'Pending clinical diagnostic workup.'}</p>
        </div>

        <!-- Prescribed Regimen -->
        <div class="mb-4">
          <h4 class="font-sans font-bold text-xs uppercase bg-gray-200 px-2 py-1 mb-1 border-l-4 border-blue-900">IV. Authorized Pharmacological Therapy</h4>
          <table class="w-full text-xs border-collapse">
            <thead>
              <tr class="bg-gray-100 font-sans font-bold text-left">
                <th class="border px-2 py-1">Medication Name</th>
                <th class="border px-2 py-1">Dosage / Route</th>
                <th class="border px-2 py-1">Frequency & Instructions</th>
              </tr>
            </thead>
            <tbody>${rxRows}</tbody>
          </table>
        </div>

        ${activeRef ? `
        <!-- Hospital Referral Section -->
        <div class="mb-6 p-2 border border-red-400 bg-red-50 text-xs">
          <h4 class="font-sans font-bold text-red-900 uppercase">V. Hospital Referral & Escort Endorsement</h4>
          <p><b>Destination Facility:</b> ${activeRef.destination_hospital}</p>
          <p><b>Clinical Reason:</b> ${activeRef.reason}</p>
          <p><b>Status:</b> ${activeRef.referral_status} | <b>Assigned Escort:</b> ${activeRef.escortOfficer ? activeRef.escortOfficer.full_name : 'JO2 Assigned'} | <b>Vehicle:</b> ${activeRef.vehicle_plate || 'BJMP Patrol Van'}</p>
        </div>
        ` : ''}

        <!-- Official Signatures -->
        <div class="grid grid-cols-3 gap-6 pt-6 text-center text-xs font-sans border-t border-gray-400 mt-8">
          <div>
            <div class="border-b border-black pb-8"></div>
            <p class="font-bold mt-1">${(latestExam.examiner && latestExam.examiner.full_name) || "Dr. Maria Elena Santos, MD"}</p>
            <p class="text-[10px] text-gray-600">Attending Medical Officer<br/>PRC Lic: PRC-MD-0094821</p>
          </div>
          <div>
            <div class="border-b border-black pb-8"></div>
            <p class="font-bold mt-1">Nurse Juan Dela Cruz, RN</p>
            <p class="text-[10px] text-gray-600">Nurse-on-Duty / Triage Officer<br/>BJMP Health Personnel</p>
          </div>
          <div>
            <div class="border-b border-black pb-8"></div>
            <p class="font-bold mt-1">Jail Senior Superintendent</p>
            <p class="text-[10px] text-gray-600">City Jail Warden<br/>Official Command Clearance</p>
          </div>
        </div>
      </div>
    `;

    document.getElementById("printableModal").classList.remove("hidden");
  } catch (err) {
    showToast(`Failed to load abstract: ${err.message}`, "error");
  }
}

function closePrintableAbstract() {
  document.getElementById("printableModal").classList.add("hidden");
}

function triggerPrint() {
  window.print();
}

// ==========================================
// INITIALIZATION
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
  // Check stored user
  const storedUser = localStorage.getItem("bjmp_user");
  if (storedUser) {
    try {
      appState.currentUser = JSON.parse(storedUser);
    } catch (e) {}
  }

  updateUserInterface();

  if (appState.token) {
    loadInitialData();
  }

  // Live Digital Clock
  setInterval(() => {
    const clock = document.getElementById("headerDigitalClock");
    if (clock) {
      const now = new Date();
      clock.innerText = now.toLocaleTimeString("en-PH", { hour12: false }) + " PHT";
    }
  }, 1000);
});
