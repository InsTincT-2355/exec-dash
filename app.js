const APP_STORAGE_KEY = "muriya-exec-dashboard-state";
const SESSION_STORAGE_KEY = "muriya-exec-dashboard-session";

const CATEGORY_LABELS = {
  activities: "Activities",
  priorities: "Priorities",
  risks: "Challenges and Risks"
};

const BROWSER_AI_STATE = {
  modulePromise: null,
  enginePromise: null,
  loadedModel: ""
};

const DEFAULT_USERS = [
  {
    id: "user-admin-1",
    name: "Local Platform Admin",
    role: "Admin",
    department: "Digital Solutions",
    email: "admin@muriya.local",
    password: "Admin@123"
  },
  {
    id: "user-exec-1",
    name: "Ahmed Altouqi",
    role: "Executive",
    department: "Executive Office",
    email: "ahmed@muriya.local",
    password: "Exec@123"
  },
  {
    id: "user-construction-1",
    name: "Fatma Al Riyami",
    role: "Department Head",
    department: "Construction",
    email: "fatma@muriya.local",
    password: "Dept@123"
  },
  {
    id: "user-hospitality-1",
    name: "Salim Al Hinai",
    role: "Department Head",
    department: "Hospitality",
    email: "salim@muriya.local",
    password: "Dept@123"
  },
  {
    id: "user-finance-1",
    name: "Muna Al Balushi",
    role: "Department Head",
    department: "Finance",
    email: "muna@muriya.local",
    password: "Dept@123"
  },
  {
    id: "user-sales-1",
    name: "Yousef Al Lawati",
    role: "Department Head",
    department: "Sales and Marketing",
    email: "yousef@muriya.local",
    password: "Dept@123"
  }
];

const DEFAULT_SUBMISSIONS = [
  {
    id: "sub-001",
    userId: "user-construction-1",
    weekEnding: "2026-06-18",
    createdAt: "2026-06-18T08:20:00Z",
    items: [
      {
        id: "item-001",
        category: "activities",
        title: "Marina phase-two utility review completed",
        description: "Cross-functional review closed all outstanding utility coordination items for the marina package."
      },
      {
        id: "item-002",
        category: "priorities",
        title: "Finalize contractor mobilization plan",
        description: "Complete final approval cycle and align site access schedule for next week."
      },
      {
        id: "item-003",
        category: "risks",
        title: "Late material delivery on façade package",
        description: "Imported cladding materials are tracking one week late and may affect milestone sequencing."
      }
    ]
  },
  {
    id: "sub-002",
    userId: "user-hospitality-1",
    weekEnding: "2026-06-18",
    createdAt: "2026-06-18T09:15:00Z",
    items: [
      {
        id: "item-004",
        category: "activities",
        title: "Resort readiness audit completed",
        description: "Operations, housekeeping, and guest-experience teams completed a joint readiness walkthrough."
      },
      {
        id: "item-005",
        category: "activities",
        title: "Guest feedback dashboard refreshed",
        description: "Last six weeks of service issues were grouped into operational improvement themes."
      },
      {
        id: "item-006",
        category: "priorities",
        title: "Launch staff cross-training schedule",
        description: "Start weekend training rotation to support the high-season staffing model."
      },
      {
        id: "item-007",
        category: "risks",
        title: "Supplier inconsistency on room amenities",
        description: "Vendor fill-rate remains below target and may impact opening-quality standards."
      }
    ]
  },
  {
    id: "sub-003",
    userId: "user-finance-1",
    weekEnding: "2026-06-18",
    createdAt: "2026-06-18T10:05:00Z",
    items: [
      {
        id: "item-008",
        category: "activities",
        title: "Monthly forecast variance review completed",
        description: "Finance business partners reviewed major variances with all operating departments."
      },
      {
        id: "item-009",
        category: "priorities",
        title: "Prepare executive capex update",
        description: "Consolidate project expenditure status and revised forecast for Thursday review."
      }
    ]
  },
  {
    id: "sub-004",
    userId: "user-sales-1",
    weekEnding: "2026-06-11",
    createdAt: "2026-06-11T11:00:00Z",
    items: [
      {
        id: "item-010",
        category: "activities",
        title: "Summer campaign pipeline launched",
        description: "Digital and broker channels aligned on campaign targeting for leisure buyers."
      },
      {
        id: "item-011",
        category: "risks",
        title: "Lead conversion slowdown in GCC segment",
        description: "Conversion rates fell below monthly target and require revised outreach content."
      }
    ]
  }
];

