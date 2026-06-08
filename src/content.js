(() => {
if (globalThis.__hanReadingInspectorContentLoaded) return;
globalThis.__hanReadingInspectorContentLoaded = true;

let panel;
let libPromise;
let lastSelectionRect;
let lastContextMenuPoint;

const MODERN_FIELDS = [
  { id: "pinyin", label: "Mandarin Pinyin" },
  { id: "zhuyin", label: "Mandarin Zhuyin" },
  { id: "cantoneseJyutping", label: "Cantonese Jyutping" },
  { id: "minPoj", label: "Southern Min POJ" },
  { id: "wu", label: "Wu" },
  { id: "hakka", label: "Hakka" },
  { id: "gan", label: "Gan" },
  { id: "xiang", label: "Xiang" },
  { id: "japaneseOn", label: "Japanese On" },
  { id: "japaneseKun", label: "Japanese Kun" },
  { id: "koreanReading", label: "Korean reading" },
  { id: "koreanEumhun", label: "Korean eumhun" },
  { id: "vietnamese", label: "Vietnamese Han Viet" },
  { id: "vietnameseNom", label: "Vietnamese Nom" },
  { id: "oldChinese", label: "Old Chinese" },
];

const MIDDLE_CHINESE_FIELDS = [
  { id: "baxter", label: "Baxter" },
  { id: "fanqie", label: "Fanqie 反切" },
  { id: "she", label: "攝" },
  { id: "zhuan", label: "轉" },
  { id: "finalClass", label: "韻類" },
  { id: "initial", label: "Initial 聲" },
  { id: "final", label: "Final 韻" },
  { id: "tone", label: "Tone 調" },
  { id: "openness", label: "Openness 呼" },
  { id: "division", label: "Division 等" },
];

const FONT_OPTIONS = [
  {
    id: "serif",
    stack: "Georgia, 'Times New Roman', Times, 'Songti SC', SimSun, serif",
  },
  {
    id: "system-serif",
    stack: "ui-serif, 'New York', 'Times New Roman', Times, 'Songti SC', SimSun, serif",
  },
  {
    id: "sans",
    stack: "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
  {
    id: "mono",
    stack: "'SF Mono', Consolas, 'Liberation Mono', monospace",
  },
];

const LOCAL_FONT_PREFIX = "local:";

const DEFAULT_THEME = {
  font: `${LOCAL_FONT_PREFIX}Noto Serif KR`,
  backgroundColor: "#fbfcfd",
  textColor: "#17202a",
  accentColor: "#2454a6",
  borderColor: "#d7dce2",
  opacity: 0.96,
};

document.addEventListener("selectionchange", () => {
  lastSelectionRect = selectionRect();
});

document.addEventListener("contextmenu", (event) => {
  lastContextMenuPoint = {
    top: event.clientY,
    right: event.clientX,
    bottom: event.clientY,
    left: event.clientX,
    width: 0,
    height: 0,
  };
  lastSelectionRect = selectionRect() ?? lastSelectionRect;
}, true);

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type !== "HAN_READING_LOOKUP_SELECTION") return;
  lookupSelection(message.selectionText ?? "", lastSelectionRect ?? selectionRect() ?? lastContextMenuPoint);
});

function loadLib() {
  libPromise ??= import(chrome.runtime.getURL("src/lib/hanReadings.js"));
  return libPromise;
}

async function lookupSelection(selectionText, anchorRect) {
  const character = firstHanCharacter(selectionText);

  if (!character) {
    renderPanel({ state: "error", message: "Select one Han character first." }, anchorRect);
    return;
  }

  renderPanel({ state: "loading", character, message: `Fetching ${character} from Wiktionary...` }, anchorRect);

  try {
    const [{ getCharacterData }, settings] = await Promise.all([
      loadLib(),
      loadSettings(),
    ]);
    const data = await getCharacterData(character, backgroundFetchWiktionary);
    renderPanel({ state: "ready", data, settings }, anchorRect);
  } catch (error) {
    renderPanel({
      state: "error",
      character,
      message: error instanceof Error ? error.message : "The Wiktionary lookup failed.",
    }, anchorRect);
  }
}

function firstHanCharacter(value) {
  return Array.from(value).find((character) => /\p{Script=Han}/u.test(character)) ?? null;
}

async function loadSettings() {
  const defaults = defaultSettings();
  if (!chrome.storage?.sync) return defaults;
  try {
    return normalizeSettings(await chrome.storage.sync.get(defaults));
  } catch {
    return defaults;
  }
}

