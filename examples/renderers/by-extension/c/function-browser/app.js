// Trace: FR-026, FR-030, AC-012
const cFallback = {
  fileName: "sample.c",
  savedTextContent: `#include <stdio.h>

static int count_words(const char *line) {
    int total = 0;
    while (*line != '\0') {
        total += (*line == ' ') ? 1 : 0;
        line++;
    }
    return total + 1;
}

static void print_summary(const char *line) {
    printf("%s (%d)\\n", line, count_words(line));
}

int main(void) {
    print_summary("custom viewer sample");
    return 0;
}
`
};

let currentCPayload = globalThis.customViewerPayload || globalThis.__CUSTOM_VIEWER_INPUT__ || cFallback;
let functions = [];

const functionList = document.getElementById("function-list");
const functionsContainer = document.getElementById("functions");
const sourceName = document.getElementById("source-name");
const summary = document.getElementById("summary");

globalThis.addEventListener("custom-viewer:update", event => {
  applyCPayload(event.detail?.payload);
});

applyCPayload(currentCPayload);

function renderFunctionList() {
  functionList.innerHTML = functions.map(item => {
    return `<button class="function-link" type="button" data-target="${item.id}">${escapeHtml(item.name)}</button>`;
  }).join("");

  functionList.querySelectorAll(".function-link").forEach(button => {
    button.addEventListener("click", () => {
      document.getElementById(button.dataset.target)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
}

function applyCPayload(nextPayload) {
  currentCPayload = nextPayload && typeof nextPayload === "object" ? nextPayload : cFallback;
  const cText = typeof currentCPayload.savedTextContent === "string"
    ? currentCPayload.savedTextContent
    : cFallback.savedTextContent;

  functions = extractFunctions(cText);
  sourceName.textContent = currentCPayload.fileName || cFallback.fileName;
  summary.textContent = `${functions.length} function(s)`;
  renderFunctionList();
  renderFunctions();
}

function renderFunctions() {
  functionsContainer.innerHTML = functions.map(item => {
    return `
      <article id="${item.id}" class="function-card">
        <h3>${escapeHtml(item.name)}</h3>
        <p class="signature">${escapeHtml(item.signature)}</p>
        <details>
          <summary>Show code</summary>
          <pre>${escapeHtml(item.code)}</pre>
        </details>
      </article>
    `;
  }).join("");
}

function extractFunctions(source) {
  const lines = source.split(/\r?\n/);
  const found = [];
  let current = null;
  let braceDepth = 0;
  let sequence = 0;

  for (const line of lines) {
    if (!current) {
      const match = line.match(/^\s*(?:static\s+)?(?:[A-Za-z_][\w\s\*]+)\s+([A-Za-z_][\w]*)\s*\([^;]*\)\s*\{$/);
      if (match) {
        current = {
          id: `function-${sequence++}`,
          name: match[1],
          signature: line.trim(),
          lines: [line]
        };
        braceDepth = countBraces(line);
        if (braceDepth === 0) {
          finalizeCurrent(found, current);
          current = null;
        }
      }
      continue;
    }

    current.lines.push(line);
    braceDepth += countBraces(line);
    if (braceDepth === 0) {
      finalizeCurrent(found, current);
      current = null;
    }
  }

  return found;
}

function finalizeCurrent(target, current) {
  target.push({
    id: current.id,
    name: current.name,
    signature: current.signature,
    code: current.lines.join("\n")
  });
}

function countBraces(line) {
  let balance = 0;
  for (const char of line) {
    if (char === "{") {
      balance++;
    } else if (char === "}") {
      balance--;
    }
  }
  return balance;
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}