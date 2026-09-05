import assert from "node:assert/strict";
import test from "node:test";
import { AREAS, BUDDIES_AREAS, findDetailedArea, resolveArea, resolveBuddiesArea } from "../lib/areas.ts";
import type { Area } from "../lib/areas";

test("Buddies location fixtures retain specific-area and raid precedence", () => {
  const fixtures: [number, number, string][] = [
    [3165, 3490, "Grand Exchange"],
    [1942, 5741, "Player-owned House"],
    [3030, 6441, "Duke Sucellus (Ghorrock Prison)"],
    [2917, 5312, "God Wars Dungeon"],
    [1232, 3573, "Chambers of Xeric"],
    [3200, 4320, "Theatre of Blood"],
    [3671, 5398, "Tombs of Amascut"],
    [3803, 5157, "Tombs of Amascut (Tumeken's Warden)"],
    [960, 2048, "Open Sea"],
    [2560, 5760, "Underground"],
  ];
  for (const [x, y, expected] of fixtures) assert.equal(resolveBuddiesArea(x, y), expected);
});

test("inclusive rectangle edges and adjacent tiles resolve correctly", () => {
  assert.equal(resolveArea(3140, 3465), "Grand Exchange");
  assert.equal(resolveArea(3195, 3525), "Grand Exchange");
  assert.equal(resolveArea(3196, 3525), "Varrock");
  assert.equal(resolveArea(3195, 3526), "Wilderness");
});

test("all 85 rectangles and 29 individual region presets survive the port", () => {
  assert.equal(BUDDIES_AREAS.length, 114);
  assert.equal(BUDDIES_AREAS.filter((area: Area) => area.regionIds).length, 29);
  assert.equal(new Set(AREAS.map((area: Area) => area.id)).size, AREAS.length);
  for (const area of AREAS as Area[]) {
    assert.ok(Number.isInteger(area.x) && Number.isInteger(area.y));
    assert.ok(area.plane >= 0 && area.plane <= 3);
    const [minX, minY, maxX, maxY] = area.bounds!;
    assert.ok(area.x >= minX && area.x <= maxX && area.y >= minY && area.y <= maxY, area.id);
    if (area.regionIds) assert.ok(area.regionIds.includes(((area.x >> 6) << 8) | (area.y >> 6)), area.id);
  }
});

test("Doom deep delves opens the verified template arena on plane zero", () => {
  const doom = AREAS.find(area => area.id === "doom-of-mokhaiotl-deep-delves");
  assert.ok(doom);
  assert.deepEqual([doom.x, doom.y, doom.plane], [3551, 6437, 0]);
  assert.deepEqual(doom.regionIds, [14180]);
  assert.equal(resolveArea(3551, 6437), doom.name);
  assert.equal(doom.coverage, "verified");
});

test("disconnected boss layouts retain distinct map destinations", () => {
  const whisperer = BUDDIES_AREAS.filter((area) => area.regionIds?.some((id) => [9571, 10595].includes(id)));
  assert.equal(whisperer.length, 2);
  assert.deepEqual(whisperer.map(({ x, y }) => [x, y]), [[2400, 6368], [2656, 6368]]);
  const warden = BUDDIES_AREAS.find((area) => area.regionIds?.includes(15184));
  assert.ok(warden);
  assert.deepEqual([warden.x, warden.y, warden.plane], [3803, 5157, 1]);
});

test("entrance points do not rename entire regions and detailed matches respect plane", () => {
  const entrance = AREAS.find(area => area.id === "dungeon-catacombs-of-kourend");
  assert.ok(entrance);
  assert.equal(findDetailedArea(entrance.x, entrance.y, entrance.plane)?.id, entrance.id);
  assert.notEqual(findDetailedArea(entrance.x + 1, entrance.y, entrance.plane)?.id, entrance.id);
  assert.notEqual(findDetailedArea(entrance.x, entrance.y, 1)?.id, entrance.id);
  assert.equal(findDetailedArea(3551, 6437, 0)?.id, "doom-of-mokhaiotl-deep-delves");
  assert.notEqual(findDetailedArea(3551, 6437, 1)?.id, "doom-of-mokhaiotl-deep-delves");
});

test("expanded arena shortcuts retain verified boss planes and cross-region room bounds", () => {
  for (const [id, plane] of [["encounter-bandos", 2], ["encounter-xarpus", 1], ["neypotzli-antechamber", 1], ["yama-arena", 0]] as const) {
    const area = AREAS.find(area => area.id === id);
    assert.ok(area);
    assert.equal(area.plane, plane);
    assert.equal(resolveArea(area.x, area.y, area.plane), area.name);
    assert.equal(area.coverage, "verified");
  }
  const moon = AREAS.find(area => area.id === "moons-blood-moon-arena");
  assert.ok(moon?.exportBounds);
  assert.ok((moon.exportBounds[0] >> 6) !== (moon.exportBounds[2] >> 6));
  assert.equal(resolveArea(1391, 9632, 0), moon.name);
});

test("invalid or unmapped coordinates have no invented place name", () => {
  for (const [x, y] of [[0, 0], [-1, 3490], [NaN, 3490], [3165.5, 3490], [16384, 3490]]) {
    assert.equal(resolveArea(x, y), "unknown area");
  }
});
