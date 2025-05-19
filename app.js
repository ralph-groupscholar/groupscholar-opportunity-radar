const state = {
  opportunities: [...baseOpportunities],
  custom: [],
  saved: new Set(),
};

const elements = {
  metricGrid: document.getElementById("metricGrid"),
  signalGrid: document.getElementById("signalGrid"),
  opportunityList: document.getElementById("opportunityList"),
  pipelineHealth: document.getElementById("pipelineHealth"),
  resultsCount: document.getElementById("resultsCount"),
  search: document.getElementById("search"),
  type: document.getElementById("type"),
  stage: document.getElementById("stage"),
  region: document.getElementById("region"),
  window: document.getElementById("window"),
  sort: document.getElementById("sort"),
  addForm: document.getElementById("addForm"),
  exportCsv: document.getElementById("exportCsv"),
  resetFilters: document.getElementById("resetFilters"),
};

const today = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
};

const daysLeft = (deadline) => {
  const target = new Date(deadline);
  const diff = target.getTime() - today().getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

const loadCustom = () => {
  const stored = JSON.parse(localStorage.getItem("opportunityRadarCustom") || "[]");
  state.custom = stored;
};

const persistCustom = () => {
  localStorage.setItem("opportunityRadarCustom", JSON.stringify(state.custom));
};

const loadSaved = () => {
  const stored = JSON.parse(localStorage.getItem("opportunityRadarSaved") || "[]");
  state.saved = new Set(stored);
};

const persistSaved = () => {
  localStorage.setItem("opportunityRadarSaved", JSON.stringify(Array.from(state.saved)));
};

const allOpportunities = () => [...state.custom, ...state.opportunities];

const updateFilters = () => {
  const types = new Set(allOpportunities().map((item) => item.type));
  const stages = new Set(allOpportunities().map((item) => item.stage));
  const regions = new Set(allOpportunities().map((item) => item.region));

  const rebuild = (select, values) => {
    select.innerHTML = "";
    const allOption = document.createElement("option");
    allOption.value = "all";
    allOption.textContent = "All";
    select.appendChild(allOption);

    Array.from(values)
      .sort()
      .forEach((value) => {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = value;
        select.appendChild(option);
      });
  };

  rebuild(elements.type, types);
  rebuild(elements.stage, stages);
  rebuild(elements.region, regions);
};

const getFiltered = () => {
  const query = elements.search.value.trim().toLowerCase();
  const type = elements.type.value;
  const stage = elements.stage.value;
  const region = elements.region.value;
  const windowValue = elements.window.value;

  return allOpportunities().filter((opportunity) => {
    const matchesQuery =
      !query ||
      opportunity.name.toLowerCase().includes(query) ||
      opportunity.owner.toLowerCase().includes(query) ||
      opportunity.focus.toLowerCase().includes(query);
    const matchesType = type === "all" || opportunity.type === type;
    const matchesStage = stage === "all" || opportunity.stage === stage;
    const matchesRegion = region === "all" || opportunity.region === region;

    const left = daysLeft(opportunity.deadline);
    const matchesWindow =
      windowValue === "all" ||
      (windowValue === "overdue" && left < 0) ||
      (windowValue !== "overdue" && left <= Number(windowValue) && left >= 0);

    return matchesQuery && matchesType && matchesStage && matchesRegion && matchesWindow;
  });
};

const sortOpportunities = (list) => {
  const sorted = [...list];
  const mode = elements.sort.value;

  if (mode === "fit") {
    sorted.sort((a, b) => b.fit - a.fit);
  } else if (mode === "funding") {
    sorted.sort((a, b) => b.funding - a.funding);
  } else {
    sorted.sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
  }

  return sorted;
};

const renderMetrics = (filtered) => {
  const total = allOpportunities().length;
  const dueSoon = allOpportunities().filter((item) => {
    const left = daysLeft(item.deadline);
    return left >= 0 && left <= 30;
  }).length;
  const averageFit = total
    ? Math.round(allOpportunities().reduce((acc, item) => acc + Number(item.fit), 0) / total)
    : 0;

  elements.metricGrid.innerHTML = "";
  const metrics = [
    { label: "Tracked", value: total },
    { label: "Due ≤30d", value: dueSoon },
    { label: "Avg Fit", value: `${averageFit}/5` },
    { label: "Saved", value: state.saved.size },
  ];

  metrics.forEach((metric) => {
    const div = document.createElement("div");
    div.className = "metric";
    div.innerHTML = `<span>${metric.label}</span><strong>${metric.value}</strong>`;
    elements.metricGrid.appendChild(div);
  });

  elements.resultsCount.textContent = `Showing ${filtered.length} of ${total} opportunities`;
};

const renderSignals = (filtered) => {
  elements.signalGrid.innerHTML = "";
  const byFit = [...filtered].sort((a, b) => b.fit - a.fit).slice(0, 2);
  const dueSoon = [...filtered]
    .filter((item) => daysLeft(item.deadline) >= 0)
    .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
    .slice(0, 2);
  const overdue = filtered.filter((item) => daysLeft(item.deadline) < 0);

  const signals = [
    {
      title: "High-fit focus",
      body: byFit.length
        ? byFit.map((item) => `${item.name} · Fit ${item.fit}`).join("<br />")
        : "No high-fit signals in view.",
    },
    {
      title: "Next deadlines",
      body: dueSoon.length
        ? dueSoon
            .map((item) => `${item.name} · ${daysLeft(item.deadline)} days left`)
            .join("<br />")
        : "No upcoming deadlines in view.",
    },
    {
      title: "Overdue watch",
      body: overdue.length
        ? overdue.map((item) => `${item.name} · overdue`).join("<br />")
        : "No overdue opportunities.",
    },
  ];

  signals.forEach((signal) => {
    const card = document.createElement("div");
    card.className = "signal-card";
    card.innerHTML = `<h4>${signal.title}</h4><p>${signal.body}</p>`;
    elements.signalGrid.appendChild(card);
  });
};

const renderPipelineHealth = () => {
  elements.pipelineHealth.innerHTML = "";
  const stages = ["Ready", "Drafting", "Discovery", "Watchlist"];

  stages.forEach((stage) => {
    const count = allOpportunities().filter((item) => item.stage === stage).length;
    const div = document.createElement("div");
    div.className = "health-item";
    div.innerHTML = `<span>${stage}</span><strong>${count}</strong>`;
    elements.pipelineHealth.appendChild(div);
  });

  const owners = new Set(allOpportunities().map((item) => item.owner));
  const ownerItem = document.createElement("div");
  ownerItem.className = "health-item";
  ownerItem.innerHTML = `<span>Active owners</span><strong>${owners.size}</strong>`;
  elements.pipelineHealth.appendChild(ownerItem);
};

const renderOpportunities = (filtered) => {
  elements.opportunityList.innerHTML = "";

  if (filtered.length === 0) {
    elements.opportunityList.innerHTML =
      "<div class=\"signal-card\"><h4>No opportunities match.</h4><p>Adjust filters to surface more signals.</p></div>";
    return;
  }

  sortOpportunities(filtered).forEach((opportunity) => {
    const card = document.createElement("article");
    card.className = "opportunity";

    const left = daysLeft(opportunity.deadline);
    const deadlineLabel = left < 0 ? `Overdue by ${Math.abs(left)} days` : `${left} days left`;

    const tags = [opportunity.type, opportunity.region, opportunity.stage]
      .map((tag) => `<span class="tag">${tag}</span>`)
      .join("");

    const saved = state.saved.has(opportunity.id);

    card.innerHTML = `
      <header>
        <div>
          <h3>${opportunity.name}</h3>
          <div>${tags}</div>
        </div>
        <div class="tag">Fit ${opportunity.fit}/5</div>
      </header>
      <p>${opportunity.focus}</p>
      <div class="meta">
        <span>Owner: ${opportunity.owner}</span>
        <span>Deadline: ${opportunity.deadline} · ${deadlineLabel}</span>
        <span>Funding: $${Number(opportunity.funding).toLocaleString()}</span>
      </div>
      <div class="actions">
        <button class="save ${saved ? "active" : ""}" data-id="${opportunity.id}">
          ${saved ? "Saved" : "Save"}
        </button>
        ${
          opportunity.link
            ? `<a class="tag" href="${opportunity.link}" target="_blank" rel="noreferrer">Open source</a>`
            : ""
        }
      </div>
    `;

    elements.opportunityList.appendChild(card);
  });
};

const renderAll = () => {
  const filtered = getFiltered();
  renderMetrics(filtered);
  renderSignals(filtered);
  renderPipelineHealth();
  renderOpportunities(filtered);
};

const handleSave = (event) => {
  const button = event.target.closest(".save");
  if (!button) return;
  const id = button.dataset.id;

  if (state.saved.has(id)) {
    state.saved.delete(id);
  } else {
    state.saved.add(id);
  }

  persistSaved();
  renderAll();
};

const handleAddOpportunity = (event) => {
  event.preventDefault();
  const formData = new FormData(event.target);
  const entry = Object.fromEntries(formData.entries());

  const id = `custom-${Date.now()}`;
  const funding = Number(entry.funding || 0);
  const fit = Number(entry.fit || 3);

  state.custom.unshift({
    id,
    name: entry.name,
    deadline: entry.deadline,
    region: entry.region,
    type: entry.type,
    stage: entry.stage,
    owner: entry.owner,
    funding,
    fit,
    focus: entry.focus || "",
    link: entry.link || "",
  });

  persistCustom();
  updateFilters();
  renderAll();
  event.target.reset();
};

const exportCsv = () => {
  const filtered = sortOpportunities(getFiltered());
  const headers = [
    "name",
    "deadline",
    "region",
    "type",
    "stage",
    "owner",
    "funding",
    "fit",
    "focus",
    "link",
    "saved",
  ];

  const rows = filtered.map((item) => [
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
    state.saved.has(item.id) ? "yes" : "no",
  ]);

  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell || "").replace(/"/g, '""')}"`).join(","))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `opportunity-radar-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
};

const resetFilters = () => {
  elements.search.value = "";
  elements.type.value = "all";
  elements.stage.value = "all";
  elements.region.value = "all";
  elements.window.value = "all";
  elements.sort.value = "deadline";
  renderAll();
};

const boot = () => {
  loadCustom();
  loadSaved();
  updateFilters();
  renderAll();

  elements.opportunityList.addEventListener("click", handleSave);
  [elements.search, elements.type, elements.stage, elements.region, elements.window, elements.sort].forEach(
    (input) => input.addEventListener("input", renderAll)
  );
  elements.addForm.addEventListener("submit", handleAddOpportunity);
  elements.exportCsv.addEventListener("click", exportCsv);
  elements.resetFilters.addEventListener("click", resetFilters);
};

boot();
