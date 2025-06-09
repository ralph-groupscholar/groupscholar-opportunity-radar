const STORAGE_KEY = "gs_opportunity_radar_custom_v1";
const WATCH_KEY = "gs_opportunity_radar_watch_v1";

const selectors = {
  search: document.getElementById("search"),
  type: document.getElementById("type"),
  stage: document.getElementById("stage"),
  region: document.getElementById("region"),
  window: document.getElementById("window"),
  sort: document.getElementById("sort"),
  list: document.getElementById("opportunityList"),
  count: document.getElementById("resultsCount"),
  metrics: document.getElementById("metricGrid"),
  pipeline: document.getElementById("pipelineHealth"),
  signalGrid: document.getElementById("signalGrid"),
  actionSummary: document.getElementById("actionSummary"),
  actionQueue: document.getElementById("actionQueue"),
  readinessSummary: document.getElementById("readinessSummary"),
  readinessList: document.getElementById("readinessList"),
  export: document.getElementById("exportCsv"),
  exportCalendar: document.getElementById("exportCalendar"),
  reset: document.getElementById("resetFilters"),
  form: document.getElementById("addForm"),
  briefOutput: document.getElementById("briefOutput"),
  generateBrief: document.getElementById("generateBrief"),
  copyBrief: document.getElementById("copyBrief"),
};

const state = {
  opportunities: [],
  watchlist: new Set(),
  filters: {
    search: "",
    type: "all",
    stage: "all",
    region: "all",
    window: "all",
    sort: "deadline",
  },
};

const daysBetween = (target) => {
  const now = new Date();
  const date = new Date(target + "T00:00:00");
  return Math.ceil((date - now) / (1000 * 60 * 60 * 24));
};

