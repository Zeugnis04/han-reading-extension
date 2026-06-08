const API_URL = "https://en.wiktionary.org/w/api.php";
const OLD_CHINESE_BS_MODULE_PREFIX = "Module:zh/data/och-pron-BS/";

const SHE_GROUPS = {
  通: "東冬鍾鐘",
  江: "江",
  止: "支脂之微",
  遇: "魚虞模",
  蟹: "齊佳皆灰咍祭泰夬廢",
  臻: "眞真諄臻文欣魂痕",
  山: "元寒桓刪山先仙",
  效: "蕭宵肴豪",
  果: "歌戈",
  假: "麻",
  宕: "陽唐",
  梗: "庚耕淸清靑青",
  曾: "蒸登",
  流: "尤侯幽",
  深: "侵",
  咸: "覃談鹽添咸銜嚴凡",
};

const FINAL_VARIANTS = {
  鍾: "鐘",
  真: "眞",
  清: "淸",
  青: "靑",
};

const DIVISION_LABELS = {
  I: "一",
  II: "二",
  III: "三",
  IV: "四",
};

const RIME_TURN_ROWS = [
  { turn: "1開", I: ["東"], II: [], III: ["東"], IV: [] },
  { turn: "2開合", I: ["冬"], II: [], III: ["鍾", "鐘"], IV: [] },
  { turn: "3開合", I: [], II: ["江"], III: [], IV: [] },
  { turn: "4開合", I: [], II: [], III: ["支"], IV: ["支"] },
  { turn: "5合", I: [], II: [], III: ["支"], IV: ["支"] },
  { turn: "6開", I: [], II: [], III: ["脂"], IV: ["脂"] },
  { turn: "7合", I: [], II: [], III: ["脂"], IV: ["脂"] },
  { turn: "8開", I: [], II: [], III: ["之"], IV: [] },
  { turn: "9開", I: [], II: [], III: ["微", "廢"], IV: [] },
  { turn: "10合", I: [], II: [], III: ["微", "廢"], IV: [] },
  { turn: "11開", I: [], II: [], III: ["魚"], IV: [] },
  { turn: "12開合", I: ["模"], II: [], III: ["虞"], IV: [] },
  { turn: "13開", I: ["咍"], II: ["皆", "夬"], III: ["祭"], IV: ["齊"] },
  { turn: "14合", I: ["灰"], II: ["皆", "夬"], III: ["祭"], IV: ["齊"] },
  { turn: "15開", I: ["泰"], II: ["佳"], III: [], IV: ["祭"] },
  { turn: "16合", I: ["泰"], II: ["佳"], III: [], IV: ["祭"] },
  { turn: "17開", I: ["痕"], II: [], III: ["臻"], IV: ["眞", "真"] },
  { turn: "18合", I: ["魂"], II: [], III: ["眞", "真"], IV: ["諄"] },
  { turn: "19開", I: [], II: [], III: ["欣"], IV: [] },
  { turn: "20合", I: [], II: [], III: ["文"], IV: [] },
  { turn: "21開", I: [], II: ["山"], III: ["元"], IV: ["仙"] },
  { turn: "22合", I: [], II: ["山"], III: ["元"], IV: ["仙"] },
  { turn: "23開", I: ["寒"], II: ["刪"], III: ["仙"], IV: ["先"] },
  { turn: "24合", I: ["桓"], II: ["刪"], III: ["仙"], IV: ["先"] },
  { turn: "25開", I: ["豪"], II: ["肴"], III: ["宵"], IV: ["蕭"] },
  { turn: "26合", I: [], II: [], III: [], IV: ["宵"] },
  { turn: "27合", I: ["歌"], II: [], III: [], IV: [] },
  { turn: "28合", I: ["戈"], II: [], III: ["戈"], IV: ["戈"] },
  { turn: "29開", I: [], II: ["麻"], III: ["麻"], IV: [] },
  { turn: "30合", I: [], II: ["麻"], III: [], IV: [] },
  { turn: "31開", I: ["唐"], II: [], III: ["陽"], IV: [] },
  { turn: "32合", I: ["唐"], II: [], III: ["陽"], IV: [] },
  { turn: "33開", I: [], II: ["庚"], III: ["庚"], IV: ["淸", "清"] },
  { turn: "34合", I: [], II: ["庚"], III: ["庚"], IV: ["淸", "清"] },
  { turn: "35開", I: [], II: ["耕"], III: [], IV: ["靑", "青"] },
  { turn: "36合", I: [], II: ["耕"], III: [], IV: ["靑", "青"] },
  { turn: "37開", I: ["侯"], II: [], III: ["尤"], IV: ["幽"] },
  { turn: "38合", I: [], II: [], III: ["侵"], IV: ["侵"] },
  { turn: "39合", I: ["覃"], II: ["咸"], III: ["鹽"], IV: ["添"] },
  { turn: "40開", I: ["談"], II: ["銜"], III: ["嚴"], IV: ["鹽"] },
  { turn: "41合", I: [], II: [], III: ["凡"], IV: [] },
  { turn: "42開", I: ["登"], II: [], III: ["蒸"], IV: [] },
  { turn: "43合", I: ["登"], II: [], III: ["職"], IV: [] },
];

