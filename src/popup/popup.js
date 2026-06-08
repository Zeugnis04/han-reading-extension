import { getCharacterData, singleHanCharacter } from "../lib/hanReadings.js";
import { loadSettings, modernRows, middleChineseRows, themeStyleProperties } from "../lib/settings.js";

const form = document.querySelector("#lookup-form");
const input = document.querySelector("#character-input");
const status = document.querySelector("#status");
const results = document.querySelector("#results");
const openOptions = document.querySelector("#open-options");
let currentSettings = await loadSettings();

applyTheme(currentSettings.theme);

openOptions.addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const character = singleHanCharacter(input.value);

  if (!character) {
    status.textContent = "Enter exactly one Han character.";
    results.hidden = true;
    input.focus();
    return;
  }

  status.textContent = `Fetching ${character} from Wiktionary...`;
  results.hidden = true;

  try {
    const [data, settings] = await Promise.all([
      getCharacterData(character),
      loadSettings(),
    ]);
    currentSettings = settings;
    applyTheme(currentSettings.theme);
    render(data, settings);
    status.textContent = data.sourceCharacter !== character
      ? `Showing ${character}; supplemented from ${data.sourceCharacter}.`
      : `Readings for ${character}.`;
  } catch (error) {
    status.textContent = error instanceof Error ? error.message : "The Wiktionary lookup failed.";
  }
});

function render(data, settings) {
  results.replaceChildren();

  const heading = document.createElement("div");
  heading.className = "character-heading";
  const title = document.createElement("h1");
  title.textContent = data.character;
  const source = document.createElement("a");
  source.href = `https://en.wiktionary.org/wiki/${encodeURIComponent(data.sourceCharacter)}`;
  source.target = "_blank";
  source.rel = "noreferrer";
  source.textContent = "Wiktionary";
  heading.append(title, source);
  results.append(heading);

  const modernTitle = document.createElement("h2");
  modernTitle.textContent = "Modern readings";
  results.append(modernTitle, definitionList(modernRows(data, settings)));

  const middleTitle = document.createElement("h2");
  middleTitle.textContent = "Middle Chinese";
  results.append(middleTitle);

  if (!data.middleChinese.length) {
    const empty = document.createElement("p");
    empty.className = "empty";
    empty.textContent = "No Middle Chinese reading is listed.";
    results.append(empty);
  } else {
    data.middleChinese.forEach((reading, index) => {
      if (data.middleChinese.length > 1) {
        const subtitle = document.createElement("h2");
        subtitle.textContent = `Reading ${index + 1}`;
        results.append(subtitle);
      }
      results.append(definitionList(middleChineseRows(reading, settings)));
    });
  }

  results.hidden = false;
}

function applyTheme(theme) {
  for (const [property, value] of Object.entries(themeStyleProperties(theme))) {
    document.documentElement.style.setProperty(property, value);
  }
}

function definitionList(rows) {
  const list = document.createElement("dl");
  for (const [label, value] of rows) {
    const dt = document.createElement("dt");
    const dd = document.createElement("dd");
    dt.textContent = label;
    dd.textContent = value || "Not listed";
    if (!value) dd.className = "empty";
    list.append(dt, dd);
  }
  return list;
}
