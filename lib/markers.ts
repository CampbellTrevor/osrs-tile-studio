/** World-space marker utilities. RuneLite stores coordinates in 64 × 64 regions. */
export type Tile = { x: number; y: number };

export type Marker = Tile & {
  plane: number;
  /** RuneLite's ARGB format, normalized to uppercase #AARRGGBB. */
  color: string;
  label?: string;
};

export type RuneLiteMarker = {
  regionId: number;
  regionX: number;
  regionY: number;
  z: number;
  color: string;
  label?: string;
};

const MAX_MARKERS = 20_000;
const MAX_COORDINATE = 16_383;
const MAX_LABEL_LENGTH = 120;

function integerInRange(value: unknown, min: number, max: number, name: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < min || value > max) {
    throw new Error(`${name} must be an integer from ${min} to ${max}.`);
  }
  return value;
}

function record(value: unknown, name: string): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${name} must be an object.`);
  }
  return value as Record<string, unknown>;
}

function labelValue(value: unknown, name: string): string | undefined {
  // RuneLite's GroundMarkerPoint explicitly models an unlabeled tile as null.
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string" || value.length > MAX_LABEL_LENGTH) {
    throw new Error(`${name} must be text no longer than ${MAX_LABEL_LENGTH} characters.`);
  }
  return value;
}

function validateTile(tile: Tile, name: string): void {
  const value = record(tile, name);
  integerInRange(value.x, 0, MAX_COORDINATE, `${name}.x`);
  integerInRange(value.y, 0, MAX_COORDINATE, `${name}.y`);
}

function checkCount(count: number): void {
  if (count > MAX_MARKERS) {
    throw new Error(`A selection or import can contain at most ${MAX_MARKERS.toLocaleString("en-US")} tiles.`);
  }
}

/** The plane is part of identity: markers on different floors never overwrite each other. */
export function markerKey({ x, y, plane }: Pick<Marker, "x" | "y" | "plane">): string {
  return `${x},${y},${plane}`;
}

/** A six-digit RGB color is opaque; eight-digit RuneLite colors have alpha first. */
export function normalizeColor(color: string): string {
  if (typeof color !== "string" || !/^#(?:[\da-f]{6}|[\da-f]{8})$/i.test(color.trim())) {
    throw new Error("Color must be #RRGGBB or RuneLite #AARRGGBB hexadecimal text.");
  }
  const normalized = color.trim().toUpperCase();
  return normalized.length === 7 ? `#FF${normalized.slice(1)}` : normalized;
}

/** RGB for native color inputs. This deliberately excludes the preserved alpha channel. */
export function displayColor(color: string): string {
  return `#${normalizeColor(color).slice(3)}`;
}

/** Parse all markers before returning. Invalid input never produces a partial import. */
export function parseMarkers(text: string): Marker[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Markers must be valid JSON.");
  }
  if (!Array.isArray(parsed)) {
    throw new Error("Markers must be a RuneLite JSON array.");
  }
  checkCount(parsed.length);

  const markers = new Map<string, Marker>();
  parsed.forEach((entry: unknown, index: number) => {
    const name = `Marker ${index + 1}`;
    const value = record(entry, name);
    const regionId = integerInRange(value.regionId, 0, 65_535, `${name}.regionId`);
    const regionX = integerInRange(value.regionX, 0, 63, `${name}.regionX`);
    const regionY = integerInRange(value.regionY, 0, 63, `${name}.regionY`);
    const plane = integerInRange(value.z, 0, 3, `${name}.z`);
    const color = normalizeColor(value.color as string);
    const label = labelValue(value.label, `${name}.label`);
    const marker: Marker = {
      x: (regionId >> 8) * 64 + regionX,
      y: (regionId & 255) * 64 + regionY,
      plane,
      color,
      ...(label === undefined ? {} : { label }),
    };
    markers.set(markerKey(marker), marker);
  });
  return [...markers.values()];
}

/** Convert validated world coordinates back to RuneLite's native interchange format. */
export function toRuneLite(markers: readonly Marker[]): RuneLiteMarker[] {
  if (!Array.isArray(markers)) throw new Error("Markers must be an array.");
  checkCount(markers.length);
  return markers.map((marker, index) => {
    const name = `Marker ${index + 1}`;
    validateTile(marker, name);
    const plane = integerInRange(marker.plane, 0, 3, `${name}.plane`);
    const color = normalizeColor(marker.color);
    const label = labelValue(marker.label, `${name}.label`);
    return {
      regionId: ((marker.x >> 6) << 8) | (marker.y >> 6),
      regionX: marker.x & 63,
      regionY: marker.y & 63,
      z: plane,
      color,
      ...(label === undefined ? {} : { label }),
    };
  });
}

export function serializeMarkers(markers: readonly Marker[]): string {
  return JSON.stringify(toRuneLite(markers), null, 2);
}

/** Inclusive integer Bresenham line, supporting every direction and a single-tile stroke. */
export function lineTiles(a: Tile, b: Tile): Tile[] {
  validateTile(a, "Start tile");
  validateTile(b, "End tile");
  checkCount(Math.max(Math.abs(b.x - a.x), Math.abs(b.y - a.y)) + 1);
  const tiles: Tile[] = [];
  let x = a.x;
  let y = a.y;
  const dx = Math.abs(b.x - a.x);
  const dy = -Math.abs(b.y - a.y);
  const sx = a.x < b.x ? 1 : -1;
  const sy = a.y < b.y ? 1 : -1;
  let error = dx + dy;

  while (true) {
    tiles.push({ x, y });
    if (x === b.x && y === b.y) break;
    const twiceError = 2 * error;
    if (twiceError >= dy) {
      error += dy;
      x += sx;
    }
    if (twiceError <= dx) {
      error += dx;
      y += sy;
    }
  }
  return tiles;
}

/** Inclusive rectangle, with no duplicate corners. Reject oversized shapes before allocation. */
export function rectangleTiles(a: Tile, b: Tile, filled = false): Tile[] {
  validateTile(a, "Start tile");
  validateTile(b, "End tile");
  const left = Math.min(a.x, b.x);
  const right = Math.max(a.x, b.x);
  const bottom = Math.min(a.y, b.y);
  const top = Math.max(a.y, b.y);
  const width = right - left + 1;
  const height = top - bottom + 1;
  const count = filled || width === 1 || height === 1
    ? width * height
    : 2 * width + 2 * height - 4;
  checkCount(count);
  const tiles: Tile[] = [];

  if (filled || width === 1 || height === 1) {
    for (let y = bottom; y <= top; y++) {
      for (let x = left; x <= right; x++) tiles.push({ x, y });
    }
    return tiles;
  }

  for (let x = left; x <= right; x++) {
    tiles.push({ x, y: bottom }, { x, y: top });
  }
  for (let y = bottom + 1; y < top; y++) {
    tiles.push({ x: left, y }, { x: right, y });
  }
  return tiles;
}
