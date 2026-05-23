// Trace: FR-026, FR-028, FR-032, AC-010, AC-015, AC-016
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

## Formatting Tour

Read **important notes**, try *emphasis*, inspect \`inline code\`, and compare an external link like [VS Code Webviews](https://code.visualstudio.com/api/extension-guides/webview) with a workspace style link such as [README](./README.md).

![Overview image](./docs/user/images/overview.png)

## Example Block

> Renderer specific navigation is part of the sample UX.




\`\`\`json
{
  "customViewer.rendererRoots": ["\${workspaceFolder}/examples/renderers"]
}
\`\`\`
`
};

const host = globalThis.CustomViewerHost || {
  getPayload() {
    return globalThis.customViewerPayload || globalThis.__CUSTOM_VIEWER_INPUT__ || markdownFallback;
  },
  postLog() {
    // no-op
  },
  openLink() {
    // no-op
  },
  resolveImage() {
    return Promise.resolve(null);
  }
};

let currentMarkdownPayload = host.getPayload() || markdownFallback;
let markdownSections = [];
let renderSequence = 0;

const searchInput = document.getElementById("search");
const navContainer = document.getElementById("nav");
const sectionsContainer = document.getElementById("sections");
const documentTitle = document.getElementById("document-title");
const resultSummary = document.getElementById("result-summary");

searchInput.addEventListener("input", () => {
  void renderMarkdown();
});

globalThis.addEventListener("custom-viewer:update", event => {
  applyMarkdownPayload(event.detail?.payload);
});

applyMarkdownPayload(currentMarkdownPayload);

function applyMarkdownPayload(nextPayload) {
  currentMarkdownPayload = nextPayload && typeof nextPayload === "object" ? nextPayload : markdownFallback;
  const markdownText = typeof currentMarkdownPayload.savedTextContent === "string"
    ? currentMarkdownPayload.savedTextContent
    : markdownFallback.savedTextContent;

  markdownSections = parseMarkdownSections(markdownText);
  documentTitle.textContent = currentMarkdownPayload.fileName || markdownFallback.fileName;
  void renderMarkdown();
}

async function renderMarkdown() {
  const renderId = ++renderSequence;
  const query = searchInput.value.trim().toLowerCase();
  const visibleSections = markdownSections.filter(section => {
    if (!query) {
      return true;
    }

    return (section.title + "\n" + section.body.join("\n")).toLowerCase().includes(query);
  });

  resultSummary.textContent = `${visibleSections.length} section(s)`;
  navContainer.innerHTML = visibleSections.map(section => {
    return `<button class="nav-link" type="button" data-target="${section.id}">${renderInlineMarkdown(section.title, query)}</button>`;
  }).join("");

  sectionsContainer.innerHTML = visibleSections.map(section => {
    return `
      <article id="${section.id}" class="section-card">
        <h3>${renderInlineMarkdown(section.title, query)}</h3>
        <div class="section-body">${renderMarkdownBody(section.body, query)}</div>
      </article>
    `;
  }).join("");

  activateNavButtons();
  activateAnchorLinks();
  activateRelativeLinks();
  await resolveRelativeImages(renderId);
}

