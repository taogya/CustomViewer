(function () {
  // Trace: FR-016, FR-018, FR-024, FR-025, FR-032, AC-015, AC-016
  const vscode = acquireVsCodeApi();
  let lastPayload = null;
  let requestSequence = 0;
  const pendingImageRequests = new Map();

  function dispatchPayload(payload, messageType) {
    lastPayload = payload;
    globalThis.customViewerPayload = payload;
    globalThis.dispatchEvent(new CustomEvent("custom-viewer:update", {
      detail: {
        messageType,
        payload
      }
    }));
  }

  globalThis.CustomViewerHost = {
    getPayload: function () {
      return lastPayload;
    },
    openLink: function (href) {
      vscode.postMessage({
        type: "open-link",
        href: String(href || "")
      });
    },
    resolveImage: function (href) {
      const requestId = `resolve-image-${++requestSequence}`;
      return new Promise(resolve => {
        pendingImageRequests.set(requestId, resolve);
        vscode.postMessage({
          type: "resolve-image",
          requestId,
          href: String(href || "")
        });
      });
    },
    postLog: function (level, message) {
      vscode.postMessage({
        type: "renderer-log",
        level: level || "info",
        message: String(message)
      });
    }
  };

  globalThis.addEventListener("message", function (event) {
    const message = event.data;
    if (!message || typeof message !== "object") {
      return;
    }

    if ((message.type === "bootstrap" || message.type === "rerender") && message.payload) {
      dispatchPayload(message.payload, message.type);
      return;
    }

    if (message.type === "resolve-image-result" && typeof message.requestId === "string") {
      const resolve = pendingImageRequests.get(message.requestId);
      if (!resolve) {
        return;
      }

      pendingImageRequests.delete(message.requestId);
      resolve(typeof message.resolvedUri === "string" ? message.resolvedUri : null);
    }
  });

  vscode.postMessage({ type: "renderer-ready" });
}());