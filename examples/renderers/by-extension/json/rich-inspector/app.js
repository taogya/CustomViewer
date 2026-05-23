// Trace: FR-026, FR-029, AC-011
const jsonFallback = {
  fileName: "catalog.json",
  savedTextContent: JSON.stringify({
    items: [
      { id: "doc-100", type: "document", status: "active", title: "Architecture Overview", owner: "platform", tags: ["renderer", "navigation"], priority: 1, summary: "Preview host architecture." },
      { id: "cfg-210", type: "config", status: "draft", title: "Workspace Settings", owner: "tooling", tags: ["settings", "preview"], priority: 2, summary: "Renderer mapping example." },
      { id: "api-330", type: "api", status: "active", title: "Bootstrap Payload", owner: "platform", tags: ["payload", "search"], priority: 1, summary: "First render payload contract." }
    ]
  }, null, 2)
};

let currentJsonPayload = globalThis.customViewerPayload || globalThis.__CUSTOM_VIEWER_INPUT__ || jsonFallback;
let items = [];
let filterKey = "id";

const filterSelect = document.getElementById("filter");
const searchBox = document.getElementById("search");
const cards = document.getElementById("cards");
const summary = document.getElementById("summary");

filterSelect.innerHTML = buildFilterOptions(items, filterKey);
filterSelect.addEventListener("change", renderJson);
searchBox.addEventListener("input", renderJson);
globalThis.addEventListener("custom-viewer:update", event => {
  applyJsonPayload(event.detail?.payload);
});

applyJsonPayload(currentJsonPayload);

function renderJson() {
  const filterValue = filterSelect.value;
  const query = searchBox.value.trim().toLowerCase();

  const visibleItems = items.filter(item => {
    const matchesFilter = filterValue === "__all__" || String(item[filterKey] || "unknown") === filterValue;
    const matchesQuery = !query || JSON.stringify(item).toLowerCase().includes(query);
    return matchesFilter && matchesQuery;
  });

  summary.textContent = `${visibleItems.length} of ${items.length} item(s)`;
  cards.innerHTML = visibleItems.map(item => renderCard(item, query)).join("");
}

function applyJsonPayload(nextPayload) {
  const previousFilterValue = filterSelect.value;
  currentJsonPayload = nextPayload && typeof nextPayload === "object" ? nextPayload : jsonFallback;

  const jsonText = typeof currentJsonPayload.savedTextContent === "string"
    ? currentJsonPayload.savedTextContent
    : jsonFallback.savedTextContent;
  const parsedJson = parseJson(jsonText);

  items = normalizeItems(parsedJson);
  filterKey = detectFilterKey(items);
  filterSelect.innerHTML = buildFilterOptions(items, filterKey);

  const availableValues = Array.from(filterSelect.options).map(option => option.value);
  filterSelect.value = availableValues.includes(previousFilterValue) ? previousFilterValue : "__all__";
  renderJson();
}

function renderCard(item, query) {
  const tags = Array.isArray(item.tags) ? item.tags : [];
  return `
    <article class="card">
      <div class="card-head">
        <div>
          <p class="eyebrow">${highlight(String(item[filterKey] || "unknown"), query)}</p>
          <h2>${highlight(String(item.title || item.id || "Untitled"), query)}</h2>
        </div>
        <span class="pill">${highlight(String(item.status || "unknown"), query)}</span>
      </div>

      <div class="pills">
        ${tags.map(tag => `<span class="pill">${highlight(String(tag), query)}</span>`).join("")}
      </div>

      <p>${highlight(String(item.summary || ""), query)}</p>

      <table class="meta">
        <tr><th>ID</th><td>${highlight(String(item.id || ""), query)}</td></tr>
        <tr><th>Owner</th><td>${highlight(String(item.owner || ""), query)}</td></tr>
        <tr><th>Priority</th><td>${highlight(String(item.priority || ""), query)}</td></tr>
      </table>

      <div class="raw">
        <details>
          <summary>Raw JSON</summary>
          <pre>${escapeHtml(JSON.stringify(item, null, 2))}</pre>
        </details>
      </div>
    </article>
  `;
}

function buildFilterOptions(allItems, key) {
  const values = [...new Set(allItems.map(item => String(item[key] || "unknown")))].sort();
  return [`<option value="__all__">All ${escapeHtml(key)}</option>`, ...values.map(value => `<option value="${escapeAttr(value)}">${escapeHtml(value)}</option>`)].join("");
}

function normalizeItems(data) {
  if (Array.isArray(data)) {
    return data;
  }
  if (data && Array.isArray(data.items)) {
    return data.items;
  }
  if (data && typeof data === "object") {
    return Object.entries(data).map(([key, value]) => ({ id: key, value }));
  }
  return [];
}

function detectFilterKey(allItems) {
  const candidates = ["type", "kind", "category", "status", "owner"];
  for (const candidate of candidates) {
    if (allItems.some(item => Object.prototype.hasOwnProperty.call(item, candidate))) {
      return candidate;
    }
  }
  return "id";
}

function parseJson(value) {
  try {
    return JSON.parse(value);
  } catch {
    return { items: [{ id: "invalid", type: "error", status: "invalid", title: "Invalid JSON", owner: "parser", tags: ["error"], priority: 0, summary: "The provided JSON could not be parsed." }] };
  }
}

function highlight(text, query) {
  const escaped = escapeHtml(text);
  if (!query) {
    return escaped;
  }
  const pattern = new RegExp(`(${escapeRegExp(query)})`, "ig");
  return escaped.replace(pattern, "<mark>$1</mark>");
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeAttr(value) {
  return escapeHtml(value);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}