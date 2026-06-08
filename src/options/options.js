import {
  MIDDLE_CHINESE_FIELDS,
  MODERN_FIELDS,
  FONT_OPTIONS,
  LOCAL_FONT_PREFIX,
  defaultSettings,
  loadSettings,
  localFontOptions,
  saveSettings,
  themeStyleProperties,
} from "../lib/settings.js";

const modernContainer = document.querySelector("#modern-fields");
const middleContainer = document.querySelector("#middle-chinese-fields");
const modernCount = document.querySelector("#modern-count");
const middleCount = document.querySelector("#middle-chinese-count");
const resetButton = document.querySelector("#reset");
const status = document.querySelector("#status");
const themeFont = document.querySelector("#theme-font");
const themeBackground = document.querySelector("#theme-background");
const themeText = document.querySelector("#theme-text");
const themeAccent = document.querySelector("#theme-accent");
const themeBorder = document.querySelector("#theme-border");
const themeOpacity = document.querySelector("#theme-opacity");
const themeOpacityValue = document.querySelector("#theme-opacity-value");
let settings = await loadSettings();
let draggedItem = null;

await populateFontSelect();

render();
bindThemeControls();

resetButton.addEventListener("click", async () => {
  settings = await saveSettings(defaultSettings());
  render();
  showStatus("Reset.");
});

function render() {
  renderTheme();
  renderList({
    container: modernContainer,
    count: modernCount,
    definitions: MODERN_FIELDS,
    orderKey: "modernOrder",
    enabledKey: "modernEnabled",
  });
  renderList({
    container: middleContainer,
    count: middleCount,
    definitions: MIDDLE_CHINESE_FIELDS,
    orderKey: "middleChineseOrder",
    enabledKey: "middleChineseEnabled",
  });
}

function renderTheme() {
  applyTheme(settings.theme);
  ensureSelectedFontOption(settings.theme.font);
  themeFont.value = settings.theme.font;
  themeBackground.value = settings.theme.backgroundColor;
  themeText.value = settings.theme.textColor;
  themeAccent.value = settings.theme.accentColor;
  themeBorder.value = settings.theme.borderColor;
  themeOpacity.value = settings.theme.opacity;
  themeOpacityValue.textContent = `${Math.round(settings.theme.opacity * 100)}%`;
}

async function populateFontSelect() {
  const localFonts = await localFontOptions().catch(() => []);
  themeFont.replaceChildren(
    fontGroup("Generic", FONT_OPTIONS),
    fontGroup("Local Fonts", localFonts),
  );
  ensureSelectedFontOption(settings.theme.font);
}

function fontGroup(label, fonts) {
  const group = document.createElement("optgroup");
  group.label = label;

  if (!fonts.length) {
    const option = document.createElement("option");
    option.disabled = true;
    option.textContent = "Unavailable";
    group.append(option);
    return group;
  }

  for (const font of fonts) {
    const option = document.createElement("option");
    option.value = font.id;
    option.textContent = font.label;
    group.append(option);
  }

  return group;
}

function ensureSelectedFontOption(fontId) {
  if ([...themeFont.options].some((option) => option.value === fontId)) return;
  const option = document.createElement("option");
  option.value = fontId;
  option.textContent = fontId.startsWith(LOCAL_FONT_PREFIX) ? fontId.slice(LOCAL_FONT_PREFIX.length) : fontId;
  themeFont.append(option);
}

function applyTheme(theme) {
  for (const [property, value] of Object.entries(themeStyleProperties(theme))) {
    document.documentElement.style.setProperty(property, value);
  }
}

function bindThemeControls() {
  themeFont.addEventListener("change", () => updateTheme("font", themeFont.value));
  themeBackground.addEventListener("input", () => updateTheme("backgroundColor", themeBackground.value));
  themeText.addEventListener("input", () => updateTheme("textColor", themeText.value));
  themeAccent.addEventListener("input", () => updateTheme("accentColor", themeAccent.value));
  themeBorder.addEventListener("input", () => updateTheme("borderColor", themeBorder.value));
  themeOpacity.addEventListener("input", () => {
    themeOpacityValue.textContent = `${Math.round(Number(themeOpacity.value) * 100)}%`;
    updateTheme("opacity", Number(themeOpacity.value));
  });
}

function updateTheme(key, value) {
  updateSetting(async () => {
    settings.theme[key] = value;
  });
}

function renderList({ container, count, definitions, orderKey, enabledKey }) {
  container.replaceChildren();
  const byId = new Map(definitions.map((field) => [field.id, field]));
  const enabledCount = settings[orderKey].filter((id) => settings[enabledKey][id]).length;
  count.textContent = `${enabledCount}/${settings[orderKey].length} shown`;

  settings[orderKey].forEach((id, index) => {
    const field = byId.get(id);
    if (!field) return;

    const row = document.createElement("div");
    row.className = "field-row";
    row.draggable = true;
    row.dataset.id = id;
    row.addEventListener("dragstart", (event) => {
      draggedItem = { id, orderKey };
      row.classList.add("is-dragging");
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", id);
    });
    row.addEventListener("dragend", () => {
      draggedItem = null;
      row.classList.remove("is-dragging");
      clearDropTargets(container);
    });
    row.addEventListener("dragover", (event) => {
      if (draggedItem?.orderKey !== orderKey || draggedItem.id === id) return;
      event.preventDefault();
      clearDropTargets(container);
      row.classList.add("is-drop-target");
    });
    row.addEventListener("drop", (event) => {
      event.preventDefault();
      if (draggedItem?.orderKey !== orderKey || draggedItem.id === id) return;
      updateSetting(async () => {
        moveById(settings[orderKey], draggedItem.id, id);
      });
    });

    const label = document.createElement("label");
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = Boolean(settings[enabledKey][id]);
    checkbox.addEventListener("change", () => updateSetting(async () => {
      settings[enabledKey][id] = checkbox.checked;
    }));
    label.append(checkbox, field.label);

    const handle = document.createElement("span");
    handle.className = "drag-handle";
    handle.setAttribute("aria-hidden", "true");
    handle.title = "Drag to reorder";
    handle.append(document.createElement("span"));

    row.append(label, handle);
    container.append(row);
  });
}

async function updateSetting(mutator) {
  await mutator();
  settings = await saveSettings(settings);
  render();
  showStatus("Saved.");
}

function move(list, from, to) {
  if (from === to) return;
  const [item] = list.splice(from, 1);
  list.splice(to, 0, item);
}

function moveById(list, draggedId, targetId) {
  const from = list.indexOf(draggedId);
  const to = list.indexOf(targetId);
  if (from === -1 || to === -1 || from === to) return;
  move(list, from, to);
}

function clearDropTargets(container) {
  container.querySelectorAll(".is-drop-target").forEach((row) => {
    row.classList.remove("is-drop-target");
  });
}

function showStatus(message) {
  status.textContent = message;
  window.clearTimeout(showStatus.timeout);
  showStatus.timeout = window.setTimeout(() => {
    status.textContent = "";
  }, 1400);
}
