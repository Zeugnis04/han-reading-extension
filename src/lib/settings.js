export const MODERN_FIELDS = [
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

export const MIDDLE_CHINESE_FIELDS = [
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

export const FONT_OPTIONS = [
  {
    id: "serif",
    label: "Serif",
    stack: "Georgia, 'Times New Roman', Times, 'Songti SC', SimSun, serif",
  },
  {
    id: "system-serif",
    label: "System serif",
    stack: "ui-serif, 'New York', 'Times New Roman', Times, 'Songti SC', SimSun, serif",
  },
  {
    id: "sans",
    label: "Sans",
    stack: "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
  {
    id: "mono",
    label: "Monospace",
    stack: "'SF Mono', Consolas, 'Liberation Mono', monospace",
  },
];

export const LOCAL_FONT_PREFIX = "local:";

export const DEFAULT_THEME = {
  font: `${LOCAL_FONT_PREFIX}Noto Serif KR`,
  backgroundColor: "#fbfcfd",
  textColor: "#17202a",
  accentColor: "#2454a6",
  borderColor: "#d7dce2",
  opacity: 0.96,
};

const DEFAULT_SETTINGS = {
  modernOrder: MODERN_FIELDS.map((field) => field.id),
  modernEnabled: Object.fromEntries(MODERN_FIELDS.map((field) => [field.id, true])),
  middleChineseOrder: MIDDLE_CHINESE_FIELDS.map((field) => field.id),
  middleChineseEnabled: Object.fromEntries(MIDDLE_CHINESE_FIELDS.map((field) => [field.id, true])),
  theme: DEFAULT_THEME,
};

export function defaultSettings() {
  return structuredClone(DEFAULT_SETTINGS);
}

export async function loadSettings() {
  if (!globalThis.chrome?.storage?.sync) return defaultSettings();
  const stored = await chrome.storage.sync.get(DEFAULT_SETTINGS);
  return normalizeSettings(stored);
}

export async function saveSettings(settings) {
  const normalized = normalizeSettings(settings);
  await chrome.storage.sync.set(normalized);
  return normalized;
}

export function normalizeSettings(settings) {
  return {
    modernOrder: normalizeOrder(settings.modernOrder, MODERN_FIELDS),
    modernEnabled: normalizeEnabled(settings.modernEnabled, MODERN_FIELDS),
    middleChineseOrder: normalizeOrder(settings.middleChineseOrder, MIDDLE_CHINESE_FIELDS),
    middleChineseEnabled: normalizeEnabled(settings.middleChineseEnabled, MIDDLE_CHINESE_FIELDS),
    theme: normalizeTheme(settings.theme),
  };
}

export function modernRows(data, settings) {
  const byId = new Map(MODERN_FIELDS.map((field) => [field.id, field]));
  return settings.modernOrder
    .filter((id) => settings.modernEnabled[id])
    .map((id) => [byId.get(id)?.label ?? id, data[id] ?? ""]);
}

export function middleChineseRows(reading, settings) {
  const byId = new Map(MIDDLE_CHINESE_FIELDS.map((field) => [field.id, field]));
  return settings.middleChineseOrder
    .filter((id) => settings.middleChineseEnabled[id])
    .map((id) => [byId.get(id)?.label ?? id, reading[id] ?? ""]);
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

export function fontStack(fontId) {
  if (isLocalFontId(fontId)) {
    return `${cssString(localFontName(fontId))}, ${FONT_OPTIONS[0].stack}`;
  }
  return FONT_OPTIONS.find((font) => font.id === fontId)?.stack ?? FONT_OPTIONS[0].stack;
}

export async function localFontOptions() {
  const fontSettings = globalThis.chrome?.fontSettings;
  if (typeof fontSettings?.getFontList !== "function") return [];
  const fonts = await new Promise((resolve) => {
    const result = fontSettings.getFontList((availableFonts) => resolve(availableFonts || []));
    if (result?.then) result.then(resolve, () => resolve([]));
  });
  const seen = new Set();
  return fonts
    .map((font) => ({
      id: localFontId(font.fontId),
      label: font.displayName || font.fontId,
    }))
    .filter((font) => {
      if (!isLocalFontId(font.id) || seen.has(font.id)) return false;
      seen.add(font.id);
      return true;
    })
    .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: "base" }));
}

export function localFontId(fontName) {
  return `${LOCAL_FONT_PREFIX}${fontName}`;
}

export function themeStyleProperties(theme) {
  const normalized = normalizeTheme(theme);
  return {
    "--hri-font-family": fontStack(normalized.font),
    "--hri-bg-color": normalized.backgroundColor,
    "--hri-text-color": normalized.textColor,
    "--hri-accent-color": normalized.accentColor,
    "--hri-border-color": normalized.borderColor,
    "--hri-opacity": String(normalized.opacity),
  };
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

function cssString(value) {
  return JSON.stringify(value);
}

function normalizeColor(value, fallback) {
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;
}

function normalizeOpacity(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return DEFAULT_THEME.opacity;
  return Math.min(1, Math.max(0.5, number));
}