export function normalize(value) {
  return value?.replace(/\s+/g, " ").trim() ?? "";
}

export function singleHanCharacter(value) {
  const characters = Array.from(value.trim()).filter(
    (character) => !/[\uFE00-\uFE0F\u{E0100}-\u{E01EF}]/u.test(character),
  );
  if (characters.length !== 1 || !/\p{Script=Han}/u.test(characters[0])) return null;
  return characters[0];
}

export function firstHanCharacter(value) {
  return Array.from(value).find((character) => /\p{Script=Han}/u.test(character)) ?? null;
}

function extractTemplate(wikitext, templateName) {
  const templates = [];
  const needle = `{{${templateName}`;
  let searchFrom = 0;

  while (searchFrom < wikitext.length) {
    const start = wikitext.indexOf(needle, searchFrom);
    if (start === -1) break;
    const boundary = wikitext[start + needle.length];
    if (boundary && boundary !== "|" && boundary !== "}" && !/\s/.test(boundary)) {
      searchFrom = start + needle.length;
      continue;
    }

    let depth = 0;
    let end = start;
    for (let index = start; index < wikitext.length - 1; index += 1) {
      const pair = wikitext.slice(index, index + 2);
      if (pair === "{{") {
        depth += 1;
        index += 1;
      } else if (pair === "}}") {
        depth -= 1;
        index += 1;
        if (depth === 0) {
          end = index + 1;
          break;
        }
      }
    }

    if (end > start) templates.push(wikitext.slice(start + 2, end - 2));
    searchFrom = Math.max(end, start + needle.length);
  }

  return templates;
}

function splitTemplate(template) {
  const parts = [];
  let current = "";
  let curlyDepth = 0;
  let squareDepth = 0;

  for (let index = 0; index < template.length; index += 1) {
    const pair = template.slice(index, index + 2);
    if (pair === "{{") {
      curlyDepth += 1;
      current += pair;
      index += 1;
    } else if (pair === "}}" && curlyDepth > 0) {
      curlyDepth -= 1;
      current += pair;
      index += 1;
    } else if (pair === "[[") {
      squareDepth += 1;
      current += pair;
      index += 1;
    } else if (pair === "]]" && squareDepth > 0) {
      squareDepth -= 1;
      current += pair;
      index += 1;
    } else if (template[index] === "|" && curlyDepth === 0 && squareDepth === 0) {
      parts.push(current.trim());
      current = "";
    } else {
      current += template[index];
    }
  }

  parts.push(current.trim());
  return parts;
}

function templateArguments(template) {
  const parts = splitTemplate(template);
  const named = {};
  const positional = [];

  for (const part of parts.slice(1)) {
    const equalsAt = part.indexOf("=");
    if (equalsAt > 0) {
      named[part.slice(0, equalsAt).trim()] = part.slice(equalsAt + 1).trim();
    } else {
      positional.push(part.trim());
    }
  }

  return { named, positional };
}

function cleanWikiValue(value) {
  return normalize(
    value
      .replace(/<!--[\s\S]*?-->/g, "")
      .replace(/<[^>]+>/g, "")
      .replace(/\{\{[^{}]*\}\}/g, "")
      .replace(/\[\[(?:[^\]|]*\|)?([^\]]+)\]\]/g, "$1")
      .replace(/<[^>]+/g, "")
      .replace(/-</g, "")
      .replace(/\^/g, "")
      .replace(/;/g, ", "),
  );
}

function unique(values) {
  return [...new Set(values.map(cleanWikiValue).filter(Boolean))].join(", ");
}

function oldChineseModuleTitle(character) {
  return `${OLD_CHINESE_BS_MODULE_PREFIX}${character}`;
}

