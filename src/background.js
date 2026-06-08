import { fetchWiktionary } from "./lib/hanReadings.js";

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: "han-reading-inspector.lookup-selection",
      title: "Show Han readings",
      contexts: ["selection"],
    });
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== "han-reading-inspector.lookup-selection" || !tab?.id) return;

  try {
    await chrome.scripting.insertCSS({
      target: { tabId: tab.id },
      files: ["src/content.css"],
    });
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["src/content.js"],
    });
  } catch {
    return;
  }

  chrome.tabs.sendMessage(tab.id, {
    type: "HAN_READING_LOOKUP_SELECTION",
    selectionText: info.selectionText ?? "",
  }, () => {
    void chrome.runtime.lastError;
  });
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "HAN_READING_FETCH_WIKTIONARY") return false;

  fetchWiktionary(message.character)
    .then((data) => sendResponse({ ok: true, data }))
    .catch((error) => sendResponse({
      ok: false,
      error: error instanceof Error ? error.message : "Wiktionary lookup failed.",
    }));

  return true;
});