const formatCurrency = (value) =>
  value
    ? value.toLocaleString("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      })
    : "N/A";

const formatDate = (value) =>
  new Date(value + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

const formatIcsDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}${month}${day}`;
};

const escapeIcs = (value) =>
  String(value || "")
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");

const loadCustom = () => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch (error) {
    return [];
  }
};

const saveCustom = (items) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
};

const loadWatchlist = () => {
  try {
    const data = JSON.parse(localStorage.getItem(WATCH_KEY)) || [];
    return new Set(data);
  } catch (error) {
    return new Set();
  }
};

const saveWatchlist = () => {
  localStorage.setItem(WATCH_KEY, JSON.stringify([...state.watchlist]));
};

const hydrate = () => {
  const custom = loadCustom();
  state.watchlist = loadWatchlist();
  state.opportunities = [...baseOpportunities, ...custom];
};

const unique = (items) => [...new Set(items)].sort();

const setupFilters = () => {
  const types = unique(state.opportunities.map((item) => item.type));
  const stages = unique(state.opportunities.map((item) => item.stage));
  const regions = unique(state.opportunities.map((item) => item.region));

  const addOptions = (select, values) => {
    values.forEach((value) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = value;
      select.append(option);
    });
  };

  addOptions(selectors.type, types);
  addOptions(selectors.stage, stages);
  addOptions(selectors.region, regions);
};

const getFiltered = () => {
  const { search, type, stage, region, window, sort } = state.filters;

  let filtered = state.opportunities.filter((item) => {
    const matchesSearch = [item.name, item.owner, item.focus]
      .join(" ")
      .toLowerCase()
      .includes(search.toLowerCase());
    const matchesType = type === "all" || item.type === type;
    const matchesStage = stage === "all" || item.stage === stage;
    const matchesRegion = region === "all" || item.region === region;
    const days = daysBetween(item.deadline);

    let matchesWindow = true;
    if (window === "overdue") {
      matchesWindow = days < 0;
    } else if (window !== "all") {
      matchesWindow = days >= 0 && days <= Number(window);
    }

    return matchesSearch && matchesType && matchesStage && matchesRegion && matchesWindow;
  });

  if (sort === "fit") {
    filtered = filtered.sort((a, b) => b.fit - a.fit);
  } else if (sort === "funding") {
    filtered = filtered.sort((a, b) => b.funding - a.funding);
  } else {
    filtered = filtered.sort(
      (a, b) => daysBetween(a.deadline) - daysBetween(b.deadline)
    );
  }

  return filtered;
};

const renderMetrics = (items) => {
  const dueSoon = items.filter((item) => {
    const days = daysBetween(item.deadline);
    return days >= 0 && days <= 30;
  });
  const highFit = items.filter((item) => item.fit >= 4);
  const avgFit =
    items.reduce((sum, item) => sum + item.fit, 0) / (items.length || 1);

  const metrics = [
    { label: "Active", value: items.length },
    { label: "Due in 30 days", value: dueSoon.length },
    { label: "High fit (4+)", value: highFit.length },
    { label: "Avg fit", value: avgFit.toFixed(1) },
  ];

  selectors.metrics.innerHTML = "";
  metrics.forEach((metric) => {
    const card = document.createElement("div");
    card.className = "metric";
    card.innerHTML = `<span>${metric.label}</span><strong>${metric.value}</strong>`;
    selectors.metrics.append(card);
  });
};

const renderSignals = (items) => {
  const soonest = [...items].sort(
    (a, b) => daysBetween(a.deadline) - daysBetween(b.deadline)
  )[0];
  const highestFunding = [...items].sort((a, b) => b.funding - a.funding)[0];
  const watchlist = items.filter((item) => state.watchlist.has(item.id));

  const signals = [
    {
      title: "Deadline pulse",
      body: soonest
        ? `${soonest.name} is due in ${daysBetween(soonest.deadline)} days.`
        : "No deadlines in view.",
    },
    {
      title: "Biggest award",
      body: highestFunding
        ? `${highestFunding.name} offers ${formatCurrency(highestFunding.funding)}.`
        : "Funding signal not available.",
    },
    {
      title: "Watchlist focus",
      body: watchlist.length
        ? `${watchlist.length} opportunities flagged for leadership review.`
        : "Nothing on the watchlist yet.",
    },
  ];

  selectors.signalGrid.innerHTML = "";
  signals.forEach((signal) => {
    const card = document.createElement("div");
    card.className = "signal-card";
    card.innerHTML = `<h4>${signal.title}</h4><p>${signal.body}</p>`;
    selectors.signalGrid.append(card);
  });
};

const renderPipeline = (items) => {
  const stageCounts = items.reduce((acc, item) => {
    acc[item.stage] = (acc[item.stage] || 0) + 1;
    return acc;
  }, {});
  const topStage = Object.entries(stageCounts).sort((a, b) => b[1] - a[1])[0];
  const overdue = items.filter((item) => daysBetween(item.deadline) < 0).length;

  const health = [
    {
      label: "Most common stage",
      value: topStage ? `${topStage[0]} (${topStage[1]})` : "N/A",
    },
    { label: "Overdue", value: overdue },
    { label: "Watchlist", value: state.watchlist.size },
  ];

  selectors.pipeline.innerHTML = "";
  health.forEach((item) => {
    const row = document.createElement("div");
    row.className = "health-item";
    row.innerHTML = `<span>${item.label}</span><strong>${item.value}</strong>`;
    selectors.pipeline.append(row);
  });
};

const actionPriority = (days) => {
  if (days < 0) return 0;
  if (days <= 7) return 1;
  if (days <= 14) return 2;
  if (days <= 30) return 3;
  return 4;
};

const actionLabel = (days) => {
  if (days < 0) return "Overdue";
  if (days <= 7) return "Due this week";
  if (days <= 14) return "Due in 2 weeks";
  if (days <= 30) return "Due this month";
  return "Future window";
};

const actionRecommendation = (item, days) => {
  const stage = item.stage.toLowerCase();
  if (days < 0) {
    return "Escalate deadline: request extension or close out.";
  }
  if (days <= 7) {
    if (stage.includes("review") || stage.includes("final") || stage.includes("submit")) {
      return "Finalize submission and confirm upload.";
    }
    if (stage.includes("draft") || stage.includes("application")) {
      return "Complete draft and route for review.";
    }
    return "Lock requirements, assign reviewers, and draft package.";
  }
  if (days <= 14) {
    if (stage.includes("research") || stage.includes("discovery") || stage.includes("scoping")) {
      return "Confirm eligibility and gather requirements.";
    }
    if (stage.includes("outreach") || stage.includes("partner")) {
      return "Schedule partner check-in and confirm intent.";
    }
    return "Outline submission plan and assign owners.";
  }
  if (days <= 30) {
    return "Build submission plan and start early drafts.";
  }
  return "Monitor timeline and confirm monthly cadence.";
};

const renderActionSummary = (items) => {
  const overdue = items.filter((item) => daysBetween(item.deadline) < 0).length;
  const dueWeek = items.filter((item) => {
    const days = daysBetween(item.deadline);
    return days >= 0 && days <= 7;
  }).length;
  const dueTwoWeeks = items.filter((item) => {
    const days = daysBetween(item.deadline);
    return days >= 0 && days <= 14;
  }).length;
  const dueMonth = items.filter((item) => {
    const days = daysBetween(item.deadline);
    return days >= 0 && days <= 30;
  }).length;

  const summary = [
    { label: "Overdue", value: overdue },
    { label: "Due in 7d", value: dueWeek },
    { label: "Due in 14d", value: dueTwoWeeks },
    { label: "Due in 30d", value: dueMonth },
  ];

  selectors.actionSummary.innerHTML = "";
  summary.forEach((item) => {
    const chip = document.createElement("div");
    chip.className = "action-chip";
    chip.innerHTML = `<span>${item.label}</span><strong>${item.value}</strong>`;
    selectors.actionSummary.append(chip);
  });
};

const renderActionQueue = (items) => {
  const queue = items
    .map((item) => {
      const days = daysBetween(item.deadline);
      return {
        ...item,
        days,
        priority: actionPriority(days),
        label: actionLabel(days),
        recommendation: actionRecommendation(item, days),
      };
    })
    .sort(
      (a, b) =>
        a.priority - b.priority ||
        a.days - b.days ||
        b.fit - a.fit ||
        b.funding - a.funding
    )
    .slice(0, 8);

  selectors.actionQueue.innerHTML = "";

  if (!queue.length) {
    selectors.actionQueue.innerHTML =
      "<div class='action-empty'>No active opportunities in view.</div>";
    return;
  }

  queue.forEach((item) => {
    const card = document.createElement("div");
    card.className = "action-item";
    card.innerHTML = `
      <div>
        <h4>${item.name}</h4>
        <p>${item.recommendation}</p>
        <div class="meta">Owner: ${item.owner} · ${item.stage}</div>
      </div>
      <div class="action-meta">
        <span>${item.label}</span>
        <strong>${formatDate(item.deadline)}</strong>
      </div>
    `;
    selectors.actionQueue.append(card);
  });
};

const readinessTask = (item, days) => {
  const stage = item.stage.toLowerCase();
  if (days < 0) {
    return "Decide extension or archive the submission.";
  }
  if (days <= 7) {
    if (stage.includes("review") || stage.includes("final") || stage.includes("submit")) {
      return "QA submission package and submit.";
    }
    if (stage.includes("draft") || stage.includes("application")) {
      return "Finalize narrative, budget, and artifacts.";
    }
    return "Lock requirements and confirm attachments.";
  }
  if (days <= 14) {
    if (stage.includes("research") || stage.includes("discovery") || stage.includes("scoping")) {
      return "Confirm eligibility and gather requirements.";
    }
    if (stage.includes("outreach") || stage.includes("partner")) {
      return "Confirm partner commitment and letters.";
    }
    return "Draft outline and assign writers.";
  }
  if (days <= 30) {
    return "Schedule kickoff and set a weekly prep cadence.";
  }
  return "Monitor timeline and confirm monthly check-in.";
};

const formatOwnerList = (owners) => {
  const list = [...owners];
  const shown = list.slice(0, 3);
  const extra = list.length - shown.length;
  return extra > 0 ? `${shown.join(", ")} +${extra}` : shown.join(", ");
};

const renderReadiness = (items) => {
  if (!selectors.readinessList || !selectors.readinessSummary) {
    return;
  }

  const taskMap = new Map();
  const owners = new Set();
  let nextDue = null;
  let overdue = 0;

  items.forEach((item) => {
    const days = daysBetween(item.deadline);
    const task = readinessTask(item, days);
    owners.add(item.owner);

    if (days < 0) {
      overdue += 1;
    } else if (nextDue === null || days < nextDue) {
      nextDue = days;
    }

    if (!taskMap.has(task)) {
      taskMap.set(task, { count: 0, soonest: days, owners: new Set() });
    }
    const entry = taskMap.get(task);
    entry.count += 1;
    entry.soonest = Math.min(entry.soonest, days);
    entry.owners.add(item.owner);
  });

  const nextDueLabel = nextDue === null ? "N/A" : `${nextDue}d`;
  const summary = [
    { label: "Prep tasks", value: taskMap.size },
    { label: "Owners", value: owners.size },
    { label: "Next due", value: nextDueLabel },
    { label: "Overdue", value: overdue },
  ];

  selectors.readinessSummary.innerHTML = "";
  summary.forEach((item) => {
    const chip = document.createElement("div");
    chip.className = "readiness-chip";
    chip.innerHTML = `<span>${item.label}</span><strong>${item.value}</strong>`;
    selectors.readinessSummary.append(chip);
  });

  const tasks = [...taskMap.entries()]
    .map(([task, info]) => ({ task, ...info }))
    .sort(
      (a, b) =>
        b.count - a.count ||
        a.soonest - b.soonest ||
        a.task.localeCompare(b.task)
    )
    .slice(0, 5);

  selectors.readinessList.innerHTML = "";

  if (!tasks.length) {
    selectors.readinessList.innerHTML =
      "<div class='readiness-empty'>No readiness tasks yet. Adjust filters.</div>";
    return;
  }

  tasks.forEach((item) => {
    const card = document.createElement("div");
    const soonestLabel =
      item.soonest < 0 ? `${Math.abs(item.soonest)}d overdue` : `${item.soonest}d`;
    card.className = "readiness-item";
    card.innerHTML = `
      <div>
        <h4>${item.task}</h4>
        <p>${item.count} opportunities · Owners: ${formatOwnerList(item.owners)}</p>
      </div>
      <div class="readiness-meta">
        <span>Next due</span>
        <strong>${soonestLabel}</strong>
      </div>
    `;
    selectors.readinessList.append(card);
  });
};

const renderList = (items) => {
  selectors.list.innerHTML = "";
  selectors.count.textContent = `${items.length} opportunities in view`;

  if (!items.length) {
    selectors.list.innerHTML =
      "<div class='opportunity'>No opportunities match your filters.</div>";
    return;
  }

  items.forEach((item) => {
    const card = document.createElement("div");
    card.className = "opportunity";

    const days = daysBetween(item.deadline);
    const watchActive = state.watchlist.has(item.id);

    card.innerHTML = `
      <header>
        <div>
          <h3>${item.name}</h3>
          <div class="meta">
            <span class="tag">${item.type}</span>
            <span class="tag">${item.stage}</span>
            <span class="tag">${item.region}</span>
          </div>
        </div>
        <div>
          <strong>${formatCurrency(item.funding)}</strong>
          <div class="meta">Fit ${item.fit} · Due ${item.deadline}</div>
        </div>
      </header>
      <p>${item.focus}</p>
      <div class="meta">Owner: ${item.owner} · ${
        days >= 0 ? `${days} days remaining` : `${Math.abs(days)} days overdue`
      }</div>
      <div class="actions">
        <button class="watch ${watchActive ? "active" : ""}" data-id="${item.id}">
          ${watchActive ? "On watchlist" : "Add to watchlist"}
        </button>
        <button class="copy" data-link="${item.link}">Copy link</button>
        ${item.custom ? `<button class="remove" data-id="${item.id}">Remove</button>` : ""}
      </div>
    `;

    selectors.list.append(card);
  });
};

const render = () => {
  const filtered = getFiltered();
  renderMetrics(state.opportunities);
  renderSignals(filtered);
  renderPipeline(state.opportunities);
  renderActionSummary(filtered);
  renderActionQueue(filtered);
  renderReadiness(filtered);
  renderList(filtered);
};

const addOpportunity = (formData) => {
  const custom = loadCustom();
  const entry = {
    id: `custom-${Date.now()}`,
    name: formData.get("name"),
    deadline: formData.get("deadline"),
    region: formData.get("region"),
    type: formData.get("type"),
    stage: formData.get("stage"),
    owner: formData.get("owner"),
    funding: Number(formData.get("funding")) || 0,
    fit: Number(formData.get("fit")) || 3,
    focus: formData.get("focus") || "",
    link: formData.get("link") || "",
    custom: true,
  };

  custom.push(entry);
  saveCustom(custom);
  hydrate();
  render();
};

const removeOpportunity = (id) => {
  const custom = loadCustom();
  const updated = custom.filter((item) => item.id !== id);
  saveCustom(updated);
  if (state.watchlist.has(id)) {
    state.watchlist.delete(id);
    saveWatchlist();
  }
  hydrate();
  render();
};

const buildBrief = (items) => {
  if (!items.length) {
    return "No opportunities match the current filters. Adjust filters to generate a briefing.";
  }

  const today = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const overdue = items.filter((item) => daysBetween(item.deadline) < 0);
  const urgent = items.filter((item) => {
    const days = daysBetween(item.deadline);
    return days >= 0 && days <= 14;
  });
  const highFit = items
    .filter((item) => item.fit >= 4)
    .sort((a, b) => b.fit - a.fit || b.funding - a.funding)
    .slice(0, 5);
  const topFunding = [...items]
    .sort((a, b) => b.funding - a.funding)
    .slice(0, 3);
  const watchlist = items.filter((item) => state.watchlist.has(item.id));

  const lineFor = (item) => {
    const days = daysBetween(item.deadline);
    const dayLabel = days >= 0 ? `${days}d` : `${Math.abs(days)}d overdue`;
    return `- ${item.name} — ${formatDate(item.deadline)} (${dayLabel}) · ${item.owner}`;
  };

  const section = (title, list, fallback) => {
    if (!list.length) {
      return `${title}\n${fallback}`;
    }
    return `${title}\n${list.map(lineFor).join("\n")}`;
  };

  return [
    `Group Scholar Opportunity Radar Brief — ${today}`,
    "",
    `Active opportunities: ${items.length}`,
    `Due in 30 days: ${items.filter((item) => {
      const days = daysBetween(item.deadline);
      return days >= 0 && days <= 30;
    }).length}`,
    `High-fit (4+): ${items.filter((item) => item.fit >= 4).length}`,
    `Watchlist: ${watchlist.length}`,
    "",
    section("Overdue", overdue, "No overdue opportunities."),
    "",
    section("Urgent (next 14 days)", urgent, "No urgent deadlines in the next two weeks."),
    "",
    section("High-fit focus", highFit, "No high-fit opportunities in view."),
    "",
    section(
      "Top funding (for leadership review)",
      topFunding,
      "No funding data available."
    ),
    "",
    section(
      "Watchlist priorities",
      watchlist,
      "No watchlist items selected yet."
    ),
  ].join("\n");
};

const exportCsv = () => {
  const headers = [
    "Name",
    "Deadline",
    "Region",
    "Type",
    "Stage",
    "Owner",
    "Funding",
    "Fit",
    "Focus",
    "Link",
  ];

  const rows = state.opportunities.map((item) => [
    item.name,
    item.deadline,
    item.region,
    item.type,
    item.stage,
    item.owner,
    item.funding,
    item.fit,
    item.focus,
    item.link,
  ]);

  const csv = [headers, ...rows]
    .map((row) => row.map((value) => `"${String(value).replace(/"/g, "\"\"")}"`).join(","))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "group-scholar-opportunity-radar.csv";
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

