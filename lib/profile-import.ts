import { markerKey, parseMarkers, type Marker } from "./markers.ts";

export type MarkerFileImport = {
  markers: Marker[];
  format: "runelite-json" | "runelite-profile";
  regionCount: number;
  ignoredSettings: boolean;
};

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_MARKERS = 20_000;
const DEFAULT_COLOR = "#FFFFFF00";
const propertyWhitespace = (char: string | undefined) => char === " " || char === "\t" || char === "\f";
type Property = { key: string; value: string; line: number; regionId?: number; group: string };

/** Java Properties joins odd trailing backslashes and skips continuation indentation. */
function* logicalLines(text: string): Generator<{ text: string; line: number }> {
  const lines = text.split(/\r\n|\n|\r/);
  for (let index = 0; index < lines.length; index++) {
    let value = lines[index].replace(/^[ \t\f]+/, "");
    const line = index + 1;
    if (!value || value[0] === "#" || value[0] === "!") continue;
    while (true) {
      let slashes = 0;
      for (let offset = value.length - 1; offset >= 0 && value[offset] === "\\"; offset--) slashes++;
      if (slashes % 2 === 0) break;
      value = value.slice(0, -1);
      index++;
      if (index >= lines.length) break;
      value += lines[index].replace(/^[ \t\f]+/, "");
    }
    yield { text: value, line };
  }
}

function unescapeProperty(value: string, line: number): string {
  let result = "";
  for (let index = 0; index < value.length; index++) {
    const char = value[index];
    if (char !== "\\") { result += char; continue; }
    index++;
    const escaped = value[index];
    if (escaped === undefined) break;
    if (escaped === "u") {
      const hex = value.slice(index + 1, index + 5);
      if (!/^[\da-f]{4}$/i.test(hex)) throw new Error(`Invalid Unicode escape in profile at line ${line}.`);
      result += String.fromCharCode(parseInt(hex, 16));
      index += 4;
    } else {
      const escapes: Record<string, string> = { t: "\t", n: "\n", r: "\r", f: "\f" };
      // Properties removes the backslash before other characters, including : = # and \.
      result += escapes[escaped] ?? escaped;
    }
  }
  return result;
}

function splitProperty(text: string): { key: string; value: string } {
  let end = 0;
  while (end < text.length) {
    if (text[end] === "\\") { end += 2; continue; }
    if (text[end] === "=" || text[end] === ":" || propertyWhitespace(text[end])) break;
    end++;
  }
  let start = end;
  while (propertyWhitespace(text[start])) start++;
  if (text[start] === "=" || text[start] === ":") start++;
  while (propertyWhitespace(text[start])) start++;
  return { key: text.slice(0, end), value: text.slice(start) };
}

/** ConfigManager persists Color.getRGB(); ColorUtil reads Java Integer.decode. */
function configuredColor(property: Property | undefined): string {
  if (!property) return DEFAULT_COLOR;
  const text = unescapeProperty(property.value, property.line).trim();
  const match = /^([+-]?)(?:0[xX]([\da-f]+)|#([\da-f]+)|(0[0-7]+)|(0|[1-9][0-9]*))$/i.exec(text);
  if (!match) throw new Error(`Invalid default Ground Markers color at line ${property.line}.`);
  const digits = match[2] ?? match[3] ?? match[4] ?? match[5];
  const radix = match[2] || match[3] ? 16 : match[4] ? 8 : 10;
  const number = parseInt(digits, radix) * (match[1] === "-" ? -1 : 1);
  if (!Number.isSafeInteger(number) || number < -2147483648 || number > 2147483647) {
    throw new Error(`Invalid default Ground Markers color at line ${property.line}.`);
  }
  return `#${(number >>> 0).toString(16).padStart(8, "0").toUpperCase()}`;
}

function result(markers: Marker[], format: MarkerFileImport["format"], ignoredSettings: boolean): MarkerFileImport {
  const regions = new Set(markers.map(marker => ((marker.x >> 6) << 8) | (marker.y >> 6)));
  return { markers, format, regionCount: regions.size, ignoredSettings };
}

/**
 * Read a marker export or UTF-8 RuneLite .properties profile entirely in memory.
 * Only Ground Markers values are decoded; unrelated profile settings are never
 * returned, logged, included in errors, or sent anywhere.
 *
 * Primary format references: RuneLite GroundMarkerPlugin.savePoints,
 * ConfigManager.getWholeKey/objectToString, and ConfigData's Properties.load.
 */
export function importMarkerFile(text: string, fileName = ""): MarkerFileImport {
  if (text.length > MAX_FILE_BYTES || new TextEncoder().encode(text).byteLength > MAX_FILE_BYTES) {
    throw new Error("Choose a marker or profile file no larger than 10 MB.");
  }
  const source = text.replace(/^\uFEFF/, "");
  if (/^[\s]*[\[{]/.test(source) || /\.json$/i.test(fileName)) {
    return result(parseMarkers(source), "runelite-json", false);
  }

  const properties = new Map<string, Property>();
  let ignoredSettings = false;
  for (const logical of logicalLines(source)) {
    const parts = splitProperty(logical.text);
    const key = unescapeProperty(parts.key, logical.line);
    // RuneLite uses groundMarker. Accept the lowercase plural spelling as an alias.
    const prefix = /^(groundMarker|groundmarkers)\.(region_|markerColor$)/.exec(key);
    if (!prefix) { ignoredSettings = true; continue; }
    const group = prefix[1];
    const property: Property = { key, value: parts.value, line: logical.line, group };
    if (key !== `${group}.markerColor`) {
      const region = /\.region_(-?\d+)$/.exec(key);
      const regionId = region ? Number(region[1]) : NaN;
      if (!Number.isInteger(regionId) || regionId < 0 || regionId > 65535) {
        throw new Error(`Invalid Ground Markers region key at line ${logical.line}.`);
      }
      property.regionId = regionId;
    }
    // Java Properties keeps the last occurrence of each key, including whole regions.
    properties.delete(key);
    properties.set(key, property);
  }

  const regions = [...properties.values()].filter(property => property.regionId !== undefined);
  if (!regions.length) throw new Error("No Ground Markers were found in this profile. Choose a RuneLite profile .properties file or a Ground Markers JSON export.");
  const markers = new Map<string, Marker>();
  let total = 0;
  for (const property of regions) {
    const context = `Ground Markers at line ${property.line} (region ${property.regionId})`;
    let entries: unknown;
    try { entries = JSON.parse(unescapeProperty(property.value, property.line)); }
    catch { throw new Error(`${context} must contain a valid JSON marker array.`); }
    if (!Array.isArray(entries)) throw new Error(`${context} must contain a JSON marker array.`);
    total += entries.length;
    if (total > MAX_MARKERS) throw new Error("A profile import can contain at most 20,000 markers.");
    const normalized = entries.map((entry: unknown) => {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) throw new Error(`${context} contains an invalid marker.`);
      const value = entry as Record<string, unknown>;
      if (value.regionId !== property.regionId) throw new Error(`${context} contains a marker whose regionId does not match its property key.`);
      return value.color === undefined || value.color === null
        ? { ...value, color: configuredColor(properties.get(`${property.group}.markerColor`)) }
        : value;
    });
    let parsed: Marker[];
    try { parsed = parseMarkers(JSON.stringify(normalized)); }
    catch { throw new Error(`${context} contains invalid marker coordinates, planes, colors, or labels.`); }
    for (const marker of parsed) markers.set(markerKey(marker), marker);
  }
  return result([...markers.values()], "runelite-profile", ignoredSettings);
}
