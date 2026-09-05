/**
 * Read-only image coverage check. Run:
 * node --experimental-strip-types scripts/check-map-coverage.mjs
 *
 * Uses sharp already present in this project's dependency tree. No files are
 * modified and no profile, credentials, or user marker data are sent anywhere.
 */
import sharp from "sharp";
import { DUNGEON_AREAS, DUNGEON_SOURCE } from "../lib/catalogue/dungeons.ts";

const IMAGE_ROOT = "https://raw.githubusercontent.com/mejrs/layers_osrs/master/mapsquares/-1";
const ZOOMS = [2, 3];
const CONCURRENCY = 6;
const TIMEOUT_MS = 15_000;

function statistics(pixels, width, height, bounds = { left: 0, top: 0, right: width, bottom: height }) {
  let total = 0;
  let nonBackground = 0;
  const colors = new Set();
  for (let y = bounds.top; y < bounds.bottom; y++) {
    for (let x = bounds.left; x < bounds.right; x++) {
      const offset = (y * width + x) * 4;
      const [red, green, blue, alpha] = pixels.subarray(offset, offset + 4);
      total++;
      if (alpha && Math.max(red, green, blue) > 8) {
        nonBackground++;
        colors.add(((red >> 3) << 10) | ((green >> 3) << 5) | (blue >> 3));
      }
    }
  }
  return { nonBackgroundFraction: total ? Number((nonBackground / total).toFixed(4)) : 0, colors: colors.size };
}

const jobs = new Map();
for (const area of DUNGEON_AREAS) {
  for (const zoom of ZOOMS) {
    const span = 256 / 2 ** zoom;
    const imageX = Math.floor(area.x / span);
    const imageY = Math.floor(area.y / span);
    const key = `${zoom}/${area.plane}_${imageX}_${imageY}.png`;
    const job = jobs.get(key) ?? { key, zoom, imageX, imageY, span, areas: [] };
    job.areas.push(area);
    jobs.set(key, job);
  }
}

const outcomes = new Map();
const queue = [...jobs.values()];
let cursor = 0;
async function worker() {
  while (cursor < queue.length) {
    const job = queue[cursor++];
    const url = `${IMAGE_ROOT}/${job.key}`;
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const buffer = Buffer.from(await response.arrayBuffer());
      if (buffer.byteLength > 2 * 1024 * 1024) throw new Error("Image exceeds 2 MiB");
      const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      if (info.width !== 256 || info.height !== 256 || info.channels !== 4) throw new Error("Unexpected image dimensions");
      const whole = statistics(data, info.width, info.height);
      const nonblank = whole.nonBackgroundFraction >= .005 && whole.colors >= 8;
      for (const area of job.areas) {
        const scale = 2 ** job.zoom;
        const centerX = Math.floor((area.x + .5 - job.imageX * job.span) * scale);
        const centerY = Math.floor(((job.imageY + 1) * job.span - area.y - .5) * scale);
        const radius = 2 * scale;
        const neighborhood = statistics(data, info.width, info.height, {
          left: Math.max(0, centerX - radius),
          top: Math.max(0, centerY - radius),
          right: Math.min(info.width, centerX + radius + 1),
          bottom: Math.min(info.height, centerY + radius + 1),
        });
        const status = !nonblank ? "blank image" : neighborhood.nonBackgroundFraction < .05 ? "blank near coordinate" : "verified";
        outcomes.set(`${area.id}:${job.zoom}`, { zoom: job.zoom, status, url, whole, neighborhood });
      }
    } catch (error) {
      for (const area of job.areas) {
        outcomes.set(`${area.id}:${job.zoom}`, { zoom: job.zoom, status: "unavailable", url, reason: error instanceof Error ? error.message : "Image request failed" });
      }
    }
  }
}
await Promise.all(Array.from({ length: CONCURRENCY }, worker));

const areas = DUNGEON_AREAS.map(area => ({
  id: area.id, name: area.name, x: area.x, y: area.y, plane: area.plane,
  region: ((area.x >> 6) << 8) | (area.y >> 6),
  verified: ZOOMS.every(zoom => outcomes.get(`${area.id}:${zoom}`)?.status === "verified"),
  images: ZOOMS.map(zoom => outcomes.get(`${area.id}:${zoom}`)),
}));
console.log(JSON.stringify({ checkedAt: new Date().toISOString(), source: DUNGEON_SOURCE, imageRoot: IMAGE_ROOT, uniqueImages: jobs.size, verifiedAreas: areas.filter(area => area.verified).length, areaCount: areas.length, areas }, null, 2));