function generateId(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function getConfig() {
  return window.APP_CONFIG || {};
}

function browserAiIsSupported() {
  return typeof navigator !== "undefined" && "gpu" in navigator;
}

function getBrowserAiSafetyStatus() {
  if (!browserAiIsSupported()) {
    return {
      safe: false,
      reason: "Browser AI requires a recent Chrome or Edge browser with WebGPU enabled."
    };
  }

  const minMemoryGb = getConfig().browserAiMinDeviceMemoryGb || 8;
  const minCpuThreads = getConfig().browserAiMinCpuThreads || 8;
  const deviceMemory = Number(navigator.deviceMemory || 0);
  const cpuThreads = Number(navigator.hardwareConcurrency || 0);

  if (deviceMemory && deviceMemory < minMemoryGb) {
    return {
      safe: false,
      reason: `Browser AI is blocked on this device because it reports ${deviceMemory} GB memory. Minimum recommended memory is ${minMemoryGb} GB.`
    };
  }

  if (cpuThreads && cpuThreads < minCpuThreads) {
    return {
      safe: false,
      reason: `Browser AI is blocked on this device because it reports ${cpuThreads} CPU threads. Minimum recommended CPU threads is ${minCpuThreads}.`
    };
  }

  return {
    safe: true,
    reason: "Private in-browser AI model configured"
  };
}

function formatBrowserAiProgress(report, modelLabel) {
  const progressText = typeof report?.progress === "number"
    ? `${Math.round(report.progress * 100)}%`
    : null;
  const text = report?.text || report?.message || "Preparing browser AI model";

  return progressText
    ? `${text} (${progressText})\n\nFirst-time model download can take a few minutes.`
    : `${text} for ${modelLabel}...\n\nFirst-time model download can take a few minutes.`;
}

async function getBrowserAiModule() {
  if (!BROWSER_AI_STATE.modulePromise) {
    const importUrl = getConfig().browserAiImportUrl || "https://esm.run/@mlc-ai/web-llm";
    BROWSER_AI_STATE.modulePromise = import(importUrl);
  }

  return BROWSER_AI_STATE.modulePromise;
}

async function getBrowserAiEngine(onStatus) {
  const safetyStatus = getBrowserAiSafetyStatus();
  if (!safetyStatus.safe) {
    throw new Error(safetyStatus.reason);
  }

  const config = getConfig();
  const model = config.browserAiModel || "Llama-3.2-1B-Instruct-q4f16_1-MLC";

  if (BROWSER_AI_STATE.enginePromise && BROWSER_AI_STATE.loadedModel === model) {
    return BROWSER_AI_STATE.enginePromise;
  }

  const webllm = await getBrowserAiModule();
  BROWSER_AI_STATE.loadedModel = model;
  BROWSER_AI_STATE.enginePromise = webllm.CreateMLCEngine(model, {
    initProgressCallback: (report) => {
      onStatus?.(formatBrowserAiProgress(report, model));
    }
  }).catch((error) => {
    BROWSER_AI_STATE.enginePromise = null;
    throw error;
  });

  return BROWSER_AI_STATE.enginePromise;
}

function buildBrowserAiPrompt(selectedTasks, currentUser) {
  return [
    "Prepare a concise executive memo for the selected weekly update tasks.",
    "Use a professional tone suitable for leadership review.",
    "Group the memo into these exact sections:",
    "1. Key Highlights",
    "2. Next-Week Priorities",
    "3. Challenges And Risks",
    "4. Recommended Executive Actions",
    "Base the memo only on the provided tasks.",
    "Keep it easy to scan and decision-oriented.",
    "",
    JSON.stringify({
      requester: currentUser.name,
      role: currentUser.role,
      selectedTasks
    }, null, 2)
  ].join("\n");
}

function formatMemoList(items, emptyText) {
  if (!items.length) {
    return emptyText;
  }

  return items.map((item, index) => `${index + 1}. ${item}`).join("\n");
}

function buildMemoTaskPayload(selectedTasks) {
  return selectedTasks.map((task) => ({
    department: task.department,
    category: task.category,
    title: task.title,
    description: task.description
  }));
}

function cleanMemoText(text, currentUser) {
  const cleaned = String(text || "")
    .replace(/\*/g, "")
    .replace(/^#{1,6}\s*/gm, "")
    .replace(/\[(?:CEO|Executive|Your)[^\]]*Name\]/gi, (match) => {
      return /your/i.test(match) ? currentUser.name : "Executive Leadership";
    })
    .replace(/^To:\s*\[.*\]\s*$/gim, "To: Executive Leadership")
    .replace(/^From:\s*\[.*\]\s*$/gim, `From: ${currentUser.name}`)
    .replace(/^Subject:\s*\[.*\]\s*$/gim, "Subject: Weekly Executive Memo")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return cleaned
    .replace(/^EXECUTIVE MEMO\s*$/gim, "")
    .replace(/^MEMORANDUM\s*$/gim, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function appUsesSupabase() {
  return Boolean(window.SupabaseService?.isEnabled?.());
}

async function getBootState() {
  return appUsesSupabase()
    ? window.SupabaseService.fetchBootState()
    : loadState();
}

async function resetAppSession() {
  if (appUsesSupabase()) {
    try {
      await window.SupabaseService.signOut();
    } catch (error) {
      console.error("Supabase sign-out during reset failed", error);
    }
  }

  clearSession();
}

async function hasAppSession() {
  return appUsesSupabase()
    ? window.SupabaseService.hasActiveSession()
    : Boolean(getSession()?.userId);
}

function getInitialState() {
  return {
    users: DEFAULT_USERS,
    submissions: DEFAULT_SUBMISSIONS,
    currentUserId: DEFAULT_USERS[0].id
  };
}

function loadState() {
  try {
    const rawState = localStorage.getItem(APP_STORAGE_KEY);
    if (!rawState) {
      const initialState = getInitialState();
      localStorage.setItem(APP_STORAGE_KEY, JSON.stringify(initialState));
      return initialState;
    }

    const parsedState = JSON.parse(rawState);
    if (!parsedState.users || !parsedState.submissions || !parsedState.currentUserId) {
      const initialState = getInitialState();
      localStorage.setItem(APP_STORAGE_KEY, JSON.stringify(initialState));
      return initialState;
    }

    return parsedState;
  } catch (error) {
    console.error("Failed to load state", error);
    return getInitialState();
  }
}

function saveState(nextState) {
  localStorage.setItem(APP_STORAGE_KEY, JSON.stringify(nextState));
}

function getSession() {
  try {
    const rawSession = localStorage.getItem(SESSION_STORAGE_KEY);
    return rawSession ? JSON.parse(rawSession) : null;
  } catch (error) {
    console.error("Failed to load session", error);
    return null;
  }
}

function saveSession(session) {
  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
}

function clearSession() {
  localStorage.removeItem(SESSION_STORAGE_KEY);
}

function getCurrentUser(state) {
  const session = appUsesSupabase() ? null : getSession();
  const currentUserId = state.currentUserId || session?.userId;
  return state.users.find((user) => user.id === currentUserId) || state.users[0];
}

function getUserById(state, userId) {
  return state.users.find((user) => user.id === userId);
}

function syncCurrentUser(state, userId) {
  if (state.currentUserId === userId) {
    return state;
  }

  const nextState = {
    ...state,
    currentUserId: userId
  };

  if (!appUsesSupabase()) {
    saveState(nextState);
  }

  return nextState;
}

function formatPrettyDate(dateValue) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(dateValue));
}

function isExecutiveUser(user) {
  return user?.role === "Executive";
}

function isAdminUser(user) {
  return user?.role === "Admin";
}

function getRoleBadgeClass(role) {
  if (role === "Executive") {
    return "executive";
  }
  if (role === "Admin") {
    return "admin";
  }
  return "department-head";
}

function getNextThursdayDateString(referenceDate = new Date()) {
  const current = new Date(referenceDate);
  const currentDay = current.getDay();
  const daysUntilThursday = (4 - currentDay + 7) % 7;
  current.setDate(current.getDate() + daysUntilThursday);
  return current.toISOString().split("T")[0];
}

function flattenTasks(state) {
  return state.submissions.flatMap((submission) => {
    const owner = getUserById(state, submission.userId);
    return submission.items.map((item) => ({
      ...item,
      submissionId: submission.id,
      weekEnding: submission.weekEnding,
      createdAt: submission.createdAt,
      ownerName: owner ? owner.name : "Unknown User",
      department: owner ? owner.department : "Unknown Department",
      role: owner ? owner.role : "Unknown Role"
    }));
  });
}

function categoryCount(items, category) {
  return items.filter((item) => item.category === category).length;
}

function getLatestWeek(state) {
  const weeks = [...new Set(state.submissions.map((submission) => submission.weekEnding))].sort().reverse();
  return weeks[0] || getNextThursdayDateString();
}

function buildSummaryCardsHtml(cards) {
  return cards.map((card) => `
    <article class="stat-card">
      <h4>${card.label}</h4>
      <p class="stat-value">${card.value}</p>
      <p class="stat-footnote">${card.note}</p>
    </article>
  `).join("");
}

function buildInsightHtml(insights) {
  return insights.map((insight) => `
    <article class="list-card">
      <h4>${insight.title}</h4>
      <p class="list-meta">${insight.description}</p>
    </article>
  `).join("");
}

function buildBarChartHtml(rows) {
  if (!rows.length) {
    return `<div class="empty-state">No submission data available yet.</div>`;
  }

  const maxValue = Math.max(...rows.map((row) => row.value), 1);
  return rows.map((row) => {
    const width = Math.max((row.value / maxValue) * 100, row.value > 0 ? 8 : 0);
    return `
      <div class="bar-row">
        <div class="bar-row-header">
          <span>${row.label}</span>
          <span>${row.value}</span>
        </div>
        <div class="bar-track">
          <div class="bar-fill" style="width: ${width}%"></div>
        </div>
      </div>
    `;
  }).join("");
}

function renderGlobalShell(state) {
  const currentUser = getCurrentUser(state);

  document.querySelectorAll(".js-current-user").forEach((element) => {
    element.textContent = currentUser.name;
  });

  document.querySelectorAll(".js-current-role").forEach((element) => {
    element.textContent = currentUser.role;
  });

  document.querySelectorAll(".js-current-dept").forEach((element) => {
    element.textContent = currentUser.department;
  });

  document.querySelectorAll(".js-current-email").forEach((element) => {
    element.textContent = currentUser.email;
  });

  document.querySelectorAll(".js-admin-nav").forEach((element) => {
    element.style.display = isAdminUser(currentUser) ? "" : "none";
  });

  document.querySelectorAll(".js-logout").forEach((button) => {
    button.addEventListener("click", async () => {
      try {
        if (appUsesSupabase()) {
          await window.SupabaseService.signOut();
        }
      } catch (error) {
        console.error("Logout failed", error);
      } finally {
        clearSession();
        window.location.href = "login.html";
      }
    });
  });
}

function renderHomePage(state) {
  const currentUser = getCurrentUser(state);
  const summaryCards = document.getElementById("summaryCards");
  const insightPanel = document.getElementById("insightPanel");
  const barChart = document.getElementById("barChart");
  const recentItems = document.getElementById("recentItems");

  if (!summaryCards || !insightPanel || !barChart || !recentItems) {
    return;
  }

  const allTasks = flattenTasks(state);
  const latestWeek = getLatestWeek(state);
  const latestWeekSubmissions = state.submissions.filter((submission) => submission.weekEnding === latestWeek);

  if (currentUser.role === "Executive") {
    const latestWeekTasks = allTasks.filter((task) => task.weekEnding === latestWeek);
    const departmentBreakdown = Object.entries(
      latestWeekTasks.reduce((accumulator, task) => {
        accumulator[task.department] = (accumulator[task.department] || 0) + 1;
        return accumulator;
      }, {})
    ).map(([label, value]) => ({ label, value })).sort((left, right) => right.value - left.value);

    const riskLeader = departmentBreakdown.length
      ? allTasks
          .filter((task) => task.category === "risks" && task.weekEnding === latestWeek)
          .reduce((accumulator, task) => {
            accumulator[task.department] = (accumulator[task.department] || 0) + 1;
            return accumulator;
          }, {})
      : {};

    const highestRiskEntry = Object.entries(riskLeader).sort((left, right) => right[1] - left[1])[0];

    const cards = [
      {
        label: "Submissions This Week",
        value: latestWeekSubmissions.length,
        note: `Reporting week ending ${formatPrettyDate(latestWeek)}`
      },
      {
        label: "Total Activities",
        value: categoryCount(latestWeekTasks, "activities"),
        note: "All departments combined"
      },
      {
        label: "Total Priorities",
        value: categoryCount(latestWeekTasks, "priorities"),
        note: "Action planned for next week"
      },
      {
        label: "Total Risks",
        value: categoryCount(latestWeekTasks, "risks"),
        note: "Items needing executive attention"
      }
    ];

    const insights = [
      {
        title: departmentBreakdown[0] ? `${departmentBreakdown[0].label} has the highest volume of updates` : "No submissions this week",
        description: departmentBreakdown[0]
          ? `${departmentBreakdown[0].value} items were reported in the latest reporting cycle.`
          : "Ask department heads to submit their weekly updates."
      },
      {
        title: highestRiskEntry ? `${highestRiskEntry[0]} reports the most risks` : "No risks reported this week",
        description: highestRiskEntry
          ? `${highestRiskEntry[1]} risk items are currently visible for executive review.`
          : "Current reporting shows no active risk escalations."
      },
      {
        title: `${latestWeekSubmissions.length} departments submitted this week`,
        description: "Use the executive dashboard to compare detail by week, department, and category."
      }
    ];

    summaryCards.innerHTML = buildSummaryCardsHtml(cards);
    insightPanel.innerHTML = buildInsightHtml(insights);
    barChart.innerHTML = buildBarChartHtml(departmentBreakdown);
    recentItems.innerHTML = latestWeekTasks.slice(0, 5).map((task) => `
      <article class="list-card">
        <h4>${task.title}</h4>
        <p class="list-meta">${task.department} · ${CATEGORY_LABELS[task.category]} · ${formatPrettyDate(task.weekEnding)}</p>
      </article>
    `).join("") || `<div class="empty-state">No tasks submitted for the latest week yet.</div>`;

    return;
  }

  const userSubmissions = state.submissions.filter((submission) => submission.userId === currentUser.id);
  const userTasks = userSubmissions.flatMap((submission) => submission.items.map((item) => ({
    ...item,
    weekEnding: submission.weekEnding
  })));

  const cards = [
    {
      label: "My Activities",
      value: categoryCount(userTasks, "activities"),
      note: "Weekly activities and completed updates"
    },
    {
      label: "My Priorities",
      value: categoryCount(userTasks, "priorities"),
      note: "Next-week focus areas"
    },
    {
      label: "My Risks",
      value: categoryCount(userTasks, "risks"),
      note: "Challenges requiring support"
    },
    {
      label: "Submissions Logged",
      value: userSubmissions.length,
      note: "Weekly reports saved"
    }
  ];

  const latestSubmission = [...userSubmissions].sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt))[0];
  const insights = [
    {
      title: `${currentUser.department} reporting status`,
      description: latestSubmission
        ? `Latest submission recorded for the week ending ${formatPrettyDate(latestSubmission.weekEnding)}.`
        : "No submission has been recorded yet."
    },
    {
      title: `${categoryCount(userTasks, "priorities")} priorities in the pipeline`,
      description: "Use the submit page to keep next-week actions current before Thursday review."
    },
    {
      title: `${categoryCount(userTasks, "risks")} risks tracked`,
      description: "Log emerging challenges early so the executive team can respond faster."
    }
  ];

  const weekCounts = Object.entries(
    userTasks.reduce((accumulator, item) => {
      accumulator[item.weekEnding] = (accumulator[item.weekEnding] || 0) + 1;
      return accumulator;
    }, {})
  ).sort((left, right) => new Date(right[0]) - new Date(left[0]))
    .slice(0, 5)
    .map(([label, value]) => ({ label: formatPrettyDate(label), value }));

  summaryCards.innerHTML = buildSummaryCardsHtml(cards);
  insightPanel.innerHTML = buildInsightHtml(insights);
  barChart.innerHTML = buildBarChartHtml(weekCounts);
  recentItems.innerHTML = userTasks.slice(0, 5).map((task) => `
    <article class="list-card">
      <h4>${task.title}</h4>
      <p class="list-meta">${CATEGORY_LABELS[task.category]} · ${formatPrettyDate(task.weekEnding)}</p>
    </article>
  `).join("") || `<div class="empty-state">You have not submitted any tasks yet.</div>`;
}

