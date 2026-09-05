import assert from "node:assert/strict";
import test from "node:test";
import {
  displayColor,
  lineTiles,
  markerKey,
  normalizeColor,
  parseMarkers,
  rectangleTiles,
  serializeMarkers,
  toRuneLite,
} from "../lib/markers.ts";
import type { Marker } from "../lib/markers.ts";

const lumbridge = {
  regionId: 12_850,
  regionX: 22,
  regionY: 18,
  z: 0,
  color: "#80ff8800",
  label: "Stand here",
};

test("RuneLite roundtrip preserves world coordinates, planes, labels, and ARGB alpha", () => {
  const markers = parseMarkers(JSON.stringify([lumbridge]));
  assert.deepEqual(markers, [{ x: 3222, y: 3218, plane: 0, color: "#80FF8800", label: "Stand here" }]);
  assert.deepEqual(toRuneLite(markers), [{ ...lumbridge, color: "#80FF8800" }]);
  assert.deepEqual(parseMarkers(serializeMarkers(markers)), markers);
  assert.match(serializeMarkers(markers), /\n  \{/);
});

test("region conversion handles borders and the entire supported coordinate range", () => {
  const markers: Marker[] = [
    { x: 0, y: 0, plane: 0, color: "#FF112233" },
    { x: 63, y: 63, plane: 1, color: "#FF112233" },
    { x: 64, y: 63, plane: 2, color: "#FF112233" },
    { x: 63, y: 64, plane: 3, color: "#FF112233" },
    { x: 16_383, y: 16_383, plane: 3, color: "#FF112233" },
  ];
  assert.deepEqual(toRuneLite(markers).map(({ regionId, regionX, regionY }) => [regionId, regionX, regionY]), [
    [0, 0, 0], [0, 63, 63], [256, 0, 63], [1, 63, 0], [65_535, 63, 63],
  ]);
  assert.deepEqual(parseMarkers(serializeMarkers(markers)), markers);
});

test("colors normalize RGB as opaque and preserve transparent alpha in RuneLite order", () => {
  assert.equal(normalizeColor("#abcdef"), "#FFABCDEF");
  assert.equal(normalizeColor(" #0012abCd "), "#0012ABCD");
  assert.equal(displayColor("#8012abcd"), "#12ABCD");
  assert.equal(displayColor("#123abc"), "#123ABC");
  for (const color of ["red", "#123", "#1234567", "#123456789", "#GG112233", "123456", null, 1]) {
    assert.throws(() => normalizeColor(color as string), /Color must/);
  }
});

test("last duplicate tile wins while different floors remain distinct", () => {
  const markers = parseMarkers(JSON.stringify([
    lumbridge,
    { ...lumbridge, z: 1 },
    { ...lumbridge, color: "#123456", label: "Replacement" },
  ]));
  assert.equal(markers.length, 2);
  assert.equal(markers.find((marker) => marker.plane === 0)?.label, "Replacement");
  assert.equal(markers.find((marker) => marker.plane === 0)?.color, "#FF123456");
  assert.notEqual(markerKey(markers[0]), markerKey(markers[1]));
});

test("invalid JSON, shape, numeric types, coordinate ranges, and labels reject the entire import", () => {
  for (const text of ["", "not JSON", "{}", "null", "[null]", "[[]]"]) {
    assert.throws(() => parseMarkers(text));
  }
  for (const invalid of [
    { regionId: -1 }, { regionId: 65_536 }, { regionId: 1.5 }, { regionId: "12850" },
    { regionX: -1 }, { regionX: 64 }, { regionY: -1 }, { regionY: 64 },
    { z: -1 }, { z: 4 }, { z: 0.5 }, { color: "#BAD" },
    { label: "a".repeat(121) }, { label: 42 },
  ]) {
    const source = [lumbridge, { ...lumbridge, ...invalid }];
    const original = JSON.stringify(source);
    assert.throws(() => parseMarkers(original));
    assert.equal(JSON.stringify(source), original);
  }
  const { color: omitted, ...withoutColor } = lumbridge;
  assert.ok(omitted);
  assert.throws(() => parseMarkers(JSON.stringify([withoutColor])));
  assert.equal(parseMarkers(JSON.stringify([{ ...lumbridge, label: "a".repeat(120) }]))[0].label?.length, 120);
});

test("RuneLite nullable and omitted labels both normalize to an unlabeled marker", () => {
  const withoutLabel = { ...lumbridge };
  delete (withoutLabel as Partial<typeof lumbridge>).label;
  const omitted = parseMarkers(JSON.stringify([withoutLabel]));
  const explicitNull = parseMarkers(JSON.stringify([{ ...lumbridge, label: null }]));
  assert.deepEqual(explicitNull, omitted);
  assert.equal("label" in explicitNull[0], false);
  assert.equal("label" in toRuneLite(explicitNull)[0], false);
});

test("HTML-like and script-like labels survive as inert text", () => {
  const label = '<img src=x onerror="alert(1)"></script><script>throw new Error("bad")</script>';
  const markers = parseMarkers(JSON.stringify([{ ...lumbridge, label }]));
  assert.equal(markers[0].label, label);
  assert.equal(toRuneLite(markers)[0].label, label);
  assert.equal(parseMarkers(serializeMarkers(markers))[0].label, label);
});

test("exports reject invalid world coordinates, planes, labels, and counts", () => {
  const marker: Marker = { x: 3222, y: 3218, plane: 0, color: "#FF112233" };
  for (const invalid of [
    { x: -1 }, { x: 16_384 }, { x: 0.2 }, { y: -1 }, { y: 16_384 },
    { y: Number.NaN }, { x: Number.POSITIVE_INFINITY }, { plane: 4 },
    { label: "a".repeat(121) },
  ]) {
    assert.throws(() => toRuneLite([{ ...marker, ...invalid }]));
  }
  assert.throws(() => toRuneLite(Array.from({ length: 20_001 }, () => marker)), /20,000/);
  assert.throws(() => parseMarkers(JSON.stringify(Array.from({ length: 20_001 }, () => lumbridge))), /20,000/);
});

test("Bresenham lines include both endpoints and stay contiguous in all octants", () => {
  const start = { x: 20, y: 20 };
  for (const end of [
    { x: 30, y: 23 }, { x: 23, y: 30 }, { x: 17, y: 30 }, { x: 10, y: 23 },
    { x: 10, y: 17 }, { x: 17, y: 10 }, { x: 23, y: 10 }, { x: 30, y: 17 },
    { x: 20, y: 30 }, { x: 30, y: 20 }, { x: 20, y: 20 },
  ]) {
    const tiles = lineTiles(start, end);
    assert.deepEqual(tiles[0], start);
    assert.deepEqual(tiles.at(-1), end);
    assert.equal(tiles.length, Math.max(Math.abs(end.x - start.x), Math.abs(end.y - start.y)) + 1);
    assert.equal(new Set(tiles.map(({ x, y }) => `${x},${y}`)).size, tiles.length);
    tiles.slice(1).forEach((tile, index) => {
      assert.ok(Math.abs(tile.x - tiles[index].x) <= 1);
      assert.ok(Math.abs(tile.y - tiles[index].y) <= 1);
    });
  }
  assert.deepEqual(lineTiles({ x: 3, y: 3 }, { x: 0, y: 0 }), [
    { x: 3, y: 3 }, { x: 2, y: 2 }, { x: 1, y: 1 }, { x: 0, y: 0 },
  ]);
  assert.throws(() => lineTiles({ x: -1, y: 0 }, { x: 1, y: 1 }));
});

test("rectangles support reverse corners, filled selection, and degenerate rows without duplicates", () => {
  const a = { x: 10, y: 20 };
  const b = { x: 13, y: 23 };
  const outline = rectangleTiles(a, b);
  assert.equal(outline.length, 12);
  assert.equal(new Set(outline.map(({ x, y }) => `${x},${y}`)).size, 12);
  assert.ok(outline.every(({ x, y }) => x === 10 || x === 13 || y === 20 || y === 23));
  assert.deepEqual(rectangleTiles(b, a), outline);
  assert.equal(rectangleTiles(a, b, true).length, 16);
  assert.deepEqual(rectangleTiles(a, a), [a]);
  assert.equal(rectangleTiles(a, { x: 10, y: 23 }).length, 4);
  assert.equal(rectangleTiles(a, { x: 13, y: 20 }).length, 4);
  assert.throws(() => rectangleTiles({ x: 0.5, y: 0 }, b));
});

test("rectangle size guard admits exactly 20,000 tiles and prevents huge allocations", () => {
  assert.equal(rectangleTiles({ x: 0, y: 0 }, { x: 199, y: 99 }, true).length, 20_000);
  assert.throws(() => rectangleTiles({ x: 0, y: 0 }, { x: 200, y: 99 }, true), /20,000/);
  assert.equal(rectangleTiles({ x: 0, y: 0 }, { x: 5000, y: 5000 }).length, 20_000);
  assert.throws(() => rectangleTiles({ x: 0, y: 0 }, { x: 16_383, y: 16_383 }), /20,000/);
  assert.throws(() => rectangleTiles({ x: 0, y: 0 }, { x: 16_383, y: 16_383 }, true), /20,000/);
});