function defaultSettings() {
  return {
    modernOrder: MODERN_FIELDS.map((field) => field.id),
    modernEnabled: Object.fromEntries(MODERN_FIELDS.map((field) => [field.id, true])),
    middleChineseOrder: MIDDLE_CHINESE_FIELDS.map((field) => field.id),
    middleChineseEnabled: Object.fromEntries(MIDDLE_CHINESE_FIELDS.map((field) => [field.id, true])),
    theme: DEFAULT_THEME,
  };
}

function normalizeSettings(settings) {
  return {
    modernOrder: normalizeOrder(settings.modernOrder, MODERN_FIELDS),
    modernEnabled: normalizeEnabled(settings.modernEnabled, MODERN_FIELDS),
    middleChineseOrder: normalizeOrder(settings.middleChineseOrder, MIDDLE_CHINESE_FIELDS),
    middleChineseEnabled: normalizeEnabled(settings.middleChineseEnabled, MIDDLE_CHINESE_FIELDS),
    theme: normalizeTheme(settings.theme),
  };
}

function normalizeOrder(order, definitions) {
  const known = new Set(definitions.map((field) => field.id));
  const seen = new Set();
  const normalized = Array.isArray(order)
    ? order.filter((id) => {
      if (!known.has(id) || seen.has(id)) return false;
      seen.add(id);
      return true;
    })
    : [];
  return [...normalized, ...definitions.map((field) => field.id).filter((id) => !seen.has(id))];
}

function normalizeEnabled(enabled, definitions) {
  const defaults = Object.fromEntries(definitions.map((field) => [field.id, true]));
  return { ...defaults, ...(enabled && typeof enabled === "object" ? enabled : {}) };
}

function normalizeTheme(theme) {
  const candidate = theme && typeof theme === "object" ? theme : {};
  const font = isFontId(candidate.font)
    ? candidate.font
    : DEFAULT_THEME.font;
  return {
    font,
    backgroundColor: normalizeColor(candidate.backgroundColor, DEFAULT_THEME.backgroundColor),
    textColor: normalizeColor(candidate.textColor, DEFAULT_THEME.textColor),
    accentColor: normalizeColor(candidate.accentColor, DEFAULT_THEME.accentColor),
    borderColor: normalizeColor(candidate.borderColor, DEFAULT_THEME.borderColor),
    opacity: normalizeOpacity(candidate.opacity),
  };
}

function isFontId(fontId) {
  return FONT_OPTIONS.some((option) => option.id === fontId) || isLocalFontId(fontId);
}

function isLocalFontId(fontId) {
  if (typeof fontId !== "string" || !fontId.startsWith(LOCAL_FONT_PREFIX)) return false;
  const name = localFontName(fontId);
  return Boolean(name.trim()) && name.length <= 200;
}

function localFontName(fontId) {
  return fontId.slice(LOCAL_FONT_PREFIX.length);
}

function fontStack(fontId) {
  if (isLocalFontId(fontId)) {
    return `${JSON.stringify(localFontName(fontId))}, ${FONT_OPTIONS[0].stack}`;
  }
  return FONT_OPTIONS.find((font) => font.id === fontId)?.stack ?? FONT_OPTIONS[0].stack;
}

function normalizeColor(value, fallback) {
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;
}

function normalizeOpacity(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return DEFAULT_THEME.opacity;
  return Math.min(1, Math.max(0.5, number));
}

function backgroundFetchWiktionary(character) {
  return chrome.runtime.sendMessage({
    type: "HAN_READING_FETCH_WIKTIONARY",
    character,
  }).then((response) => {
    if (!response?.ok) throw new Error(response?.error || "The Wiktionary lookup failed.");
    return response.data;
  });
}

function ensurePanel() {
  if (panel?.isConnected) return panel;

  panel ??= document.createElement("aside");
  panel.id = "han-reading-inspector";
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-live", "polite");
  (document.body || document.documentElement).append(panel);
  return panel;
}

