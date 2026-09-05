import { viewWorldBounds, type View, type Size } from "./map-math.ts";
import type { Area } from "./area-types";
import type { Marker } from "./markers";

export type ExportScope = "area" | "visible" | "all";
export type ExportContext = { view: View; size: Size; area?: Area };
export type ExportSelection = { markers: Marker[]; description: string; regionIds: number[] };

const markerRegion = (marker: Pick<Marker, "x" | "y">) => ((marker.x >> 6) << 8) | (marker.y >> 6);

function selection(markers: Marker[], description: string): ExportSelection {
  return { markers, description, regionIds: [...new Set(markers.map(markerRegion))].sort((a, b) => a - b) };
}

/** Select an export without modifying the layout or treating marker footprints as room bounds. */
export function getExportSelection(markers: readonly Marker[], scope: ExportScope, context: ExportContext): ExportSelection {
  const { view, size, area } = context;
  if (scope === "all") {
    const planes = new Set(markers.map(marker => marker.plane)).size;
    return selection([...markers], `All ${markers.length.toLocaleString("en-US")} markers · ${planes} ${planes === 1 ? "plane" : "planes"}`);
  }
  if (scope === "visible") {
    const bounds = viewWorldBounds(view, size);
    const visible = size.width > 0 && size.height > 0 ? markers.filter(marker => marker.plane === view.plane
      && marker.x + 1 > bounds.west && marker.x < bounds.east
      && marker.y + 1 > bounds.south && marker.y < bounds.north) : [];
    return selection(visible, `Visible map tiles · plane ${view.plane}`);
  }

  if (area?.plane === view.plane && area.exportBounds) {
    const [minX, minY, maxX, maxY] = area.exportBounds;
    return selection(markers.filter(marker => marker.plane === view.plane
      && marker.x >= minX && marker.x <= maxX && marker.y >= minY && marker.y <= maxY),
    `Arena tiles X ${minX}–${maxX}, Y ${minY}–${maxY} · plane ${view.plane}`);
  }

  const centerRegion = markerRegion({ x: Math.floor(view.x), y: Math.floor(view.y) });
  const configuredRegions = area?.plane === view.plane && area.regionIds?.length ? area.regionIds : [centerRegion];
  const regions = [...new Set(configuredRegions)].sort((a, b) => a - b);
  const regionSet = new Set(regions);
  return selection(markers.filter(marker => marker.plane === view.plane && regionSet.has(markerRegion(marker))),
    `Entire ${regions.length === 1 ? "region" : "regions"} ${regions.join(", ")} · plane ${view.plane}`);
}
