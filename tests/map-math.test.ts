import assert from "node:assert/strict";
import test from "node:test";
import {
  clampView,
  imageTileUrl,
  imageWorldBounds,
  isWorldTile,
  nativeImageZoom,
  panView,
  screenToTile,
  screenToWorld,
  tileScreenRect,
  viewWorldBounds,
  visibleImageTiles,
  worldToScreen,
  zoomAt,
} from "../lib/map-math.ts";

const view = { x: 3222, y: 3218, scale: 16, plane: 0 };
const size = { width: 800, height: 600 };

test("map projection is reversible and north is up", () => {
  assert.deepEqual(worldToScreen({ x: 3222, y: 3218 }, view, size), { x: 400, y: 300 });
  assert.deepEqual(worldToScreen({ x: 3223, y: 3219 }, view, size), { x: 416, y: 284 });
  const point = { x: 3199.75, y: 3240.25 };
  assert.deepEqual(screenToWorld(worldToScreen(point, view, size), view, size), point);
});

test("hover picks the containing tile at fractional and negative coordinates", () => {
  const inside = worldToScreen({ x: 3222.99, y: 3218.99 }, view, size);
  assert.deepEqual(screenToTile(inside, view, size), { x: 3222, y: 3218 });
  const before = worldToScreen({ x: -0.1, y: -0.1 }, view, size);
  assert.deepEqual(screenToTile(before, view, size), { x: -1, y: -1 });
  assert.equal(isWorldTile(screenToTile(before, view, size)), false);
  assert.equal(isWorldTile({ x: 16383, y: 16383 }), true);
  assert.equal(isWorldTile({ x: 16384, y: 0 }), false);
});

test("a marker covers exactly its tile, with the northern edge at y + 1", () => {
  assert.deepEqual(tileScreenRect({ x: 3222, y: 3218 }, view, size), {
    x: 400, y: 284, width: 16, height: 16,
  });
  assert.deepEqual(viewWorldBounds(view, size), { west: 3197, east: 3247, south: 3199.25, north: 3236.75 });
});

test("cursor zoom preserves the anchor and dragging follows the hand", () => {
  const cursor = { x: 145, y: 475 };
  const anchor = screenToWorld(cursor, view, size);
  const zoomed = zoomAt(view, size, cursor, 32);
  assert.deepEqual(screenToWorld(cursor, zoomed, size), anchor);
  assert.deepEqual(panView(view, { x: 32, y: -48 }), { ...view, x: 3220, y: 3215 });
});

test("view and scale are bounded even for malformed stored values", () => {
  assert.deepEqual(clampView({ x: -4, y: 19000, scale: 999, plane: 4 }), {
    x: 0, y: 16383, scale: 64, plane: 3,
  });
  assert.deepEqual(clampView({ x: NaN, y: Infinity, scale: -2, plane: -2 }), {
    x: 3222, y: 3218, scale: 0.125, plane: 0,
  });
});

test("Mejrs zoom 2 maps one image to one 64 × 64 OSRS region", () => {
  const image = { x: 50, y: 50, zoom: 2, plane: 0 };
  assert.deepEqual(imageWorldBounds(image), { west: 3200, east: 3264, south: 3200, north: 3264 });
  assert.equal(imageTileUrl(image), "https://raw.githubusercontent.com/mejrs/layers_osrs/master/mapsquares/-1/2/0_50_50.png");
  assert.deepEqual(imageWorldBounds({ x: 201, y: 201, zoom: 4, plane: 2 }), {
    west: 3216, east: 3232, south: 3216, north: 3232,
  });
  assert.equal(nativeImageZoom(0.125), -3);
  assert.equal(nativeImageZoom(7.9), 2);
  assert.equal(nativeImageZoom(64), 4);
});

test("visible image bounds exclude the next tile at an exact northern/eastern edge", () => {
  const centered = { x: 3232, y: 3232, scale: 4, plane: 1 };
  assert.deepEqual(visibleImageTiles(centered, { width: 256, height: 256 }), [
    { x: 50, y: 50, zoom: 2, plane: 1 },
  ]);
  const cornerTiles = visibleImageTiles({ ...centered, x: 0, y: 0 }, { width: 256, height: 256 });
  assert.deepEqual(cornerTiles, [{ x: 0, y: 0, zoom: 2, plane: 1 }]);
  assert.deepEqual(visibleImageTiles(centered, { width: 0, height: 0 }), []);
});