function renderPanel(model, anchorRect) {
  const root = ensurePanel();
  root.style.display = "block";
  root.style.visibility = "visible";
  applyTheme(root, model.settings?.theme ?? DEFAULT_THEME);
  root.replaceChildren();

  const header = document.createElement("div");
  header.className = "hri-header";
  const title = document.createElement("h2");
  title.textContent = model.state === "ready" ? model.data.character : model.character || "Han readings";
  const close = document.createElement("button");
  close.type = "button";
  close.className = "hri-close";
  close.setAttribute("aria-label", "Close");
  close.textContent = "×";
  close.addEventListener("click", () => root.remove());
  header.append(title, close);
  root.append(header);

  if (model.state === "loading" || model.state === "error") {
    const message = document.createElement("p");
    message.className = model.state === "error" ? "hri-error" : "hri-status";
    message.textContent = model.message;
    root.append(message);
    placePanel(root, anchorRect);
    return;
  }

  root.append(readingGrid(model.data, model.settings));

  if (model.data.middleChinese.length) {
    const sectionTitle = document.createElement("h3");
    sectionTitle.textContent = "Middle Chinese";
    root.append(sectionTitle);
    root.append(middleChineseList(model.data.middleChinese, model.settings));
  }

  const footer = document.createElement("a");
  footer.href = `https://en.wiktionary.org/wiki/${encodeURIComponent(model.data.sourceCharacter)}`;
  footer.target = "_blank";
  footer.rel = "noreferrer";
  footer.className = "hri-source";
  footer.textContent = model.data.sourceCharacter !== model.data.character
    ? `Source: Wiktionary ${model.data.sourceCharacter}`
    : "Source: Wiktionary";
  root.append(footer);
  placePanel(root, anchorRect);
}

function applyTheme(root, theme) {
  const normalized = normalizeTheme(theme);
  root.style.setProperty("--hri-font-family", fontStack(normalized.font));
  root.style.setProperty("--hri-bg-color", normalized.backgroundColor);
  root.style.setProperty("--hri-text-color", normalized.textColor);
  root.style.setProperty("--hri-accent-color", normalized.accentColor);
  root.style.setProperty("--hri-border-color", normalized.borderColor);
  root.style.setProperty("--hri-opacity", String(normalized.opacity));
}

function selectionRect() {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return null;

  const range = selection.getRangeAt(0);
  const rects = [...range.getClientRects()].filter((rect) => rect.width || rect.height);
  const rect = rects[0] ?? range.getBoundingClientRect();
  if (!rect.width && !rect.height) return null;

  return {
    top: rect.top,
    right: rect.right,
    bottom: rect.bottom,
    left: rect.left,
    width: rect.width,
    height: rect.height,
  };
}

function placePanel(root, anchorRect) {
  if (!anchorRect) {
    root.style.top = "24px";
    root.style.right = "24px";
    root.style.left = "auto";
    return;
  }

  root.style.right = "auto";
  root.style.left = "0";
  root.style.top = "0";

  const gap = 10;
  const margin = 12;
  const panelRect = root.getBoundingClientRect();
  const spaceRight = window.innerWidth - anchorRect.right - margin;
  const preferredLeft = spaceRight >= panelRect.width + gap
    ? anchorRect.right + gap
    : anchorRect.left - panelRect.width - gap;
  const left = Math.min(
    Math.max(margin, preferredLeft),
    Math.max(margin, window.innerWidth - panelRect.width - margin),
  );
  const top = Math.min(
    Math.max(margin, anchorRect.top),
    Math.max(margin, window.innerHeight - panelRect.height - margin),
  );

  root.style.left = `${left}px`;
  root.style.top = `${top}px`;
}

function readingGrid(data, settings) {
  const rows = configuredRows(data, settings.modernOrder, settings.modernEnabled, MODERN_FIELDS);
  const list = document.createElement("dl");
  list.className = "hri-grid";
  for (const [labelText, value] of rows) {
    const label = document.createElement("dt");
    const reading = document.createElement("dd");
    label.textContent = labelText;
    reading.textContent = value || "Not listed";
    if (!value) reading.className = "hri-empty";
    list.append(label, reading);
  }
  return list;
}

function middleChineseList(readings, settings) {
  const wrap = document.createElement("div");
  wrap.className = "hri-middle";

  readings.slice(0, 3).forEach((reading, index) => {
    const card = document.createElement("section");
    card.className = "hri-mc-card";
    if (readings.length > 1) {
      const heading = document.createElement("h4");
      heading.textContent = `Reading ${index + 1}`;
      card.append(heading);
    }

    const rows = configuredRows(
      reading,
      settings.middleChineseOrder,
      settings.middleChineseEnabled,
      MIDDLE_CHINESE_FIELDS,
    );
    const list = document.createElement("dl");
    for (const [label, value] of rows) {
      const dt = document.createElement("dt");
      const dd = document.createElement("dd");
      dt.textContent = label;
      dd.textContent = value || "Not listed";
      if (!value) dd.className = "hri-empty";
      list.append(dt, dd);
    }
    card.append(list);
    wrap.append(card);
  });

  return wrap;
}

function configuredRows(data, order, enabled, definitions) {
  const byId = new Map(definitions.map((field) => [field.id, field]));
  return order
    .filter((id) => enabled[id])
    .map((id) => [byId.get(id)?.label ?? id, data[id] ?? ""]);
}
})();
