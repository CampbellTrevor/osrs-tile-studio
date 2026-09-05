import type { Area } from "../area-types";

// The Wiki strategy page exports deep-delve tiles in template region 14180,
// plane 0. Keep this separate from the surface/first-delve encounter region.
// Mejrs zoom-2 and zoom-4 images were fetched and the arena visually inspected.
export const DOOM_AREAS: Area[] = [{
  id: "doom-of-mokhaiotl-deep-delves",
  name: "Doom of Mokhaiotl — deep delves",
  category: "Bosses",
  x: 3551,
  y: 6437,
  plane: 0,
  bounds: [3520, 6400, 3583, 6463],
  regionIds: [14180],
  aliases: ["doom", "mokhaiotl", "mokhai", "delve", "deep delves"],
  kind: "arena",
  source: "https://oldschool.runescape.wiki/w/Doom_of_Mokhaiotl/Strategies",
  coverage: "verified",
  verifiedOn: "2026-09-04",
}];