function parseOldChineseModule(wikitext) {
  const readings = [];
  const luaString = String.raw`"((?:\\.|[^"\\])*)"`;
  const rowPattern = new RegExp(String.raw`\{\s*${luaString}\s*,\s*${luaString}\s*,\s*${luaString}`, "g");
  let match;

  while ((match = rowPattern.exec(wikitext)) !== null) {
    readings.push(match[3]);
  }

  return unique(readings);
}

function firstNamed(named, keys) {
  for (const key of keys) {
    if (named[key]) return cleanWikiValue(named[key]);
  }
  return "";
}

function cleanTaggedReadings(value, { firstOnly = false } = {}) {
  const groups = value.includes(";") ? value.split(";") : value.split(",");
  const readings = groups
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const tagged = part.includes(":") ? part.slice(part.lastIndexOf(":") + 1) : part;
      const assigned = tagged.includes("=") ? tagged.slice(tagged.lastIndexOf("=") + 1) : tagged;
      return cleanWikiValue(assigned);
    })
    .filter(Boolean);
  const cleaned = [...new Set(readings)];
  return (firstOnly ? cleaned.slice(0, 1) : cleaned).join(", ");
}

function cleanVietnameseReadingGroup(value, { firstOnly = false } = {}) {
  const readings = value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => cleanWikiValue(part.split(";")[0].replace(/-[a-z0-9]+$/i, "")))
    .filter(Boolean);
  const cleaned = [...new Set(readings)];
  return (firstOnly ? cleaned.slice(0, 1) : cleaned).join(", ");
}

function parseWikitext(wikitext) {
  const zhPron = extractTemplate(wikitext, "zh-pron")[0];
  const zhPronArgs = zhPron ? templateArguments(zhPron).named : {};
  const mandarin = zhPronArgs.m ?? "";
  const wu = cleanTaggedReadings(zhPronArgs.w || zhPronArgs.wu || "", { firstOnly: true });
  const hakka = cleanTaggedReadings(zhPronArgs.h || zhPronArgs.hak || "", { firstOnly: true });
  const gan = cleanTaggedReadings(zhPronArgs.gan || "", { firstOnly: true });
  const xiang = cleanTaggedReadings(zhPronArgs.x || zhPronArgs.xiang || "", { firstOnly: true });
  const oldChineseTemplate = extractTemplate(wikitext, "och-l")[0];
  const oldChineseFromTemplate = oldChineseTemplate
    ? cleanWikiValue(templateArguments(oldChineseTemplate).named.tr || "")
    : "";
  const oldChineseFromZhPron = firstNamed(zhPronArgs, ["oc-bs", "oc", "oc-zz"]);
  const oldChinese = oldChineseFromZhPron && oldChineseFromZhPron !== "y"
    ? oldChineseFromZhPron
    : oldChineseFromTemplate;

  const japaneseTemplates = extractTemplate(wikitext, "ja-readings");
  const onKeys = ["goon", "kanon", "toon", "soon", "kanyoon", "on"];
  const japaneseOn = [];
  const japaneseKun = [];

  for (const template of japaneseTemplates) {
    const { named } = templateArguments(template);
    for (const key of onKeys) {
      if (named[key]) japaneseOn.push(...named[key].split(","));
    }
    if (named.kun) japaneseKun.push(...named.kun.split(","));
  }

  const koHanja = extractTemplate(wikitext, "ko-hanja")[0];
  const koPron = extractTemplate(wikitext, "ko-hanja-pron")[0];
  let koreanReading = "";
  let koreanEumhun = "";

  if (koHanja) {
    const { positional } = templateArguments(koHanja);
    koreanEumhun = unique(positional.slice(0, 2));
    koreanReading = cleanWikiValue(positional[1] || positional[0] || "");
  }
  if (!koreanReading && koPron) {
    koreanReading = cleanWikiValue(templateArguments(koPron).positional[0] || "");
  }

  const viReadings = extractTemplate(wikitext, "vi-readings")[0];
  const viArgs = viReadings ? templateArguments(viReadings).named : {};
  const vietnamese = cleanVietnameseReadingGroup(viArgs.hanviet || "", { firstOnly: true });
  const vietnameseNom = cleanVietnameseReadingGroup(viArgs.nom || "", { firstOnly: true });

  const seeTemplate = extractTemplate(wikitext, "zh-see")[0];
  const relatedCharacter = seeTemplate
    ? cleanWikiValue(templateArguments(seeTemplate).positional[0]?.split("|")[0] || "")
    : "";

  return {
    pinyin: cleanWikiValue(mandarin),
    wu,
    hakka,
    gan,
    xiang,
    oldChinese,
    japaneseOn: unique(japaneseOn),
    japaneseKun: unique(japaneseKun),
    koreanReading,
    koreanEumhun,
    vietnamese,
    vietnameseNom,
    relatedCharacter: singleHanCharacter(relatedCharacter),
  };
}

