(function () {
  // Trace: FR-016, FR-018, FR-024, FR-025
  const vscode = acquireVsCodeApi();
  let lastPayload = null;

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
    }
  });

  vscode.postMessage({ type: "renderer-ready" });
}());