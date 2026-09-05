import assert from "node:assert/strict";
import test from "node:test";
import { groupMarkerRegions } from "../lib/marker-groups.ts";

test("all imported regions and planes are represented exactly once", () => {
  const markers = [
    { x: 3551, y: 6437, plane: 0, color: "#FFFFFF00" },
    { x: 3555, y: 6441, plane: 0, color: "#FFFFFF00" },
    { x: 3551, y: 6437, plane: 1, color: "#FFFFFF00" },
    { x: 3222, y: 3218, plane: 0, color: "#FFFFFF00" },
  ];
  const groups = groupMarkerRegions(markers);
  assert.equal(groups.length, 3);
  assert.deepEqual(groups.map(g => [g.regionId, g.plane, g.markers.length]), [[12850, 0, 1], [14180, 0, 2], [14180, 1, 1]]);
  assert.equal(groups.reduce((sum, group) => sum + group.markers.length, 0), markers.length);
  assert.deepEqual(groups[1].bounds, [3551, 6437, 3555, 6441]);
  assert.deepEqual([groups[1].x, groups[1].y], [3553.5, 6439.5]);
});

test("region boundary neighbors stay separate and empty files create no invented groups", () => {
  assert.deepEqual(groupMarkerRegions([]), []);
  const groups = groupMarkerRegions([63, 64].map(x => ({ x, y: 63, plane: 0, color: "#FFFFFFFF" })));
  assert.deepEqual(groups.map(group => group.regionId), [0, 256]);
});