function sectionContainer(documentNode, headingId) {
  const heading = documentNode.getElementById(headingId);
  const wrapper = heading?.closest(".mw-heading");
  if (!heading || !wrapper) return null;

  const level = Number(heading.tagName.slice(1));
  const container = document.createElement("div");
  let sibling = wrapper.nextElementSibling;

  while (sibling) {
    const nextHeading = sibling.matches(".mw-heading")
      ? sibling.querySelector("h2, h3, h4, h5, h6")
      : null;
    if (nextHeading && Number(nextHeading.tagName.slice(1)) <= level) break;
    container.append(sibling.cloneNode(true));
    sibling = sibling.nextElementSibling;
  }

  return container;
}

function rowValue(table, label) {
  for (const row of table.rows) {
    const heading = normalize(row.querySelector("th")?.textContent).replace(/\s+/g, " ");
    if (heading.toLowerCase().startsWith(label.toLowerCase())) {
      return normalize(row.querySelector("td")?.textContent);
    }
  }
  return "";
}

function cleanFinalName(finalName) {
  const normalized = finalName.replace(/\s*\(\d+\)\s*$/, "").trim();
  return FINAL_VARIANTS[normalized] ?? normalized;
}

function sheForFinal(finalName) {
  const normalizedFinal = cleanFinalName(finalName);
  const match = Object.entries(SHE_GROUPS).find(([, finals]) => finals.includes(normalizedFinal));
  return match ? `${match[0]}攝` : "";
}

function divisionClass(value) {
  const normalized = value.toUpperCase().replace(/[^IV]/g, "");
  return DIVISION_LABELS[normalized] ?? "";
}

function divisionKey(value) {
  const normalized = value.toUpperCase().replace(/[^IV]/g, "");
  if (normalized === "I" || normalized === "II" || normalized === "III" || normalized === "IV") return normalized;
  return "";
}

function opennessClass(value) {
  const normalized = value.toLowerCase();
  if (normalized.startsWith("closed") || normalized.includes("合")) return "合";
  return "";
}

function finalClass(finalName, division, openness) {
  const final = cleanFinalName(finalName);
  if (!final) return "";
  return `${final}${divisionClass(division)}${opennessClass(openness)}`;
}

function zhuanForReading(finalName, division, openness) {
  const final = cleanFinalName(finalName);
  const key = divisionKey(division);
  const closed = opennessClass(openness) === "合";
  if (!final || !key) return "";

  const candidates = RIME_TURN_ROWS.filter((row) => row[key].includes(final));
  const exact = candidates.find((row) => (closed ? row.turn.includes("合") : row.turn.includes("開")));
  return exact?.turn || candidates[0]?.turn || "";
}

function localizedOpenness(value) {
  const normalized = value.toLowerCase();
  if (normalized === "open") return "개 開";
  if (normalized === "closed") return "합 合";
  return value;
}

function localizedTone(value) {
  const normalized = value.toLowerCase();
  if (normalized.startsWith("level")) return "평 平";
  if (normalized.startsWith("rising")) return "상 上";
  if (normalized.startsWith("departing")) return "거 去";
  if (normalized.startsWith("checked")) return "입 入";
  return value;
}

function parseRenderedHtml(html) {
  const parsed = new DOMParser().parseFromString(html, "text/html");
  const chinese = sectionContainer(parsed, "Chinese");
  const pronunciation = chinese?.querySelector(".zhpron");

  const pinyin = normalize(
    pronunciation
      ?.querySelector('a[title="w:Pinyin"]')
      ?.closest("dd")
      ?.querySelector('.Latn[lang="cmn"]')
      ?.textContent,
  );
  const zhuyin = normalize(pronunciation?.querySelector(".Bopo")?.textContent);
  const readingForSystem = (title) => {
    const system = pronunciation?.querySelector(`a[title="${title}"]`);
    const entry = system?.closest("dd, li");
    return normalize(entry?.querySelector(".zhpron-monospace")?.textContent);
  };
  const cantoneseJyutping = readingForSystem("w:Jyutping");
  const minPoj = readingForSystem("w:Pe̍h-ōe-jī");

  const middleChinese = [];
  for (const table of pronunciation?.querySelectorAll("table") ?? []) {
    const baxter = rowValue(table, "Baxter");
    if (!baxter) continue;

    const final = rowValue(table, "Final");
    const division = rowValue(table, "Division");
    const openness = rowValue(table, "Openness");
    middleChinese.push({
      baxter,
      fanqie: rowValue(table, "Fanqie"),
      initial: rowValue(table, "Initial"),
      final,
      tone: localizedTone(rowValue(table, "Tone")),
      openness: localizedOpenness(openness),
      division,
      she: sheForFinal(final),
      finalClass: finalClass(final, division, openness),
      zhuan: zhuanForReading(final, division, openness),
    });
  }

  return { pinyin, zhuyin, cantoneseJyutping, minPoj, middleChinese };
}