const exportCalendar = () => {
  const items = getFiltered();
  if (!items.length) {
    alert("No opportunities match the current filters to export.");
    return;
  }

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Group Scholar//Opportunity Radar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];

  items.forEach((item) => {
    const start = new Date(`${item.deadline}T00:00:00`);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    const descriptionParts = [
      `Owner: ${item.owner}`,
      item.focus ? `Focus: ${item.focus}` : "",
      `Fit: ${item.fit}`,
      item.funding ? `Funding: ${formatCurrency(item.funding)}` : "Funding: N/A",
      `Region: ${item.region}`,
      `Stage: ${item.stage}`,
      item.link ? `Link: ${item.link}` : "",
    ].filter(Boolean);

    lines.push(
      "BEGIN:VEVENT",
      `UID:${escapeIcs(item.id)}@groupscholar-opportunity-radar`,
      `SUMMARY:${escapeIcs(`${item.name} (${item.stage})`)}`,
      `DTSTART;VALUE=DATE:${formatIcsDate(start)}`,
      `DTEND;VALUE=DATE:${formatIcsDate(end)}`,
      `DESCRIPTION:${escapeIcs(descriptionParts.join("\n"))}`,
      "END:VEVENT"
    );
  });

  lines.push("END:VCALENDAR");

  const blob = new Blob([lines.join("\r\n")], { type: "text/calendar" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "group-scholar-opportunity-deadlines.ics";
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

const bindEvents = () => {
  selectors.search.addEventListener("input", (event) => {
    state.filters.search = event.target.value;
    render();
  });

  ["type", "stage", "region", "window", "sort"].forEach((key) => {
    selectors[key].addEventListener("change", (event) => {
      state.filters[key] = event.target.value;
      render();
    });
  });

  selectors.list.addEventListener("click", (event) => {
    const target = event.target;
    if (target.classList.contains("watch")) {
      const id = target.dataset.id;
      if (state.watchlist.has(id)) {
        state.watchlist.delete(id);
      } else {
        state.watchlist.add(id);
      }
      saveWatchlist();
      render();
    }

    if (target.classList.contains("copy")) {
      const link = target.dataset.link;
      if (link) {
        navigator.clipboard.writeText(link);
        target.textContent = "Link copied";
        setTimeout(() => {
          target.textContent = "Copy link";
        }, 1200);
      }
    }

    if (target.classList.contains("remove")) {
      removeOpportunity(target.dataset.id);
    }
  });

  selectors.export.addEventListener("click", exportCsv);
  selectors.exportCalendar.addEventListener("click", exportCalendar);

  selectors.generateBrief.addEventListener("click", () => {
    selectors.briefOutput.value = buildBrief(getFiltered());
  });

  selectors.copyBrief.addEventListener("click", () => {
    const content = selectors.briefOutput.value.trim();
    if (!content) {
      selectors.briefOutput.value = buildBrief(getFiltered());
    }
    navigator.clipboard.writeText(selectors.briefOutput.value);
    selectors.copyBrief.textContent = "Copied";
    setTimeout(() => {
      selectors.copyBrief.textContent = "Copy to clipboard";
    }, 1200);
  });

  selectors.reset.addEventListener("click", () => {
    state.filters = {
      search: "",
      type: "all",
      stage: "all",
      region: "all",
      window: "all",
      sort: "deadline",
    };

    selectors.search.value = "";
    selectors.type.value = "all";
    selectors.stage.value = "all";
    selectors.region.value = "all";
    selectors.window.value = "all";
    selectors.sort.value = "deadline";

    render();
  });

  selectors.form.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(event.target);
    addOpportunity(formData);
    event.target.reset();
  });
};

hydrate();
setupFilters();
bindEvents();
render();