function createTaskInputCard(category, index, task = { title: "", description: "" }) {
  return `
    <article class="task-input-card" data-category="${category}" data-index="${index}">
      <div class="task-card-header">
        <strong>${CATEGORY_LABELS[category]} Item ${index + 1}</strong>
        <button type="button" class="remove-button" data-remove-item="${category}">Remove</button>
      </div>
      <label class="field">
        <span>Title</span>
        <input type="text" class="input-field" data-field="title" value="${task.title}">
      </label>
      <label class="field">
        <span>Description</span>
        <textarea class="text-area" data-field="description">${task.description}</textarea>
      </label>
    </article>
  `;
}

function renderTaskInputs(category, items) {
  const container = document.getElementById(`${category}Container`);
  if (!container) {
    return;
  }

  container.innerHTML = items.map((item, index) => createTaskInputCard(category, index, item)).join("");
}

function renderSubmissionHistory(state) {
  const historyContainer = document.getElementById("submissionHistory");
  if (!historyContainer) {
    return;
  }

  const currentUser = getCurrentUser(state);
  const submissions = state.submissions
    .filter((submission) => submission.userId === currentUser.id)
    .sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt));

  if (!submissions.length) {
    historyContainer.innerHTML = `<div class="empty-state">No submissions yet. Add your first weekly update on this page.</div>`;
    return;
  }

  historyContainer.innerHTML = submissions.map((submission) => `
    <article class="history-card">
      <h4>Week ending ${formatPrettyDate(submission.weekEnding)}</h4>
      <p class="list-meta">${submission.items.length} total items submitted</p>
      <div class="tag-row">
        <span class="tag activities">${categoryCount(submission.items, "activities")} activities</span>
        <span class="tag priorities">${categoryCount(submission.items, "priorities")} priorities</span>
        <span class="tag risks">${categoryCount(submission.items, "risks")} risks</span>
      </div>
    </article>
  `).join("");
}

