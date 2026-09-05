import assert from "node:assert/strict";
import test from "node:test";
import { importMarkerFile } from "../lib/profile-import.ts";
import { parseMarkers, serializeMarkers } from "../lib/markers.ts";

const lumbridge = { regionId: 12850, regionX: 22, regionY: 18, z: 0, color: "#80FF8800", label: "Stand here" };
const doom = { regionId: 14180, regionX: 31, regionY: 37, z: 0, color: "#FF123456" };

/** The relevant escaping applied by Java Properties.store to these JSON values. */
function propertyValue(value: unknown): string {
  return JSON.stringify(value).replace(/\\/g, "\\\\").replace(/([:=#!])/g, "\\$1");
}

const property = (region: number, values: unknown[], separator = "=") => `groundMarker.region_${region}${separator}${propertyValue(values)}`;

test("ordinary RuneLite JSON retains strict validation and reports unique regions across planes", () => {
  const json = JSON.stringify([lumbridge, { ...lumbridge, z: 1 }, doom]);
  const imported = importMarkerFile(`\uFEFF ${json}`, "tiles.json");
  assert.deepEqual(imported.markers, parseMarkers(json));
  assert.equal(imported.format, "runelite-json");
  assert.equal(imported.regionCount, 2);
  assert.equal(imported.ignoredSettings, false);
  assert.deepEqual(importMarkerFile("[]"), { markers: [], format: "runelite-json", regionCount: 0, ignoredSettings: false });
  assert.throws(() => importMarkerFile("not JSON", "tiles.JSON"), /valid JSON/);
  assert.throws(() => importMarkerFile('{"markers":[]}', "account.json"), /JSON array/);
  assert.throws(() => importMarkerFile(JSON.stringify([{ ...doom, color: null }])), /Color/);
});

test("real RuneLite UTF-8 profiles import every region while unrelated credentials remain absent", () => {
  const secret = "EXAMPLE_UNRELATED_PROFILE_VALUE";
  const profile = [
    "\uFEFF#RuneLite configuration",
    "  !another comment",
    `account.token=${secret}`,
    "unrelated.setting=\\uBROKEN",
    property(12850, [lumbridge]),
    property(14180, [doom]),
    "",
  ].join("\r\n");
  const imported = importMarkerFile(profile, "main-profile.properties");
  assert.equal(imported.format, "runelite-profile");
  assert.equal(imported.regionCount, 2);
  assert.equal(imported.ignoredSettings, true);
  assert.deepEqual(imported.markers, parseMarkers(JSON.stringify([lumbridge, doom])));
  assert.equal(JSON.stringify(imported).includes(secret), false);
  assert.equal(serializeMarkers(imported.markers).includes("account.token"), false);
});

test("Java property separators, leading whitespace, and the compatibility group spelling work", () => {
  for (const separator of ["=", ":", " ", "\t", "\f", " \t : \f", " \t =  "]) {
    const imported = importMarkerFile(` \t${property(12850, [lumbridge], separator)}`);
    assert.deepEqual(imported.markers, parseMarkers(JSON.stringify([lumbridge])));
  }
  const alias = property(12850, [lumbridge]).replace("groundMarker", "groundmarkers");
  assert.equal(importMarkerFile(alias).markers.length, 1);
  assert.throws(() => importMarkerFile(property(12850, [lumbridge]).replace("groundMarker", "GROUNDMarker")), /No Ground Markers/);
});

test("Java property escapes preserve JSON escaping, Unicode, punctuation, and literal backslashes", () => {
  const label = "Door: #1 = !safe \\ path\tTab\nLine\rReturn\fForm é 😀";
  const profile = property(12850, [{ ...lumbridge, label }])
    .replace("groundMarker", "ground\\u004Darker")
    .replace("é", "\\u00E9")
    .replace("😀", "\\uD83D\\uDE00");
  assert.equal(importMarkerFile(profile).markers[0].label, label);
  const unknownEscape = property(12850, [{ ...lumbridge, label: "safe" }]).replace("safe", "sa\\fe");
  assert.throws(() => importMarkerFile(unknownEscape), /valid JSON marker array/);
  const unrecognizedEscape = property(12850, [{ ...lumbridge, label: "safe" }]).replace("safe", "sa\\qe");
  assert.equal(importMarkerFile(unrecognizedEscape).markers[0].label, "saqe");
});

test("Java whitespace escapes work in a value outside JSON strings", () => {
  for (const escape of ["\\t", "\\n", "\\r"]) {
    const text = `groundMarker.region_12850=${escape}${propertyValue([lumbridge])}${escape}`;
    assert.equal(importMarkerFile(text).markers.length, 1);
  }
  // Form-feed is legal property whitespace but is not whitespace allowed by JSON.
  assert.throws(() => importMarkerFile(`groundMarker.region_12850=\\f${propertyValue([lumbridge])}`), /valid JSON marker array/);
});

test("line continuations remove escaped newlines and indentation, including inside JSON labels", () => {
  for (const newline of ["\n", "\r\n", "\r"]) {
    const value = property(12850, [{ ...lumbridge, label: "North door" }])
      .replace("North door", `North \\${newline} \t\fdoor`);
    assert.equal(importMarkerFile(value).markers[0].label, "North door");
  }
  const boundary = property(12850, [lumbridge]).replace("=[", "=\\\n \t[");
  assert.equal(importMarkerFile(boundary).markers.length, 1);
  const literalSlash = property(12850, [{ ...lumbridge, label: "trailing\\" }]);
  assert.equal(importMarkerFile(literalSlash).markers[0].label, "trailing\\");
  assert.equal(importMarkerFile(`${property(12850, [lumbridge])}\\`).markers.length, 1);
});

test("a continued line treats a leading comment character as data; ordinary comments never continue", () => {
  const continued = property(12850, [{ ...lumbridge, label: "North #door" }])
    .replace("North \\#door", "North \\\n  #door");
  assert.equal(importMarkerFile(continued).markers[0].label, "North #door");
  const profile = `# comment ending in a backslash\\\n${property(12850, [lumbridge])}`;
  assert.equal(importMarkerFile(profile).markers.length, 1);
});

test("Java Properties duplicate keys keep the final whole region; marker duplicates keep their last value", () => {
  const profile = [
    property(12850, [{ ...lumbridge, regionX: 0, label: "Old region only" }]),
    property(14180, [doom]),
    property(12850, [lumbridge, { ...lumbridge, label: "Last duplicate" }, { ...lumbridge, z: 1 }]),
  ].join("\n");
  const result = importMarkerFile(profile);
  assert.equal(result.markers.length, 3);
  assert.equal(result.markers.some(marker => marker.label === "Old region only"), false);
  assert.equal(result.markers.find(marker => marker.x === 3222 && marker.plane === 0)?.label, "Last duplicate");
  const crossGroup = `${property(12850, [lumbridge])}\ngroundmarkers.region_12850=${propertyValue([{ ...lumbridge, label: "Alias last" }])}`;
  assert.equal(importMarkerFile(crossGroup).markers[0].label, "Alias last");
});

test("legacy missing/null colors use RuneLite's configured signed ARGB color or default yellow", () => {
  const { color: omitted, ...legacy } = lumbridge;
  assert.ok(omitted);
  assert.equal(importMarkerFile(property(12850, [legacy])).markers[0].color, "#FFFFFF00");
  assert.equal(importMarkerFile(property(12850, [{ ...legacy, color: null, label: null }])).markers[0].label, undefined);
  const profile = `${property(12850, [legacy])}\ngroundMarker.markerColor=-2130771968`;
  assert.equal(importMarkerFile(profile).markers[0].color, "#80FF0000");
  assert.equal(importMarkerFile(profile).ignoredSettings, false);
  for (const value of ["-65536", "-0x10000", "-0200000", "-#10000"]) {
    assert.equal(importMarkerFile(`${property(12850, [legacy])}\ngroundMarker.markerColor=${value}`).markers[0].color, "#FFFF0000");
  }
  // An unrelated bad default does not invalidate markers that have their own color.
  assert.equal(importMarkerFile(`${property(12850, [lumbridge])}\ngroundMarker.markerColor=not-a-color`).markers[0].color, lumbridge.color);
  for (const color of ["not-a-color", "2147483648", "-2147483649", "09"]) {
    assert.throws(() => importMarkerFile(`${property(12850, [legacy])}\ngroundMarker.markerColor=${color}`), /Invalid default/);
  }
});

test("malformed region records reject atomically with row/region context and no profile values", () => {
  const sensitive = "EXAMPLE_UNRELATED_PROFILE_VALUE";
  const invalidValues = ["not json", "null", "{}", "[null]", JSON.stringify([{ ...doom, label: sensitive }])];
  for (const value of invalidValues) {
    const text = `account.token=${sensitive}\n${property(14180, [doom])}\ngroundMarker.region_12850=${value}`;
    assert.throws(() => importMarkerFile(text), (error: unknown) => {
      assert.ok(error instanceof Error);
      assert.match(error.message, /line 3 \(region 12850\)/);
      assert.equal(error.message.includes(sensitive), false);
      assert.equal(error.message.includes("account.token"), false);
      return true;
    });
  }
  for (const region of ["-1", "65536", "secret-value", "1.5"]) {
    assert.throws(() => importMarkerFile(`groundMarker.region_${region}=[]`), /Invalid Ground Markers region key at line 1/);
  }
  assert.throws(() => importMarkerFile(`groundMarker.region_12850=${propertyValue([{ ...lumbridge, regionX: 64 }])}`), /invalid marker coordinates/);
  assert.throws(() => importMarkerFile(`groundMarker.region_12850=${propertyValue([{ ...lumbridge, label: "a".repeat(121) }])}`), /invalid marker/);
  assert.throws(() => importMarkerFile("ground\\uZZZZMarker.region_12850=[]"), /Unicode escape.*line 1/);
});

test("empty profiles report missing markers, while explicit empty marker regions are valid", () => {
  for (const profile of ["", "\uFEFF#RuneLite configuration\r\n", "account.token=EXAMPLE", "groundMarker.markerColor=-256"]) {
    assert.throws(() => importMarkerFile(profile, "profile.properties"), /No Ground Markers/);
  }
  assert.deepEqual(importMarkerFile("groundMarker.region_12850=[]"), {
    markers: [], format: "runelite-profile", regionCount: 0, ignoredSettings: false,
  });
});

test("limits apply across regions and UTF-8 bytes before allocating oversized imports", () => {
  const first = Array.from({ length: 10_001 }, () => lumbridge);
  const second = Array.from({ length: 10_000 }, () => doom);
  assert.throws(() => importMarkerFile(`${property(12850, first)}\n${property(14180, second)}`), /20,000/);
  assert.throws(() => importMarkerFile("a".repeat(10 * 1024 * 1024 + 1)), /10 MB/);
  assert.throws(() => importMarkerFile("é".repeat(5 * 1024 * 1024 + 1)), /10 MB/);
});