export async function fetchWiktionary(character) {
  const params = new URLSearchParams({
    action: "parse",
    page: character,
    prop: "wikitext|text",
    redirects: "1",
    format: "json",
    formatversion: "2",
    origin: "*",
  });
  const response = await fetch(`${API_URL}?${params}`);
  if (!response.ok) throw new Error(`Wiktionary returned HTTP ${response.status}.`);

  const payload = await response.json();
  if (payload.error) throw new Error(payload.error.info || "Wiktionary has no entry for this character.");
  return {
    title: payload.parse.title,
    wikitext: payload.parse.wikitext,
    html: payload.parse.text,
  };
}

export async function getCharacterData(character, fetcher = fetchWiktionary) {
  const primary = await fetcher(character);
  const primaryWiki = parseWikitext(primary.wikitext);
  const primaryHtml = parseRenderedHtml(primary.html);
  let fallbackWiki = null;
  let fallbackHtml = null;
  let oldChineseFromModule = "";
  let sourceCharacter = primary.title;

  if (
    primaryWiki.relatedCharacter &&
    primaryWiki.relatedCharacter !== character &&
    (!primaryWiki.pinyin || primaryHtml.middleChinese.length === 0)
  ) {
    const fallback = await fetcher(primaryWiki.relatedCharacter);
    fallbackWiki = parseWikitext(fallback.wikitext);
    fallbackHtml = parseRenderedHtml(fallback.html);
    sourceCharacter = fallback.title;
  }

  if (!primaryWiki.oldChinese && !fallbackWiki?.oldChinese) {
    oldChineseFromModule = await fetchOldChineseModule(
      fallbackWiki?.relatedCharacter || primaryWiki.relatedCharacter || character,
      fetcher,
    );
  }

  return {
    character,
    sourceCharacter,
    pinyin: primaryHtml.pinyin || primaryWiki.pinyin || fallbackHtml?.pinyin || fallbackWiki?.pinyin || "",
    zhuyin: primaryHtml.zhuyin || fallbackHtml?.zhuyin || "",
    cantoneseJyutping: primaryHtml.cantoneseJyutping || fallbackHtml?.cantoneseJyutping || "",
    minPoj: primaryHtml.minPoj || fallbackHtml?.minPoj || "",
    wu: primaryWiki.wu || fallbackWiki?.wu || "",
    hakka: primaryWiki.hakka || fallbackWiki?.hakka || "",
    gan: primaryWiki.gan || fallbackWiki?.gan || "",
    xiang: primaryWiki.xiang || fallbackWiki?.xiang || "",
    japaneseOn: primaryWiki.japaneseOn || fallbackWiki?.japaneseOn || "",
    japaneseKun: primaryWiki.japaneseKun || fallbackWiki?.japaneseKun || "",
    koreanReading: primaryWiki.koreanReading || fallbackWiki?.koreanReading || "",
    koreanEumhun: primaryWiki.koreanEumhun || fallbackWiki?.koreanEumhun || "",
    vietnamese: primaryWiki.vietnamese || fallbackWiki?.vietnamese || "",
    vietnameseNom: primaryWiki.vietnameseNom || fallbackWiki?.vietnameseNom || "",
    oldChinese: primaryWiki.oldChinese || fallbackWiki?.oldChinese || oldChineseFromModule || "",
    middleChinese: primaryHtml.middleChinese.length ? primaryHtml.middleChinese : fallbackHtml?.middleChinese ?? [],
  };
}

async function fetchOldChineseModule(character, fetcher) {
  try {
    const module = await fetcher(oldChineseModuleTitle(character));
    return parseOldChineseModule(module.wikitext);
  } catch {
    return "";
  }
}