function renderSubmitPage(state) {
  const form = document.getElementById("weeklyUpdateForm");
  if (!form) {
    return;
  }

  const currentUser = getCurrentUser(state);
  const draft = {
    activities: [{ title: "", description: "" }],
    priorities: [{ title: "", description: "" }],
    risks: [{ title: "", description: "" }]
  };

  const headName = document.getElementById("headName");
  const departmentName = document.getElementById("departmentName");
  const weekEnding = document.getElementById("weekEnding");
  const feedback = document.getElementById("formFeedback");

  headName.value = currentUser.name;
  departmentName.value = currentUser.department;
  weekEnding.value = getNextThursdayDateString();

  function rerenderAllInputs() {
    Object.keys(draft).forEach((category) => {
      renderTaskInputs(category, draft[category]);
    });
    attachTaskInputListeners();
  }

  function attachTaskInputListeners() {
    document.querySelectorAll(".task-input-card").forEach((card) => {
      const category = card.dataset.category;
      const index = Number(card.dataset.index);

      card.querySelectorAll("[data-field]").forEach((field) => {
        field.addEventListener("input", (event) => {
          draft[category][index][event.target.dataset.field] = event.target.value;
        });
      });
    });

    document.querySelectorAll("[data-remove-item]").forEach((button) => {
      button.addEventListener("click", () => {
        const category = button.dataset.removeItem;
        if (draft[category].length === 1) {
          draft[category][0] = { title: "", description: "" };
        } else {
          const card = button.closest(".task-input-card");
          const index = Number(card.dataset.index);
          draft[category].splice(index, 1);
        }
        rerenderAllInputs();
      });
    });
  }

  document.querySelectorAll(".add-item-button").forEach((button) => {
    button.addEventListener("click", () => {
      const category = button.dataset.category;
      draft[category].push({ title: "", description: "" });
      rerenderAllInputs();
    });
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const items = Object.entries(draft).flatMap(([category, rows]) => rows
      .filter((row) => row.title.trim() || row.description.trim())
      .map((row) => ({
        id: generateId("item"),
        category,
        title: row.title.trim() || "Untitled item",
        description: row.description.trim() || "No description provided."
      })));

    if (!items.length) {
      feedback.textContent = "Add at least one task item before submitting.";
      return;
    }

    try {
      let nextState;

      if (appUsesSupabase()) {
        await window.SupabaseService.submitWeeklyUpdate(currentUser.id, weekEnding.value, items);
        nextState = await getBootState();
      } else {
        nextState = loadState();
        nextState.submissions.unshift({
          id: generateId("submission"),
          userId: currentUser.id,
          weekEnding: weekEnding.value,
          createdAt: new Date().toISOString(),
          items
        });
        saveState(nextState);
      }

      feedback.textContent = "Weekly update submitted successfully.";

      Object.keys(draft).forEach((category) => {
        draft[category] = [{ title: "", description: "" }];
      });
      rerenderAllInputs();
      renderSubmissionHistory(nextState);
    } catch (error) {
      console.error(error);
      feedback.textContent = "Submission failed. Please check your connection and Supabase configuration.";
    }
  });

  rerenderAllInputs();
  renderSubmissionHistory(state);
}