function activateNavButtons() {
  navContainer.querySelectorAll(".nav-link").forEach(button => {
    button.addEventListener("click", () => {
      const targetId = button.dataset.target || "";
      document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
}

function activateAnchorLinks() {
  sectionsContainer.querySelectorAll("a[data-anchor-target]").forEach(anchor => {
    anchor.addEventListener("click", event => {
      const targetId = decodeAnchorTarget(anchor.dataset.anchorTarget || "");
      const target = document.getElementById(targetId);
      if (!target) {
        return;
      }

      event.preventDefault();
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
}

function activateRelativeLinks() {
  sectionsContainer.querySelectorAll("a[data-relative-href]").forEach(anchor => {
    anchor.addEventListener("click", event => {
      event.preventDefault();
      const href = anchor.dataset.relativeHref || "";
      if (!href) {
        return;
      }

      Promise.resolve(host.openLink(href)).catch(error => {
        host.postLog("warn", `Failed to open relative link: ${String(error)}`);
      });
    });
  });
}

async function resolveRelativeImages(renderId) {
  const figures = Array.from(sectionsContainer.querySelectorAll("figure[data-relative-src]"));

  await Promise.all(figures.map(async figure => {
    const source = figure.dataset.relativeSrc || "";
    const altText = figure.dataset.altText || "Markdown image";

    try {
      const resolvedUri = await host.resolveImage(source);
      if (renderId !== renderSequence || !figure.isConnected) {
        return;
      }

      if (resolvedUri) {
        const figcaptionHtml = figure.querySelector("figcaption")?.outerHTML || "";
        figure.classList.remove("md-image--loading", "md-image--placeholder");
        figure.classList.add("md-image--resolved");
        figure.innerHTML = `<img src="${escapeHtml(resolvedUri)}" alt="${escapeHtml(altText)}">${figcaptionHtml}`;
        return;
      }
    } catch (error) {
      host.postLog("warn", `Failed to resolve image: ${String(error)}`);
    }

    if (renderId !== renderSequence || !figure.isConnected) {
      return;
    }

    figure.classList.remove("md-image--loading");
    figure.classList.add("md-image--placeholder");
    const badge = figure.querySelector(".md-image-badge");
    if (badge) {
      badge.textContent = "Image not available";
    }
  }));
}

function parseMarkdownSections(text) {
  const lines = text.split(/\r?\n/);
  const sections = [];
  const slugCounts = new Map();
  let current = { id: "introduction", title: "Introduction", body: [] };

  for (const line of lines) {
    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      if (current.title !== "Introduction" || current.body.some(entry => entry.trim() !== "")) {
        sections.push(current);
      }

      const title = heading[2].trim();
      current = { id: createUniqueSlug(title, slugCounts), title, body: [] };
      continue;
    }

    current.body.push(line);
  }

  sections.push(current);
  return sections.filter(section => section.title || section.body.some(line => line.trim() !== ""));
}

function renderMarkdownBody(lines, query) {
  const blocks = [];
  let paragraphLines = [];
  let listType = null;
  let listItems = [];
  let codeFenceLanguage = null;
  let codeLines = [];
  let quoteLines = [];

  const flushParagraph = () => {
    if (paragraphLines.length === 0) {
      return;
    }

    blocks.push(`<p>${renderInlineMarkdown(paragraphLines.join(" "), query)}</p>`);
    paragraphLines = [];
  };

  const flushList = () => {
    if (!listType || listItems.length === 0) {
      return;
    }

    const itemsHtml = listItems.map(item => `<li>${renderInlineMarkdown(item, query)}</li>`).join("");
    blocks.push(`<${listType}>${itemsHtml}</${listType}>`);
    listType = null;
    listItems = [];
  };

  const flushQuote = () => {
    if (quoteLines.length === 0) {
      return;
    }

    blocks.push(`<blockquote>${renderMarkdownBody(quoteLines, query)}</blockquote>`);
    quoteLines = [];
  };

  const flushCodeBlock = () => {
    if (codeFenceLanguage === null) {
      return;
    }

    const languageClass = codeFenceLanguage ? ` class="language-${escapeHtml(codeFenceLanguage)}"` : "";
    const label = codeFenceLanguage
      ? `<div class="code-fence-label">${escapeHtml(codeFenceLanguage)}</div>`
      : "";

    blocks.push(
      `<div class="code-fence">${label}<pre><code${languageClass}>${escapeHtml(codeLines.join("\n"))}</code></pre></div>`
    );
    codeFenceLanguage = null;
    codeLines = [];
  };

  for (const line of lines) {
    const trimmed = line.trim();
    const trimmedStart = line.trimStart();

    if (trimmedStart.startsWith("```")) {
      flushParagraph();
      flushList();
      flushQuote();

      if (codeFenceLanguage === null) {
        codeFenceLanguage = trimmedStart.slice(3).trim();
        codeLines = [];
      } else {
        flushCodeBlock();
      }
      continue;
    }

    if (codeFenceLanguage !== null) {
      codeLines.push(line);
      continue;
    }

    const quote = line.match(/^>\s?(.*)$/);
    if (quote) {
      flushParagraph();
      flushList();
      quoteLines.push(quote[1]);
      continue;
    }
    flushQuote();

    const unordered = line.match(/^\s*[-*+]\s+(.+)$/);
    const ordered = line.match(/^\s*\d+\.\s+(.+)$/);
    if (unordered || ordered) {
      flushParagraph();
      const nextListType = unordered ? "ul" : "ol";
      if (listType && listType !== nextListType) {
        flushList();
      }
      listType = nextListType;
      listItems.push((unordered || ordered)[1]);
      continue;
    }
    flushList();

    if (/^([-*_])(?:\s*\1){2,}$/.test(trimmed)) {
      flushParagraph();
      blocks.push("<hr>");
      continue;
    }

    if (!trimmed) {
      flushParagraph();
      continue;
    }

    paragraphLines.push(trimmed);
  }

  flushParagraph();
  flushList();
  flushQuote();
  flushCodeBlock();

  return blocks.join("");
}

function renderInlineMarkdown(text, query, depth = 0) {
  if (!text) {
    return "";
  }

  if (depth > 8) {
    return highlightText(text, query);
  }

  let html = "";
  let index = 0;

  while (index < text.length) {
    const remaining = text.slice(index);

    const image = remaining.match(/^!\[([^\]]*)\]\(([^)]+)\)/);
    if (image) {
      html += renderMarkdownImage(image[1], image[2], query, depth + 1);
      index += image[0].length;
      continue;
    }

    const link = remaining.match(/^\[([^\]]+)\]\(([^)]+)\)/);
    if (link) {
      html += renderMarkdownLink(link[1], link[2], query, depth + 1);
      index += link[0].length;
      continue;
    }

    if (remaining.startsWith("**") || remaining.startsWith("__")) {
      const delimiter = remaining.slice(0, 2);
      const closingIndex = text.indexOf(delimiter, index + 2);
      if (closingIndex > index + 2) {
        html += `<strong>${renderInlineMarkdown(text.slice(index + 2, closingIndex), query, depth + 1)}</strong>`;
        index = closingIndex + 2;
        continue;
      }
    }

    if (remaining.startsWith("~~")) {
      const closingIndex = text.indexOf("~~", index + 2);
      if (closingIndex > index + 2) {
        html += `<del>${renderInlineMarkdown(text.slice(index + 2, closingIndex), query, depth + 1)}</del>`;
        index = closingIndex + 2;
        continue;
      }
    }

    if (remaining.startsWith("`") ) {
      const closingIndex = text.indexOf("`", index + 1);
      if (closingIndex > index + 1) {
        html += `<code>${highlightText(text.slice(index + 1, closingIndex), query)}</code>`;
        index = closingIndex + 1;
        continue;
      }
    }

    if (remaining.startsWith("*") || remaining.startsWith("_")) {
      const delimiter = remaining[0];
      const closingIndex = text.indexOf(delimiter, index + 1);
      if (closingIndex > index + 1) {
        html += `<em>${renderInlineMarkdown(text.slice(index + 1, closingIndex), query, depth + 1)}</em>`;
        index = closingIndex + 1;
        continue;
      }
    }

    const plainStart = index;
    index += 1;
    while (index < text.length && !isInlineSpecial(text[index])) {
      index += 1;
    }
    html += highlightText(text.slice(plainStart, index), query);
  }

  return html;
}

function renderMarkdownLink(label, href, query, depth) {
  const content = renderInlineMarkdown(label, query, depth + 1);
  const trimmedHref = href.trim();

  if (trimmedHref.startsWith("#")) {
    const anchorTarget = decodeAnchorTarget(trimmedHref.slice(1));
    return `<a class="md-link md-link--anchor" href="${escapeHtml(trimmedHref)}" data-anchor-target="${escapeHtml(anchorTarget)}">${content}</a>`;
  }

  if (isExternalHref(trimmedHref)) {
    return `<a class="md-link" href="${escapeHtml(trimmedHref)}" target="_blank" rel="noopener noreferrer">${content}</a>`;
  }

  if (isRelativeResourceReference(trimmedHref)) {
    return `<a class="md-link md-link--local" href="${escapeHtml(trimmedHref)}" data-relative-href="${escapeHtml(trimmedHref)}">${content}</a>`;
  }

  return `
    <span class="md-link md-link--unresolved" title="${escapeHtml(trimmedHref)}">
      <span class="md-link-label">${content}</span>
      <span class="md-link-path">${highlightText(trimmedHref, query)}</span>
    </span>
  `;
}

function renderMarkdownImage(alt, source, query, depth) {
  const trimmedSource = source.trim();
  const altText = alt || "Markdown image";
  const altContent = alt ? renderInlineMarkdown(alt, query, depth + 1) : "Image asset";
  const captionHtml = buildImageCaptionHtml(altContent, trimmedSource, query);

  if (trimmedSource.startsWith("data:image/")) {
    return `
      <figure class="md-image md-image--resolved">
        <img src="${escapeHtml(trimmedSource)}" alt="${escapeHtml(altText)}">
        ${captionHtml}
      </figure>
    `;
  }

  if (isRelativeResourceReference(trimmedSource)) {
    return `
      <figure
        class="md-image md-image--loading"
        data-relative-src="${escapeHtml(trimmedSource)}"
        data-alt-text="${escapeHtml(altText)}"
        title="${escapeHtml(trimmedSource)}"
      >
        <div class="md-image-frame" aria-hidden="true"></div>
        <div class="md-image-badge">Resolving image</div>
        ${captionHtml}
      </figure>
    `;
  }

  return `
    <figure class="md-image md-image--placeholder" title="${escapeHtml(trimmedSource)}">
      <div class="md-image-badge">Image reference</div>
      ${captionHtml}
    </figure>
  `;
}

function buildImageCaptionHtml(altContent, source, query) {
  return `
    <figcaption>
      <span class="md-image-label">${altContent}</span>
      <span class="md-image-path">${highlightText(source, query)}</span>
    </figcaption>
  `;
}

function createUniqueSlug(title, slugCounts) {
  const base = title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "section";

  const nextCount = (slugCounts.get(base) || 0) + 1;
  slugCounts.set(base, nextCount);
  return nextCount === 1 ? base : `${base}-${nextCount}`;
}

function decodeAnchorTarget(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function highlightText(text, query) {
  const escaped = escapeHtml(text);
  if (!query) {
    return escaped;
  }
  const pattern = new RegExp(`(${escapeRegExp(query)})`, "ig");
  return escaped.replace(pattern, "<mark>$1</mark>");
}

function isExternalHref(value) {
  return value.startsWith("http://")
    || value.startsWith("https://")
    || value.startsWith("mailto:");
}

function isRelativeResourceReference(value) {
  return Boolean(value)
    && !value.startsWith("#")
    && !value.startsWith("/")
    && !isExternalHref(value)
    && !/^[a-z][a-z0-9+.-]*:/i.test(value)
    && !value.startsWith("//");
}

function isInlineSpecial(character) {
  return character === "!"
    || character === "["
    || character === "*"
    || character === "_"
    || character === "`"
    || character === "~";
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}