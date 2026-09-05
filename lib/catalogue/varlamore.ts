import type { Area } from "../area-types";

const QUEST_ROOT = "https://github.com/Zoinkwiz/quest-helper/blob/633ab56e2eb3eb363f21da3fd75f6f2bc0fa073a/src/main/java/com/questhelper/helpers/quests";
const MOONS_SOURCE = `${QUEST_ROOT}/perilousmoon/PerilousMoon.java`;

// These are authored NPC/object or strategy-marker coordinates, not guessed
// region centres. Verification covers the landing PNG at native zooms 2 and 4.
// Default bounds are region extents for naming, NOT room/collision outlines.
function destination(area: Omit<Area, "coverage" | "verifiedOn">): Area {
  const west = (area.x >> 6) * 64;
  const south = (area.y >> 6) * 64;
  return {
    ...area,
    bounds: area.bounds ?? [west, south, west + 63, south + 63],
    regionIds: [((area.x >> 6) << 8) | (area.y >> 6)],
    coverage: "verified",
    verifiedOn: "2026-09-04",
  };
}

export const VARLAMORE_AREAS: Area[] = [
  destination({
    id: "fortis-colosseum-arena",
    name: "Fortis Colosseum — arena",
    category: "Bosses",
    x: 1815, y: 3115, plane: 0,
    aliases: ["colosseum", "colo", "sol heredit", "sol", "north west pillar"],
    kind: "arena",
    source: "https://oldschool.runescape.wiki/w/Fortis_Colosseum/Strategies",
  }),
  destination({
    id: "hueycoatl-summit-arena",
    name: "The Hueycoatl — summit arena",
    category: "Bosses",
    x: 1512, y: 3289, plane: 0,
    aliases: ["huey", "hueycoatl", "huey coatl", "hailstorm mountains"],
    kind: "arena",
    source: "https://oldschool.runescape.wiki/w/The_Hueycoatl/Strategies",
  }),
  destination({
    id: "yama-arena",
    name: "Yama — arena",
    category: "Bosses",
    x: 1502, y: 10086, plane: 0,
    aliases: ["yama", "chasm of fire", "judge of yama"],
    kind: "arena",
    source: "https://oldschool.runescape.wiki/w/Yama/Strategies",
  }),
  destination({
    id: "moons-blood-moon-arena",
    name: "Moons of Peril — Blood Moon arena",
    category: "Bosses",
    x: 1391, y: 9632, plane: 0,
    bounds: [1373, 9614, 1421, 9650],
    exportBounds: [1373, 9614, 1421, 9650],
    aliases: ["blood moon", "perilous moons", "neypotzli"],
    kind: "arena",
    source: MOONS_SOURCE,
  }),
  destination({
    id: "moons-blue-moon-arena",
    name: "Moons of Peril — Blue Moon arena",
    category: "Bosses",
    x: 1441, y: 9678, plane: 0,
    bounds: [1417, 9647, 1463, 9699],
    exportBounds: [1417, 9647, 1463, 9699],
    aliases: ["blue moon", "perilous moons", "neypotzli"],
    kind: "arena",
    source: MOONS_SOURCE,
  }),
  destination({
    id: "moons-eclipse-moon-arena",
    name: "Moons of Peril — Eclipse Moon arena",
    category: "Bosses",
    x: 1487, y: 9632, plane: 0,
    bounds: [1457, 9614, 1506, 9650],
    exportBounds: [1457, 9614, 1506, 9650],
    aliases: ["eclipse moon", "perilous moons", "neypotzli"],
    kind: "arena",
    source: MOONS_SOURCE,
  }),
  destination({
    id: "amoxliatl-arena",
    name: "Amoxliatl — arena template",
    category: "Bosses",
    x: 1365, y: 4510, plane: 0,
    bounds: [1359, 4505, 1385, 4520],
    exportBounds: [1359, 4505, 1385, 4520],
    aliases: ["amox", "amoxliatl", "tapoyauik", "heart of darkness"],
    kind: "arena",
    source: `${QUEST_ROOT}/theheartofdarkness/TheHeartOfDarkness.java`,
  }),
  destination({
    id: "neypotzli-antechamber",
    name: "Neypotzli — central antechamber",
    category: "Dungeons",
    x: 1440, y: 9639, plane: 1,
    aliases: ["moons of peril", "perilous moons", "jessamine", "monolith", "moons hub"],
    kind: "room",
    source: MOONS_SOURCE,
  }),
  destination({
    id: "neypotzli-streambound-camp",
    name: "Neypotzli — Streambound Cavern camp",
    category: "Dungeons",
    x: 1510, y: 9693, plane: 0,
    aliases: ["moons of peril", "perilous moons", "supplies", "bream", "grubby sapling"],
    kind: "room",
    source: MOONS_SOURCE,
  }),
  destination({
    id: "neypotzli-earthbound-camp",
    name: "Neypotzli — Earthbound Cavern camp",
    category: "Dungeons",
    x: 1374, y: 9710, plane: 0,
    aliases: ["moons of peril", "perilous moons", "supplies", "moss lizard"],
    kind: "room",
    source: MOONS_SOURCE,
  }),
  destination({
    id: "doom-of-mokhaiotl-entrance",
    name: "Doom of Mokhaiotl — entrance door",
    category: "Bosses",
    x: 1311, y: 9533, plane: 1,
    aliases: ["doom", "mokhaiotl", "mokhai", "crypt of tonali", "final dawn"],
    kind: "entrance",
    source: `${QUEST_ROOT}/thefinaldawn/TheFinalDawn.java`,
  }),
  destination({
    id: "mastering-mixology-laboratory",
    name: "Mastering Mixology — laboratory",
    category: "Dungeons",
    x: 1394, y: 9326, plane: 0,
    aliases: ["mixology", "alchemy", "alchemical society", "aldarin", "herblore", "mixing vessel"],
    kind: "room",
    source: "https://github.com/hex-agon/mastering-mixology/blob/10f4ceda7fb044f006d0aecc449afcf2339acfa0/src/main/java/work/fking/masteringmixology/AlchemyObject.java",
  }),
  destination({
    id: "hunter-guild-caverns-entrance",
    name: "Hunter Guild Caverns — entrance",
    category: "Dungeons",
    x: 1557, y: 3049, plane: 0,
    aliases: ["hunter guild", "hunters guild", "hunters rumours", "hunter rumours", "hunter rumors", "hunters rumors"],
    kind: "entrance",
    source: "https://github.com/runelite/runelite/blob/ac79ed8bd8926bec7bf172aa291574b4d944b0e7/runelite-client/src/main/java/net/runelite/client/plugins/worldmap/DungeonLocation.java",
  }),
];