function getUniqueDepartments(state) {
  return [...new Set(state.users.map((user) => user.department))].sort();
}

function getUniqueWeeks(state) {
  return [...new Set(state.submissions.map((submission) => submission.weekEnding))].sort().reverse();
}

function getCategorySortOrder(category) {
  const categoryOrder = {
    activities: 1,
    priorities: 2,
    risks: 3
  };

  return categoryOrder[category] || 999;
}

function buildTaskResultsHtml(tasks, selectedTaskIds) {
  if (!tasks.length) {
    return `<div class="empty-state">No tasks match the current filters.</div>`;
  }

  const orderedTasks = [...tasks].sort((left, right) => {
    const categoryOrder = getCategorySortOrder(left.category) - getCategorySortOrder(right.category);
    if (categoryOrder !== 0) {
      return categoryOrder;
    }

    const departmentOrder = left.department.localeCompare(right.department);
    if (departmentOrder !== 0) {
      return departmentOrder;
    }

    return left.title.localeCompare(right.title);
  });

  const groupedTasks = orderedTasks.reduce((accumulator, task) => {
    if (!accumulator[task.category]) {
      accumulator[task.category] = [];
    }
    accumulator[task.category].push(task);
    return accumulator;
  }, {});

  return ["activities", "priorities", "risks"]
    .filter((category) => groupedTasks[category]?.length)
    .map((category) => `
      <section class="task-group">
        <div class="panel-header">
          <div>
            <p class="eyebrow">Category</p>
            <h3>${CATEGORY_LABELS[category]}</h3>
          </div>
        </div>
        ${groupedTasks[category].map((task) => `
          <article class="task-card">
            <div class="task-select-row">
              <div>
                <h4>${task.title}</h4>
                <p class="task-meta">${task.department} · ${task.ownerName} · ${formatPrettyDate(task.weekEnding)}</p>
              </div>
              <input
                type="checkbox"
                class="task-checkbox"
                data-task-id="${task.id}"
                ${selectedTaskIds.has(task.id) ? "checked" : ""}
                aria-label="Select ${task.title}"
              >
            </div>
            <p>${task.description}</p>
            <div class="tag-row">
              <span class="tag ${task.category}">${CATEGORY_LABELS[task.category]}</span>
            </div>
          </article>
        `).join("")}
      </section>
    `).join("");
}

