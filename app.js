const state = {
  opportunities: [],
  saved: new Set(),
  custom: [],
  showSaved: false,
};

const elements = {
  grid: document.getElementById("card-grid"),
  savedGrid: document.getElementById("saved-grid"),
  savedBoard: document.getElementById("saved-board"),
  search: document.getElementById("search"),
  type: document.getElementById("type"),
  region: document.getElementById("region"),
  window: document.getElementById("window"),
  sort: document.getElementById("sort"),
  total: document.getElementById("total-count"),
  dueSoon: document.getElementById("due-soon-count"),
  savedCount: document.getElementById("saved-count"),
  intake: document.getElementById("intake"),
  addSignal: document.getElementById("add-signal"),
  cancelIntake: document.getElementById("cancel-intake"),
  intakeForm: document.getElementById("intake-form"),
  toggleSaved: document.getElementById("toggle-saved"),
};

const today = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
};

const parseAward = (award) => {
  const numeric = String(award).replace(/[^0-9]/g, "");
  return numeric ? Number(numeric) : 0;
};

const daysLeft = (deadline) => {
  const target = new Date(deadline);
  const diff = target.getTime() - today().getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

const radarScore = (opportunity) => {
  const award = parseAward(opportunity.award);
  const urgency = Math.max(0, 120 - daysLeft(opportunity.deadline));
  const focusBoost = opportunity.focus.split(",").length * 8;
  return Math.min(100, Math.round(award / 500 + urgency / 2 + focusBoost));
};

const loadSaved = () => {
  const stored = JSON.parse(localStorage.getItem("opportunitySaved") || "[]");
  state.saved = new Set(stored);
};

const persistSaved = () => {
  localStorage.setItem("opportunitySaved", JSON.stringify(Array.from(state.saved)));
};

const loadCustom = () => {
  const stored = JSON.parse(localStorage.getItem("opportunityCustom") || "[]");
  state.custom = stored;
};

const persistCustom = () => {
  localStorage.setItem("opportunityCustom", JSON.stringify(state.custom));
};

const allOpportunities = () => [...state.opportunities, ...state.custom];

const updateFilters = () => {
  const types = new Set(["All", ...allOpportunities().map((item) => item.type)]);
  const regions = new Set(["All", ...allOpportunities().map((item) => item.region)]);

  elements.type.innerHTML = "";
  types.forEach((type) => {
    const option = document.createElement("option");
    option.value = type;
    option.textContent = type;
    elements.type.appendChild(option);
  });

  elements.region.innerHTML = "";
  regions.forEach((region) => {
    const option = document.createElement("option");
    option.value = region;
    option.textContent = region;
    elements.region.appendChild(option);
  });
};

const getFiltered = () => {
  const query = elements.search.value.toLowerCase();
  const type = elements.type.value;
  const region = elements.region.value;
  const windowValue = elements.window.value;

  return allOpportunities().filter((opportunity) => {
    const matchesQuery =
      opportunity.name.toLowerCase().includes(query) ||
      opportunity.focus.toLowerCase().includes(query) ||
      opportunity.sponsor.toLowerCase().includes(query);
    const matchesType = type === "All" || opportunity.type === type;
    const matchesRegion = region === "All" || opportunity.region === region;
    const matchesWindow =
      windowValue === "all" || daysLeft(opportunity.deadline) <= Number(windowValue);

    return matchesQuery && matchesType && matchesRegion && matchesWindow;
  });
};

const sortOpportunities = (list) => {
  const mode = elements.sort.value;
  const sorted = [...list];

  if (mode === "award") {
    sorted.sort((a, b) => parseAward(b.award) - parseAward(a.award));
  } else if (mode === "score") {
    sorted.sort((a, b) => radarScore(b) - radarScore(a));
  } else {
    sorted.sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
  }

  return sorted;
};

const renderCards = () => {
  const filtered = sortOpportunities(getFiltered());
  elements.grid.innerHTML = "";

  filtered.forEach((opportunity) => {
    const card = document.createElement("article");
    const left = daysLeft(opportunity.deadline);
    card.className = `card${left <= 30 ? " due-soon" : ""}`;
    card.innerHTML = `
      <div class="badge">${opportunity.type} - ${opportunity.region}</div>
      <h3>${opportunity.name}</h3>
      <div class="meta">
        <span>${opportunity.sponsor}</span>
        <span>${left} days left</span>
      </div>
      <div class="details">
        <strong>Focus:</strong> ${opportunity.focus}<br />
        <strong>Eligibility:</strong> ${opportunity.eligibility}
      </div>
      <div class="meta">
        <span>Award: ${opportunity.award}</span>
        <span class="score">Score ${radarScore(opportunity)}</span>
      </div>
      <div class="actions">
        <span class="details">Deadline: ${opportunity.deadline}</span>
        <button class="save ${state.saved.has(opportunity.id) ? "active" : ""}" data-id="${opportunity.id}">
          ${state.saved.has(opportunity.id) ? "Saved" : "Save"}
        </button>
      </div>
    `;
    elements.grid.appendChild(card);
  });
};

const renderSaved = () => {
  elements.savedGrid.innerHTML = "";
  const savedItems = allOpportunities().filter((opportunity) => state.saved.has(opportunity.id));

  if (savedItems.length === 0) {
    elements.savedGrid.innerHTML = "<p>No saved opportunities yet. Save from the radar to pin them here.</p>";
    return;
  }

  savedItems.forEach((opportunity) => {
    const card = document.createElement("div");
    card.className = "saved-card";
    card.innerHTML = `
      <strong>${opportunity.name}</strong>
      <span>${opportunity.sponsor}</span><br />
      <span>Deadline: ${opportunity.deadline}</span><br />
      <span>Award: ${opportunity.award}</span>
    `;
    elements.savedGrid.appendChild(card);
  });
};

const updateStats = () => {
  const total = allOpportunities().length;
  const dueSoon = allOpportunities().filter((opportunity) => daysLeft(opportunity.deadline) <= 30)
    .length;
  elements.total.textContent = total;
  elements.dueSoon.textContent = dueSoon;
  elements.savedCount.textContent = state.saved.size;
};

const renderAll = () => {
  renderCards();
  renderSaved();
  updateStats();
};

const handleSaveClick = (event) => {
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

const toggleIntake = (open) => {
  elements.intake.setAttribute("aria-hidden", open ? "false" : "true");
};

const toggleSavedBoard = () => {
  state.showSaved = !state.showSaved;
  elements.savedBoard.setAttribute("aria-hidden", state.showSaved ? "false" : "true");
  elements.toggleSaved.textContent = state.showSaved ? "Hide Saved" : "Saved Board";
};

const handleIntakeSubmit = (event) => {
  event.preventDefault();
  const formData = new FormData(event.target);
  const entry = Object.fromEntries(formData.entries());
  const id = `custom-${Date.now()}`;
  state.custom.unshift({
    id,
    ...entry,
  });
  persistCustom();
  updateFilters();
  renderAll();
  toggleIntake(false);
  event.target.reset();
};

const boot = async () => {
  const response = await fetch("./data/opportunities.json");
  const data = await response.json();
  state.opportunities = data;
  loadSaved();
  loadCustom();
  updateFilters();
  renderAll();

  elements.grid.addEventListener("click", handleSaveClick);
  [elements.search, elements.type, elements.region, elements.window, elements.sort].forEach(
    (input) => input.addEventListener("input", renderAll)
  );
  elements.addSignal.addEventListener("click", () => toggleIntake(true));
  elements.cancelIntake.addEventListener("click", () => toggleIntake(false));
  elements.toggleSaved.addEventListener("click", toggleSavedBoard);
  elements.intakeForm.addEventListener("submit", handleIntakeSubmit);
};

boot();
