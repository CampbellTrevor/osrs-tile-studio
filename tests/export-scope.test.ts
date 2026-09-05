import assert from "node:assert/strict";
import test from "node:test";
import { getExportSelection } from "../lib/export-scope.ts";
import type { Marker } from "../lib/markers";
import type { Area } from "../lib/area-types";

const marker = (x: number, y: number, plane = 0, label?: string): Marker => ({ x, y, plane, color: "#80FFAA00", ...(label ? { label } : {}) });
const view = { x: 3222.5, y: 3218.5, scale: 16, plane: 0 };
const size = { width: 800, height: 600 };
const baseArea: Area = { id: "test-arena", name: "Test arena", category: "Bosses", x: 3222, y: 3218, plane: 0 };

test("all scope includes every plane and preserves markers, order, and layout without mutation", () => {
  const markers = [marker(3551, 6437, 2), marker(3222, 3218), marker(3222, 3218, 1), marker(3552, 6438, 2, "Label")];
  const original = JSON.stringify(markers);
  const result = getExportSelection(markers, "all", { view, size });
  assert.deepEqual(result.markers, markers);
  assert.notEqual(result.markers, markers);
  assert.equal(result.markers[0], markers[0]);
  assert.deepEqual(result.regionIds, [12850, 14180]);
  assert.match(result.description, /4 markers.*3 planes/);
  assert.equal(JSON.stringify(markers), original);
});

test("area regions select all markers in all configured regions on the selected plane", () => {
  const inside = [marker(3200, 3200), marker(3263, 3263), marker(3520, 6400)];
  const markers = [...inside, marker(3200, 3200, 1), marker(3264, 3200), marker(3520, 6400, 1)];
  const area = { ...baseArea, regionIds: [14180, 12850, 14180] };
  const result = getExportSelection(markers, "area", { view, size, area });
  assert.deepEqual(result.markers, inside);
  assert.deepEqual(result.regionIds, [12850, 14180]);
  assert.match(result.description, /Entire regions 12850, 14180.*plane 0/);
});

test("ordinary area.bounds is never used to crop the export to a sample marker footprint", () => {
  const markers = [marker(3200, 3200), marker(3222, 3218), marker(3263, 3263)];
  const area: Area = { ...baseArea, regionIds: [12850], bounds: [3222, 3218, 3222, 3218] };
  assert.deepEqual(getExportSelection(markers, "area", { view, size, area }).markers, markers);
  assert.deepEqual(getExportSelection(markers, "area", { view, size, area: { ...area, regionIds: undefined } }).markers, markers);
});

test("explicit export bounds include their borders across region boundaries and override region lists", () => {
  const included = [marker(63, 63), marker(64, 63), marker(63, 64), marker(64, 64)];
  const markers = [...included, marker(62, 63), marker(65, 64), marker(64, 62), marker(63, 65), marker(63, 63, 1)];
  const area: Area = { ...baseArea, exportBounds: [63, 63, 64, 64], regionIds: [12850], bounds: [64, 64, 64, 64] };
  const result = getExportSelection(markers, "area", { view, size, area });
  assert.deepEqual(result.markers, included);
  assert.deepEqual(result.regionIds, [0, 1, 256, 257]);
  assert.match(result.description, /Arena tiles X 63–64, Y 63–64.*plane 0/);
});

test("missing area, empty region lists, and areas on another plane fall back to the center region", () => {
  const local = marker(3222, 3218);
  const markers = [local, marker(3551, 6437), marker(3222, 3218, 1)];
  const choices: (Area | undefined)[] = [
    undefined,
    { ...baseArea, regionIds: [] },
    { ...baseArea, plane: 1, regionIds: [14180], exportBounds: [3520, 6400, 3583, 6463] },
  ];
  for (const area of choices) {
    const result = getExportSelection(markers, "area", { view, size, area });
    assert.deepEqual(result.markers, [local]);
    assert.deepEqual(result.regionIds, [12850]);
    assert.match(result.description, /Entire region 12850.*plane 0/);
  }
});

test("visible scope uses positive tile overlap and excludes exact viewport edges and other planes", () => {
  const context = { view: { x: 10, y: 10, scale: 10, plane: 2 }, size: { width: 20, height: 20 } };
  // The viewport spans [9, 11] on both axes; touching an edge is not overlap.
  const inside = [marker(9, 9, 2), marker(10, 10, 2), marker(9, 10, 2), marker(10, 9, 2)];
  const markers = [...inside, marker(8, 9, 2), marker(11, 9, 2), marker(9, 8, 2), marker(9, 11, 2), marker(9, 9, 0)];
  const result = getExportSelection(markers, "visible", context);
  assert.deepEqual(result.markers, inside);
  assert.match(result.description, /Visible map tiles.*plane 2/);
  const partial = { ...context, view: { ...context.view, x: 10.25, y: 10.25 } };
  assert.deepEqual(getExportSelection([marker(11, 11, 2)], "visible", partial).markers, [marker(11, 11, 2)]);
});

test("region IDs describe only selected markers, including empty selections and zero-size views", () => {
  const markers = [marker(3222, 3218)];
  const result = getExportSelection(markers, "area", { view, size, area: { ...baseArea, regionIds: [14180] } });
  assert.deepEqual(result.markers, []);
  assert.deepEqual(result.regionIds, []);
  assert.match(result.description, /14180/);
  assert.deepEqual(getExportSelection([], "all", { view, size }).regionIds, []);
  assert.deepEqual(getExportSelection(markers, "visible", { view, size: { width: 0, height: 100 } }).markers, []);
});