function createLocalMemo(selectedTasks, currentUser) {
  const groupedByDepartment = selectedTasks.reduce((accumulator, task) => {
    if (!accumulator[task.department]) {
      accumulator[task.department] = [];
    }
    accumulator[task.department].push(task);
    return accumulator;
  }, {});

  const departments = Object.keys(groupedByDepartment);
  const subjectDepartments = departments.join(", ") || "Selected Departments";
  const fromLabel = currentUser.role === "Executive" ? "Executive Office" : currentUser.department;

  const highlights = selectedTasks
    .filter((task) => task.category === "activities")
    .slice(0, 3)
    .map((task) => `${task.department}: ${task.title}${task.description ? ` - ${task.description}` : ""}`);

  const priorities = selectedTasks
    .filter((task) => task.category === "priorities")
    .slice(0, 3)
    .map((task) => `${task.department}: ${task.title}${task.description ? ` - ${task.description}` : ""}`);

  const risks = selectedTasks
    .filter((task) => task.category === "risks")
    .slice(0, 4)
    .map((task) => `${task.department}: ${task.title} - ${task.description}`);

  const recommendations = [];
  if (risks.length) {
    recommendations.push("Review cross-department mitigation plans for the active risks listed above.");
  }
  if (priorities.length) {
    recommendations.push("Confirm department owners and timing for the selected priority actions.");
  }
  if (highlights.length || priorities.length || risks.length) {
    recommendations.push("Continue monitoring the selected department updates and follow up where support is required.");
  }

  return cleanMemoText([
    `To: Executive Leadership`,
    `From: ${fromLabel}`,
    `Subject: Weekly Executive Memo - ${subjectDepartments}`,
    ``,
    `Summary`,
    `This memo covers ${selectedTasks.length} selected update items across ${subjectDepartments}.`,
    ``,
    `Key Highlights`,
    formatMemoList(highlights, "1. No new activities selected."),
    ``,
    `Next-Week Priorities`,
    formatMemoList(priorities, "1. No new priorities selected."),
    ``,
    `Challenges and Risks`,
    formatMemoList(risks, "1. No new risks selected."),
    ``,
    `Recommended Executive Actions`,
    formatMemoList(recommendations, "1. No immediate executive action is required based on the selected items.")
  ].join("\n"), currentUser);
}

