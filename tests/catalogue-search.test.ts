import assert from "node:assert/strict";
import test from "node:test";
import { searchAreas } from "../lib/catalogue-search.ts";
import type { Area } from "../lib/area-types";

function area(id: string, name: string, extra: Partial<Area> = {}): Area {
  return { id, name, category: "Bosses", x: 3200, y: 3200, plane: 0, ...extra };
}

const catalogue: Area[] = [
  area("lumbridge", "Lumbridge", { category: "Towns & landmarks" }),
  area("doom", "Doom of Mokhaiotl — deep delves", { aliases: ["doom", "mokhai", "delve"], regionIds: [14180] }),
  area("cox", "Chambers of Xeric — Olm", { category: "Raids", regionIds: [12889] }),
  area("tob", "Theatre of Blood — Verzik", { category: "Raids", regionIds: [12613] }),
  area("toa", "Tombs of Amascut — Tumeken’s Warden", { category: "Raids", regionIds: [15184, 15696] }),
  area("dk", "Dagannoth Kings — lair", { aliases: ["Rex", "Prime", "Supreme"] }),
  area("kbd", "King Black Dragon — lair"),
  area("seers", "Seers’ Village", { category: "Towns & landmarks", aliases: ["Seer's Village"] }),
];

const ids = (results: Area[]) => results.map(result => result.id);

test("all query tokens match across names and aliases, including abbreviated Doom searches", () => {
  assert.deepEqual(ids(searchAreas(catalogue, "doom mokh")), ["doom"]);
  assert.deepEqual(ids(searchAreas(catalogue, "mokh doom")), ["doom"]);
  assert.deepEqual(ids(searchAreas(catalogue, "rex lair")), ["dk"]);
  assert.deepEqual(ids(searchAreas(catalogue, "doom nonexistent")), []);
  assert.deepEqual(ids(searchAreas(catalogue, "doom verzik")), []);
});

test("case, spacing, punctuation, apostrophes, and diacritics normalize consistently", () => {
  assert.deepEqual(ids(searchAreas(catalogue, "  DOOM---MÓKH  ")), ["doom"]);
  assert.deepEqual(ids(searchAreas(catalogue, "SEERS VILLAGE")), ["seers"]);
  assert.deepEqual(ids(searchAreas(catalogue, "Tumeken's—Warden")), ["toa"]);
  assert.deepEqual(ids(searchAreas([area("accent", "Café — Élite")], "cafe elite")), ["accent"]);
});

test("familiar raid and boss aliases work on records that have no explicit aliases", () => {
  for (const alias of ["cox", "tob", "toa", "dk", "kbd"]) {
    assert.deepEqual(ids(searchAreas(catalogue, alias)), [alias]);
  }
  assert.deepEqual(ids(searchAreas(catalogue, "tob verz")), ["tob"]);
  assert.deepEqual(ids(searchAreas(catalogue, "toa ward")), ["toa"]);
  assert.deepEqual(ids(searchAreas(catalogue, "kbd lair")), ["kbd"]);
});

test("region IDs match exactly or by prefix, across all IDs, without arbitrary numeric substrings", () => {
  assert.deepEqual(ids(searchAreas(catalogue, "14180")), ["doom"]);
  assert.deepEqual(ids(searchAreas(catalogue, "141")), ["doom"]);
  assert.deepEqual(ids(searchAreas(catalogue, "418")), []);
  assert.deepEqual(ids(searchAreas(catalogue, "15696")), ["toa"]);
  assert.deepEqual(ids(searchAreas(catalogue, "doom 141")), ["doom"]);
  assert.deepEqual(ids(searchAreas(catalogue, "doom 15696")), []);
});

test("exact matches rank above prefixes, then substrings, with stable ties", () => {
  const fixtures = [
    area("substring", "Megadoom cavern"),
    area("prefix-one", "Doom — cavern"),
    area("alias-exact", "Mokhaiotl", { aliases: ["doom"] }),
    area("name-exact", "Doom"),
    area("prefix-two", "Ancient Doom temple"),
    area("prefix-three", "Mokhaiotl", { aliases: ["doom cave"] }),
  ];
  assert.deepEqual(ids(searchAreas(fixtures, "doom")), [
    "alias-exact", "name-exact", "prefix-one", "prefix-two", "prefix-three", "substring",
  ]);
  const numeric = [
    area("longer-id", "Longer region", { regionIds: [14180] }),
    area("exact-id", "Exact region", { regionIds: [141] }),
  ];
  assert.deepEqual(ids(searchAreas(numeric, "141")), ["exact-id", "longer-id"]);
});

test("category filtering is exact and applies before relevance sorting", () => {
  assert.deepEqual(ids(searchAreas(catalogue, "", "Raids")), ["cox", "tob", "toa"]);
  assert.deepEqual(ids(searchAreas(catalogue, "toa", "Bosses")), []);
  assert.deepEqual(ids(searchAreas(catalogue, "toa", "Raids")), ["toa"]);
  assert.deepEqual(ids(searchAreas(catalogue, "", "raids")), []);
  assert.deepEqual(ids(searchAreas(catalogue, "", "Unknown category")), []);
});

test("empty or punctuation-only queries preserve source order without mutating input records", () => {
  const before = JSON.stringify(catalogue);
  for (const query of ["", "  ", "--- / …"]) {
    assert.deepEqual(searchAreas(catalogue, query), catalogue);
  }
  searchAreas(catalogue, "doom");
  searchAreas(catalogue, "toa");
  assert.equal(JSON.stringify(catalogue), before);
  assert.deepEqual(searchAreas([], "doom"), []);
});
