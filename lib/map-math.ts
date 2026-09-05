/** The map uses OSRS world coordinates directly: X east, Y north, planes 0–3. */
export type View = { x: number; y: number; scale: number; plane: number };
export type Point = { x: number; y: number };
export type Size = { width: number; height: number };
export type WorldBounds = { west: number; south: number; east: number; north: number };
export type MapImageTile = { x: number; y: number; zoom: number; plane: number };

export const MIN_SCALE = 0.125;
export const MAX_SCALE = 64;
export const MAX_WORLD_COORDINATE = 16_383;
export const IMAGE_SIZE = 256;
export const MAP_IMAGE_ROOT = "https://raw.githubusercontent.com/mejrs/layers_osrs/master/mapsquares/-1";

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const finite = (value: number, fallback: number) => Number.isFinite(value) ? value : fallback;

export function clampView(view: View): View {
  return {
    x: clamp(finite(view.x, 3222), 0, MAX_WORLD_COORDINATE),
    y: clamp(finite(view.y, 3218), 0, MAX_WORLD_COORDINATE),
    scale: clamp(finite(view.scale, 8), MIN_SCALE, MAX_SCALE),
    plane: clamp(Math.trunc(finite(view.plane, 0)), 0, 3),
  };
}

export function worldToScreen(point: Point, view: View, size: Size): Point {
  return {
    x: size.width / 2 + (point.x - view.x) * view.scale,
    y: size.height / 2 - (point.y - view.y) * view.scale,
  };
}

export function screenToWorld(point: Point, view: View, size: Size): Point {
  return {
    x: view.x + (point.x - size.width / 2) / view.scale,
    y: view.y - (point.y - size.height / 2) / view.scale,
  };
}

/** Floor, rather than round, picks the tile containing the pointer. */
export function screenToTile(point: Point, view: View, size: Size): Point {
  const world = screenToWorld(point, view, size);
  return { x: Math.floor(world.x), y: Math.floor(world.y) };
}

export function isWorldTile(point: Point): boolean {
  return Number.isInteger(point.x) && Number.isInteger(point.y)
    && point.x >= 0 && point.y >= 0
    && point.x <= MAX_WORLD_COORDINATE && point.y <= MAX_WORLD_COORDINATE;
}

export function tileScreenRect(tile: Point, view: View, size: Size) {
  const topLeft = worldToScreen({ x: tile.x, y: tile.y + 1 }, view, size);
  return { ...topLeft, width: view.scale, height: view.scale };
}

export function viewWorldBounds(view: View, size: Size): WorldBounds {
  const topLeft = screenToWorld({ x: 0, y: 0 }, view, size);
  const bottomRight = screenToWorld({ x: size.width, y: size.height }, view, size);
  return { west: topLeft.x, south: bottomRight.y, east: bottomRight.x, north: topLeft.y };
}

/** Keep the world point under the cursor fixed while zooming. */
export function zoomAt(view: View, size: Size, cursor: Point, requestedScale: number): View {
  const anchor = screenToWorld(cursor, view, size);
  const scale = clampView({ ...view, scale: requestedScale }).scale;
  return clampView({
    ...view,
    scale,
    x: anchor.x - (cursor.x - size.width / 2) / scale,
    y: anchor.y + (cursor.y - size.height / 2) / scale,
  });
}

export function panView(view: View, delta: Point): View {
  return clampView({ ...view, x: view.x - delta.x / view.scale, y: view.y + delta.y / view.scale });
}

/** Mejrs' native levels provide 2^zoom pixels per game tile in a 256px image. */
export function nativeImageZoom(scale: number): number {
  return clamp(Math.floor(Math.log2(Math.max(scale, 1 / 16))), -4, 4);
}

export function imageWorldBounds(tile: MapImageTile): WorldBounds {
  const span = IMAGE_SIZE / 2 ** tile.zoom;
  return {
    west: tile.x * span,
    south: tile.y * span,
    east: (tile.x + 1) * span,
    north: (tile.y + 1) * span,
  };
}

export function imageTileUrl(tile: MapImageTile): string {
  return `${MAP_IMAGE_ROOT}/${tile.zoom}/${tile.plane}_${tile.x}_${tile.y}.png`;
}

export function visibleImageTiles(view: View, size: Size): MapImageTile[] {
  if (size.width <= 0 || size.height <= 0) return [];
  const zoom = nativeImageZoom(view.scale);
  const span = IMAGE_SIZE / 2 ** zoom;
  const bounds = viewWorldBounds(view, size);
  const maxIndex = Math.floor(MAX_WORLD_COORDINATE / span);
  const west = Math.max(0, Math.floor(bounds.west / span));
  const east = Math.min(maxIndex, Math.ceil(bounds.east / span) - 1);
  const south = Math.max(0, Math.floor(bounds.south / span));
  const north = Math.min(maxIndex, Math.ceil(bounds.north / span) - 1);
  const tiles: MapImageTile[] = [];
  for (let y = south; y <= north; y++) {
    for (let x = west; x <= east; x++) tiles.push({ x, y, zoom, plane: view.plane });
  }
  return tiles;
}