async function generateMemo(selectedTasks, currentUser, onStatus) {
  const config = getConfig();
  if (config.aiMode === "browser") {
    const safetyStatus = getBrowserAiSafetyStatus();
    if (!safetyStatus.safe) {
      return [
        "[Browser AI skipped for device safety.]",
        "",
        safetyStatus.reason,
        "",
        createLocalMemo(selectedTasks, currentUser)
      ].join("\n");
    }

    onStatus?.("Preparing browser AI...\n\nThe first load downloads the model into the browser and may take a few minutes.");

    try {
      const engine = await getBrowserAiEngine(onStatus);
      onStatus?.("Generating memo with the in-browser AI model...");

      const response = await engine.chat.completions.create({
        messages: [
          {
            role: "system",
            content: "You produce concise executive memos and do not invent facts beyond the supplied task list."
          },
          {
            role: "user",
            content: buildBrowserAiPrompt(selectedTasks, currentUser)
          }
        ],
        temperature: 0.2,
        max_tokens: 320
      });

      const content = response?.choices?.[0]?.message?.content?.trim();
      return content || createLocalMemo(selectedTasks, currentUser);
    } catch (error) {
      console.error("Browser AI failed, using local memo fallback", error);
      return [
        "[Browser AI unavailable. Showing local memo fallback.]",
        "",
        createLocalMemo(selectedTasks, currentUser)
      ].join("\n");
    }
  }

  if (config.aiMode === "ollama") {
    if (config.localAiPolish !== true) {
      return createLocalMemo(selectedTasks, currentUser);
    }

    const localAiEndpoint = config.localAiEndpoint || "http://127.0.0.1:11434/api/generate";
    const localAiModel = config.localAiModel || "llama3.2:1b";
    const prompt = [
      "Write a concise executive email memo in plain text.",
      "Do not use markdown, asterisks, bold formatting, brackets, or placeholders.",
      "Do not write MEMORANDUM in all caps.",
      "Use this structure exactly: To, From, Subject, Summary, Key Highlights, Next-Week Priorities, Challenges and Risks, Recommended Executive Actions.",
      "Use short numbered points under the sections where helpful.",
      "Keep the memo clean, professional, and under 220 words.",
      "Use department names only when referring to work items. Do not mention individual task owners or submitter names in the body.",
      "Do not mention due dates, submission dates, or deadlines unless they are explicitly written inside the task title or description.",
      "Do not infer new priorities, risks, or actions that are not present in the selected tasks.",
      "If no items exist for a section, write exactly one line: 'No new activities selected.', 'No new priorities selected.', or 'No new risks selected.' as applicable.",
      "If there is no clear executive action from the selected items, write: 'No immediate executive action is required based on the selected items.'",
      "",
      JSON.stringify({
        requester: currentUser.name,
        tasks: buildMemoTaskPayload(selectedTasks)
      }, null, 2)
    ].join("\n");

    try {
      const response = await fetch(localAiEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: localAiModel,
          prompt,
          stream: false,
          options: {
            temperature: 0.2,
            num_predict: 220
          }
        })
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || "Local AI request failed");
      }

      return cleanMemoText(payload.response || createLocalMemo(selectedTasks, currentUser), currentUser);
    } catch (error) {
      console.error("Local Ollama request failed, using fallback memo", error);
      return createLocalMemo(selectedTasks, currentUser);
    }
  }

  if (!config.memoEndpoint || config.aiMode === "demo") {
    return createLocalMemo(selectedTasks, currentUser);
  }

  try {
    const headers = {
      "Content-Type": "application/json"
    };

    if (appUsesSupabase()) {
      const accessToken = await window.SupabaseService.getAccessToken();
      if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`;
      }
    }

    const response = await fetch(config.memoEndpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({
        user: currentUser,
        tasks: selectedTasks
      })
    });

    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload?.error || "Memo generation failed");
    }

    return payload.memo || createLocalMemo(selectedTasks, currentUser);
  } catch (error) {
    console.error("Private memo endpoint failed, using fallback memo", error);
    return createLocalMemo(selectedTasks, currentUser);
  }
}

function renderLoginPage(state) {
  const form = document.getElementById("loginForm");
  if (!form) {
    return;
  }

  const loginFeedback = document.getElementById("loginFeedback");
  const loginEmail = document.getElementById("loginEmail");
  const loginPassword = document.getElementById("loginPassword");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const email = loginEmail.value.trim().toLowerCase();
    const password = loginPassword.value;

    try {
      if (appUsesSupabase()) {
        await window.SupabaseService.signIn(email, password);
        const bootState = await getBootState();

        saveSession({
          userId: bootState.currentUserId,
          loggedInAt: new Date().toISOString(),
          mode: "supabase"
        });
        loginFeedback.textContent = "Welcome back. Redirecting...";
        window.location.href = "index.html";
        return;
      }

      const matchedUser = state.users.find((user) => user.email.toLowerCase() === email && user.password === password);

      if (!matchedUser) {
        loginFeedback.textContent = "Invalid email or password. Please try again.";
        return;
      }

      const nextState = syncCurrentUser(state, matchedUser.id);
      saveSession({
        userId: matchedUser.id,
        loggedInAt: new Date().toISOString(),
        mode: "demo"
      });
      loginFeedback.textContent = `Welcome ${matchedUser.name}. Redirecting...`;
      saveState(nextState);
      window.location.href = "index.html";
    } catch (error) {
      console.error(error);
      loginFeedback.textContent = appUsesSupabase()
        ? `Supabase sign-in failed: ${error?.message || "Unknown authentication error."}`
        : "Invalid email or password. Please try again.";
    }
  });
}

function renderExecutivePage(state) {
  const taskResults = document.getElementById("taskResults");
  if (!taskResults) {
    return;
  }

  const weekFilter = document.getElementById("weekFilter");
  const departmentFilter = document.getElementById("departmentFilter");
  const categoryFilter = document.getElementById("categoryFilter");
  const memoOutput = document.getElementById("memoOutput");
  const generateMemoButton = document.getElementById("generateMemoButton");
  const copyMemoButton = document.getElementById("copyMemoButton");
  const selectionStatus = document.getElementById("selectionStatus");
  const clearSelectionButton = document.getElementById("clearSelectionButton");
  const execStatCards = document.getElementById("execStatCards");
  const privacyModeLabel = document.getElementById("privacyModeLabel");
  const currentUser = getCurrentUser(state);
  const allTasks = flattenTasks(state).sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt));
  const selectedTaskIds = new Set();

  if (getConfig().aiMode === "browser") {
    privacyModeLabel.textContent = getBrowserAiSafetyStatus().reason;
  } else if (getConfig().aiMode === "ollama") {
    privacyModeLabel.textContent = "Local Ollama model configured";
  } else {
    privacyModeLabel.textContent = getConfig().memoEndpoint && getConfig().aiMode !== "demo"
      ? "Private hosted memo endpoint configured"
      : "Built-in fallback summarizer active";
  }

  weekFilter.innerHTML = [
    `<option value="all">All weeks</option>`,
    ...getUniqueWeeks(state).map((week) => `<option value="${week}">${formatPrettyDate(week)}</option>`)
  ].join("");

  departmentFilter.innerHTML = [
    `<option value="all">All departments</option>`,
    ...getUniqueDepartments(state).map((department) => `<option value="${department}">${department}</option>`)
  ].join("");

  weekFilter.value = getLatestWeek(state);

  function getFilteredTasks() {
    return allTasks.filter((task) => {
      const weekMatches = weekFilter.value === "all" || task.weekEnding === weekFilter.value;
      const departmentMatches = departmentFilter.value === "all" || task.department === departmentFilter.value;
      const categoryMatches = categoryFilter.value === "all" || task.category === categoryFilter.value;
      return weekMatches && departmentMatches && categoryMatches;
    });
  }

  function updateSelectionLabel() {
    selectionStatus.textContent = `${selectedTaskIds.size} tasks selected`;
  }

  function renderStats(filteredTasks) {
    const cards = [
      {
        label: "Visible Tasks",
        value: filteredTasks.length,
        note: "Matching the current filters"
      },
      {
        label: "Departments",
        value: new Set(filteredTasks.map((task) => task.department)).size,
        note: "Represented in this view"
      },
      {
        label: "Risks",
        value: categoryCount(filteredTasks, "risks"),
        note: "Potential escalation items"
      },
      {
        label: "Selected",
        value: selectedTaskIds.size,
        note: "Included in memo draft"
      }
    ];
    execStatCards.innerHTML = buildSummaryCardsHtml(cards);
  }

  function renderTasks() {
    const filteredTasks = getFilteredTasks();
    taskResults.innerHTML = buildTaskResultsHtml(filteredTasks, selectedTaskIds);
    renderStats(filteredTasks);
    updateSelectionLabel();

    document.querySelectorAll("[data-task-id]").forEach((checkbox) => {
      checkbox.addEventListener("change", (event) => {
        const taskId = event.target.dataset.taskId;
        if (event.target.checked) {
          selectedTaskIds.add(taskId);
        } else {
          selectedTaskIds.delete(taskId);
        }
        renderStats(filteredTasks);
        updateSelectionLabel();
      });
    });
  }

  [weekFilter, departmentFilter, categoryFilter].forEach((element) => {
    element.addEventListener("change", renderTasks);
  });

  clearSelectionButton.addEventListener("click", () => {
    selectedTaskIds.clear();
    memoOutput.textContent = "Selection cleared. Choose tasks to generate a new memo draft.";
    renderTasks();
  });

  generateMemoButton.addEventListener("click", async () => {
    const selectedTasks = allTasks.filter((task) => selectedTaskIds.has(task.id));
    if (!selectedTasks.length) {
      memoOutput.textContent = "Select at least one task before generating a memo.";
      return;
    }

    memoOutput.textContent = "Generating memo...";
    try {
      const memo = await generateMemo(selectedTasks, currentUser, (statusText) => {
        memoOutput.textContent = statusText;
      });
      memoOutput.textContent = memo;
    } catch (error) {
      console.error(error);
      memoOutput.textContent = "Memo generation failed. The local summarizer or configured endpoint could not complete the request.";
    }
  });

  copyMemoButton.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(memoOutput.textContent);
      memoOutput.textContent = `${memoOutput.textContent}\n\nCopied to clipboard.`;
    } catch (error) {
      console.error("Copy failed", error);
    }
  });

  if (currentUser.role !== "Executive") {
    memoOutput.textContent = "Tip: switch to an executive user from the sidebar to review the full executive experience.";
  }

  renderTasks();
}

function buildAdminUserListHtml(users) {
  if (!users.length) {
    return `<div class="empty-state">No users were found.</div>`;
  }

  return users.map((user) => `
    <article class="directory-card">
      <div class="directory-card-header">
        <div>
          <h4>${user.name}</h4>
          <p class="list-meta">${user.email}</p>
        </div>
        <span class="role-badge ${getRoleBadgeClass(user.role)}">${user.role}</span>
      </div>
      <p class="list-meta">${user.department}</p>
    </article>
  `).join("");
}

function buildDepartmentListHtml(departments, users) {
  if (!departments.length) {
    return `<div class="empty-state">No departments were found.</div>`;
  }

  return departments.map((department) => {
    const departmentCount = users.filter((user) => user.department === department.name).length;
    return `
      <article class="directory-card">
        <div class="directory-card-header">
          <h4>${department.name}</h4>
          <span class="status-pill">${departmentCount} users</span>
        </div>
      </article>
    `;
  }).join("");
}

function renderAdminPage(state) {
  const currentUser = getCurrentUser(state);
  const accessNotice = document.getElementById("adminAccessNotice");
  const adminContent = document.getElementById("adminContent");
  const createUserForm = document.getElementById("adminCreateUserForm");
  const createFeedback = document.getElementById("adminCreateFeedback");
  const adminStatCards = document.getElementById("adminStatCards");
  const adminUserList = document.getElementById("adminUserList");
  const adminDepartmentList = document.getElementById("adminDepartmentList");
  const departmentSelect = document.getElementById("adminDepartment");

  if (!accessNotice || !adminContent || !createUserForm || !createFeedback || !adminStatCards || !adminUserList || !adminDepartmentList || !departmentSelect) {
    return;
  }

  if (!isAdminUser(currentUser)) {
    accessNotice.classList.remove("hidden-panel");
    adminContent.classList.add("hidden-panel");
    return;
  }

  let adminData = {
    users: state.users,
    departments: []
  };

  async function loadAdminData() {
    if (appUsesSupabase()) {
      adminData = await window.SupabaseService.fetchAdminData();
    } else {
      adminData = {
        users: state.users,
        departments: getUniqueDepartments(state).map((name) => ({ id: name, name }))
      };
    }

    departmentSelect.innerHTML = adminData.departments.map((department) => `
      <option value="${department.id}">${department.name}</option>
    `).join("");

    adminStatCards.innerHTML = buildSummaryCardsHtml([
      {
        label: "Total Users",
        value: adminData.users.length,
        note: "Profiles currently configured"
      },
      {
        label: "Executives",
        value: adminData.users.filter((user) => user.role === "Executive").length,
        note: "Users with full visibility"
      },
      {
        label: "Admins",
        value: adminData.users.filter((user) => user.role === "Admin").length,
        note: "Users who manage access"
      },
      {
        label: "Department Heads",
        value: adminData.users.filter((user) => user.role === "Department Head").length,
        note: "Weekly update owners"
      }
    ]);

    adminUserList.innerHTML = buildAdminUserListHtml(adminData.users);
    adminDepartmentList.innerHTML = buildDepartmentListHtml(adminData.departments, adminData.users);
  }

  createUserForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const config = getConfig();
    const endpoint = config.adminUserEndpoint || "";
    const accessToken = appUsesSupabase() ? await window.SupabaseService.getAccessToken() : "";

    if (!endpoint) {
      createFeedback.textContent = "Admin user creation endpoint is not configured. Set `adminUserEndpoint` in `config.js` and deploy the `/functions/api/admin-users` route.";
      return;
    }

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
        },
        body: JSON.stringify({
          fullName: document.getElementById("adminFullName").value.trim(),
          email: document.getElementById("adminEmail").value.trim().toLowerCase(),
          password: document.getElementById("adminPassword").value,
          role: document.getElementById("adminRole").value,
          departmentId: document.getElementById("adminDepartment").value
        })
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || "User creation failed.");
      }

      createFeedback.textContent = "User created successfully.";
      createUserForm.reset();
      await loadAdminData();
    } catch (error) {
      console.error(error);
      createFeedback.textContent = error.message || "User creation failed.";
    }
  });

  loadAdminData().catch((error) => {
    console.error("Failed to load admin data", error);
    createFeedback.textContent = "Unable to load admin data.";
  });
}

async function initApp() {
  const page = document.body.dataset.page;
  const state = loadState();
  const localSession = getSession();
  const activeSession = await hasAppSession();

  if (page === "login") {
    if (activeSession) {
      try {
        await getBootState();
        window.location.href = "index.html";
        return;
      } catch (error) {
        console.error("Existing session is invalid for app boot", error);
        await resetAppSession();
      }
    }
    renderLoginPage(state);
    return;
  }

  if (!activeSession) {
    await resetAppSession();
    window.location.href = "login.html";
    return;
  }

  const resolvedState = await getBootState();
  const sessionUserId = appUsesSupabase() ? resolvedState.currentUserId : localSession?.userId;
  const syncedState = syncCurrentUser(resolvedState, sessionUserId || resolvedState.currentUserId);
  saveSession({
    userId: syncedState.currentUserId,
    loggedInAt: localSession?.loggedInAt || new Date().toISOString(),
    mode: appUsesSupabase() ? "supabase" : "demo"
  });
  renderGlobalShell(syncedState);

  if (page === "home") {
    renderHomePage(syncedState);
  }
  if (page === "submit") {
    renderSubmitPage(syncedState);
  }
  if (page === "executive") {
    renderExecutivePage(syncedState);
  }
  if (page === "admin") {
    renderAdminPage(syncedState);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  initApp().catch((error) => {
    console.error("App initialization failed", error);
    if (document.body.dataset.page === "login") {
      const loginFeedback = document.getElementById("loginFeedback");
      if (loginFeedback) {
        loginFeedback.textContent = `App boot failed: ${error?.message || "Unknown initialization error."}`;
      }
      return;
    }

    if (document.body.dataset.page !== "login") {
      resetAppSession().finally(() => {
        window.location.href = "login.html";
      });
    }
  });
});
