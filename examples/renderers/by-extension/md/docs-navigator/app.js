// Trace: FR-026, FR-028, AC-010
const markdownFallback = {
  fileName: "handbook.md",
  savedTextContent: `# CustomViewer Handbook

## Overview

CustomViewer maps file extensions to HTML renderers for safe read only previews.

## Search Notes

Use the search field to find renderer, preview, search, or navigation.

## Renderer Contract

- Each renderer has an index.html entry point.
- The host injects the saved file content.

## Example Block

> Renderer specific navigation is part of the sample UX.




\`\`\`json
{
  "customViewer.rendererRoots": ["\${workspaceFolder}/examples/renderers"]
}
\`\`\`
`
};

let currentMarkdownPayload = globalThis.customViewerPayload || globalThis.__CUSTOM_VIEWER_INPUT__ || markdownFallback;
let markdownSections = [];

const searchInput = document.getElementById("search");
const navContainer = document.getElementById("nav");
const sectionsContainer = document.getElementById("sections");
const documentTitle = document.getElementById("document-title");
const resultSummary = document.getElementById("result-summary");

searchInput.addEventListener("input", renderMarkdown);
globalThis.addEventListener("custom-viewer:update", event => {
  applyMarkdownPayload(event.detail?.payload);
});

applyMarkdownPayload(currentMarkdownPayload);

function renderMarkdown() {
  const query = searchInput.value.trim().toLowerCase();
  const visibleSections = markdownSections.filter(section => {
    if (!query) {
      return true;
    }

    return (section.title + "\n" + section.body.join("\n")).toLowerCase().includes(query);
  });

  resultSummary.textContent = `${visibleSections.length} section(s)`;
  navContainer.innerHTML = visibleSections.map(section => {
    return `<button class="nav-link" type="button" data-target="${section.id}">${highlight(section.title, query)}</button>`;
  }).join("");

  sectionsContainer.innerHTML = visibleSections.map(section => {
    return `
      <article id="${section.id}" class="section-card">
        <h3>${highlight(section.title, query)}</h3>
        <div class="section-body">${renderMarkdownBody(section.body, query)}</div>
      </article>
    `;
  }).join("");

  navContainer.querySelectorAll(".nav-link").forEach(button => {
    button.addEventListener("click", () => {
      document.getElementById(button.dataset.target)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
}

function applyMarkdownPayload(nextPayload) {
  currentMarkdownPayload = nextPayload && typeof nextPayload === "object" ? nextPayload : markdownFallback;
  const markdownText = typeof currentMarkdownPayload.savedTextContent === "string"
    ? currentMarkdownPayload.savedTextContent
    : markdownFallback.savedTextContent;

  markdownSections = parseMarkdownSections(markdownText);
  documentTitle.textContent = currentMarkdownPayload.fileName || markdownFallback.fileName;
  renderMarkdown();
}

function parseMarkdownSections(text) {
  const lines = text.split(/\r?\n/);
  const sections = [];
  let current = { id: "section-0", title: "Introduction", body: [] };
  let index = 1;

  for (const line of lines) {
    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      if (current.title !== "Introduction" || current.body.some(entry => entry.trim() !== "")) {
        sections.push(current);
      }
      current = { id: `section-${index++}`, title: heading[2].trim(), body: [] };
      continue;
    }
    current.body.push(line);
  }

  sections.push(current);
  return sections.filter(section => section.title || section.body.some(line => line.trim() !== ""));
}

function renderMarkdownBody(lines, query) {
  let html = "";
  let inCode = false;
  let inList = false;

  for (const line of lines) {
    if (line.startsWith("```")) {
      if (inList) {
        html += "</ul>";
        inList = false;
      }
      html += inCode ? "</code></pre>" : "<pre><code>";
      inCode = !inCode;
      continue;
    }

    if (inCode) {
      html += `${escapeHtml(line)}\n`;
      continue;
    }

    if (line.startsWith("- ")) {
      if (!inList) {
        html += "<ul>";
        inList = true;
      }
      html += `<li>${highlight(line.slice(2), query)}</li>`;
      continue;
    }

    if (inList) {
      html += "</ul>";
      inList = false;
    }

    if (!line.trim()) {
      continue;
    }

    if (line.startsWith("> ")) {
      html += `<blockquote>${highlight(line.slice(2), query)}</blockquote>`;
      continue;
    }

    html += `<p>${highlight(line, query)}</p>`;
  }

  if (inList) {
    html += "</ul>";
  }
  if (inCode) {
    html += "</code></pre>";
  }

  return html;
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

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}