import type { Marker } from "./markers";

export type MarkerRegion = {
  id: string;
  regionId: number;
  plane: number;
  markers: Marker[];
  x: number;
  y: number;
  bounds: [number, number, number, number];
};

/** Separate floors so opening a group never hides some of that group's markers. */
export function groupMarkerRegions(markers: Marker[]): MarkerRegion[] {
  const groups = new Map<string, MarkerRegion>();
  for (const marker of markers) {
    const regionId = ((marker.x >> 6) << 8) | (marker.y >> 6);
    const id = `${regionId}:${marker.plane}`;
    let group = groups.get(id);
    if (!group) {
      group = { id, regionId, plane: marker.plane, markers: [], x: marker.x + .5, y: marker.y + .5, bounds: [marker.x, marker.y, marker.x, marker.y] };
      groups.set(id, group);
    }
    group.markers.push(marker);
    group.bounds[0] = Math.min(group.bounds[0], marker.x);
    group.bounds[1] = Math.min(group.bounds[1], marker.y);
    group.bounds[2] = Math.max(group.bounds[2], marker.x);
    group.bounds[3] = Math.max(group.bounds[3], marker.y);
    group.x = (group.bounds[0] + group.bounds[2] + 1) / 2;
    group.y = (group.bounds[1] + group.bounds[3] + 1) / 2;
  }
  return [...groups.values()].sort((a, b) => a.regionId - b.regionId || a.plane - b.plane);
}
