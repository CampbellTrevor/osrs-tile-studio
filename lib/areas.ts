/**
 * Place catalog adapted from Buddies' curated LocationResolver.java:
 * C:/Users/trevo/IdeaProjects/buddies/src/main/java/com/buddies/location/LocationResolver.java
 * Copyright (c) 2021, David Vorona; Copyright (c) 2026, Trevor Campbell.
 * BSD-2-Clause; the complete notice is in THIRD_PARTY_NOTICES.md.
 *
 * Bounds are inclusive world-tile coordinate ranges used for place naming.
 * They do not describe walkability, collision, room outlines, or image coverage.
 * Buddies' naming rules ignore plane. Most navigation presets default to plane 0;
 * test-confirmed landing points retain their actual plane. Instance coordinates
 * refer to the original template map, not a runtime instance's allocated space.
 */

import type { Area } from "./area-types";
import { DOOM_AREAS } from "./catalogue/doom.ts";
import { DUNGEON_AREAS } from "./catalogue/dungeons.ts";
import { VARLAMORE_AREAS } from "./catalogue/varlamore.ts";
import { ENCOUNTER_AREAS } from "./catalogue/encounters.ts";
export type { Area } from "./area-types";

type Bounds = NonNullable<Area["bounds"]>;
type Landing = [x: number, y: number, plane: number];
type PlaceRule = {
  name: string;
  category: string;
  bounds?: Bounds;
  regionIds?: number[];
  label?: string;
  landing?: Landing;
};

function rectangle(
  name: string,
  category: string,
  bounds: Bounds,
  label?: string,
  landing?: Landing,
): PlaceRule {
  return { name, category, bounds, label, landing };
}

function regions(name: string, category: string, ...regionIds: number[]): PlaceRule {
  return { name, category, regionIds };
}

const SPECIAL_AREAS: PlaceRule[] = [
  rectangle("Player-owned House", "Instances", [1856, 5056, 2047, 5759], "Player-owned House — layout area 1"),
  rectangle("Player-owned House", "Instances", [3584, 9472, 3647, 9535], "Player-owned House — layout area 2"),
  rectangle("Duke Sucellus (Ghorrock Prison)", "Bosses", [2944, 6336, 3071, 6527], undefined, [3030, 6441, 0]),
  rectangle("God Wars Dungeon", "Dungeons", [2816, 5248, 2943, 5375], undefined, [2917, 5312, 0]),
];

const SPECIFIC_AREAS: PlaceRule[] = [
  rectangle("Grand Exchange", "Towns & landmarks", [3140, 3465, 3195, 3525]),
  rectangle("Varrock", "Towns & landmarks", [3150, 3370, 3295, 3525]),
  rectangle("Edgeville", "Towns & landmarks", [3060, 3470, 3125, 3525]),
  rectangle("Barbarian Village", "Towns & landmarks", [3060, 3390, 3120, 3455]),
  rectangle("Lumbridge", "Towns & landmarks", [3190, 3170, 3265, 3275]),
  rectangle("Draynor Village", "Towns & landmarks", [3065, 3220, 3120, 3295]),
  rectangle("Falador", "Towns & landmarks", [2940, 3310, 3065, 3395]),
  rectangle("Port Sarim", "Towns & landmarks", [3005, 3180, 3065, 3265]),
  rectangle("Rimmington", "Towns & landmarks", [2920, 3180, 2985, 3250]),
  rectangle("Taverley", "Towns & landmarks", [2870, 3400, 2945, 3485]),
  rectangle("Burthorpe", "Towns & landmarks", [2860, 3520, 2945, 3585]),
  rectangle("Al Kharid", "Towns & landmarks", [3260, 3140, 3335, 3320]),
  rectangle("Shantay Pass", "Towns & landmarks", [3280, 3105, 3325, 3145]),
  rectangle("Catherby", "Towns & landmarks", [2775, 3400, 2865, 3475]),
  rectangle("Camelot", "Towns & landmarks", [2720, 3465, 2785, 3525]),
  rectangle("Seers' Village", "Towns & landmarks", [2680, 3440, 2735, 3505]),
  rectangle("Ardougne", "Towns & landmarks", [2540, 3260, 2675, 3375]),
  rectangle("Tree Gnome Stronghold", "Towns & landmarks", [2400, 3380, 2505, 3525]),
  rectangle("Tree Gnome Village", "Towns & landmarks", [2480, 3140, 2555, 3205]),
  rectangle("Yanille", "Towns & landmarks", [2535, 3060, 2625, 3135]),
  rectangle("Castle Wars", "Towns & landmarks", [2425, 3060, 2485, 3125]),
  rectangle("Rellekka", "Towns & landmarks", [2615, 3640, 2695, 3715]),
  rectangle("Miscellania", "Towns & landmarks", [2490, 3820, 2585, 3895]),
  rectangle("Etceteria", "Towns & landmarks", [2585, 3825, 2645, 3895]),
  rectangle("Lunar Isle", "Towns & landmarks", [2075, 3850, 2155, 3935]),
  rectangle("Waterbirth Island", "Towns & landmarks", [2505, 3710, 2575, 3775]),
  rectangle("Neitiznot", "Towns & landmarks", [2305, 3760, 2375, 3835]),
  rectangle("Jatizso", "Towns & landmarks", [2380, 3770, 2445, 3835]),
  rectangle("Canifis", "Towns & landmarks", [3450, 3450, 3525, 3525]),
  rectangle("Mort'ton", "Towns & landmarks", [3455, 3240, 3525, 3315]),
  rectangle("Burgh de Rott", "Towns & landmarks", [3465, 3150, 3545, 3225]),
  rectangle("Port Phasmatys", "Towns & landmarks", [3650, 3440, 3715, 3510]),
  rectangle("Darkmeyer", "Towns & landmarks", [3580, 3310, 3685, 3385]),
  rectangle("Prifddinas", "Towns & landmarks", [2150, 3300, 2295, 3455]),
  rectangle("Lletya", "Towns & landmarks", [2310, 3150, 2375, 3225]),
  rectangle("Brimhaven", "Towns & landmarks", [2730, 3120, 2825, 3220]),
  rectangle("Musa Point", "Towns & landmarks", [2820, 3140, 2925, 3195]),
  rectangle("Tai Bwo Wannai", "Towns & landmarks", [2770, 3030, 2835, 3095]),
  rectangle("Shilo Village", "Towns & landmarks", [2820, 2940, 2895, 3010]),
  rectangle("Ape Atoll", "Towns & landmarks", [2690, 2690, 2825, 2815]),
  rectangle("Fossil Island", "Towns & landmarks", [3650, 3710, 3850, 3895]),
  rectangle("Hosidius", "Towns & landmarks", [1690, 3500, 1835, 3655]),
  rectangle("Piscarilius", "Towns & landmarks", [1770, 3680, 1845, 3795]),
  rectangle("Lovakengj", "Towns & landmarks", [1410, 3720, 1545, 3855]),
  rectangle("Shayzien", "Towns & landmarks", [1420, 3540, 1575, 3695]),
  rectangle("Arceuus", "Towns & landmarks", [1570, 3760, 1725, 3895]),
  rectangle("Kourend Castle", "Towns & landmarks", [1600, 3650, 1695, 3735]),
  rectangle("Wintertodt Camp", "Towns & landmarks", [1605, 3930, 1665, 3995]),
  rectangle("Farming Guild", "Towns & landmarks", [1210, 3710, 1275, 3775]),
  rectangle("Mount Karuulm", "Towns & landmarks", [1280, 3790, 1375, 3885]),
  rectangle("Tempoross Cove", "Towns & landmarks", [3100, 2920, 3175, 2995]),
  rectangle("Ferox Enclave", "Towns & landmarks", [3110, 3605, 3185, 3675]),
  rectangle("Mage Arena", "Towns & landmarks", [3080, 3910, 3145, 3975]),
  rectangle("Lava Maze", "Towns & landmarks", [3000, 3810, 3075, 3885]),
];

const BOSS_REGIONS: PlaceRule[] = [
  regions("Duke Sucellus (Ghorrock Prison)", "Bosses", 12132),
  regions("Vardorvis (The Stranglewood)", "Bosses", 4405),
  regions("The Whisperer (Lassar Undercity)", "Bosses", 9571, 10595),
  regions("The Leviathan (The Scar)", "Bosses", 8291),
  regions("Phantom Muspah", "Bosses", 11330),
  regions("Moons of Peril", "Bosses", 5526, 5782, 5783, 6038),
  regions("Player-owned House", "Instances", 7769),
  regions("Sarachnis", "Bosses", 7322),
  regions("Zulrah", "Bosses", 9007, 9008),
  regions("Vorkath", "Bosses", 9023),
  regions("Inferno", "Bosses", 9043),
  regions("Tombs of Amascut (Tumeken's Warden)", "Raids", 15184, 15696),
];

const RAID_REGIONS: PlaceRule[] = [
  regions("Chambers of Xeric", "Raids", 12889, 13139, 13395),
  regions("Theatre of Blood", "Raids", 12611, 12612, 12613, 13123, 13125),
  regions("Tombs of Amascut", "Raids", 14676, 15188, 15698),
];

const RAID_AREAS: PlaceRule[] = [
  rectangle("Chambers of Xeric", "Raids", [1200, 3540, 1285, 3620], "Chambers of Xeric — surface entrance", [1232, 3573, 0]),
  rectangle("Chambers of Xeric", "Raids", [3200, 5152, 3359, 5759], "Chambers of Xeric — raid layouts"),
  rectangle("Theatre of Blood", "Raids", [3640, 3180, 3715, 3265], "Theatre of Blood — surface entrance"),
  rectangle("Theatre of Blood", "Raids", [3136, 4288, 3359, 4479], "Theatre of Blood — raid layouts", [3200, 4320, 0]),
  rectangle("Tombs of Amascut", "Raids", [3310, 2670, 3395, 2765], "Tombs of Amascut — surface entrance"),
  rectangle("Tombs of Amascut", "Raids", [3328, 9216, 3391, 9279], "Tombs of Amascut — underground"),
  rectangle("Tombs of Amascut", "Raids", [3648, 5120, 3967, 5439], "Tombs of Amascut — raid layouts", [3671, 5398, 1]),
];

const GEOGRAPHIC_AREAS: PlaceRule[] = [
  rectangle("Wilderness", "Regions", [2940, 3520, 3400, 4030]),
  rectangle("Misthalin", "Regions", [3070, 3200, 3335, 3520]),
  rectangle("Asgarnia", "Regions", [2870, 3200, 3075, 3525]),
  rectangle("Kandarin", "Regions", [2380, 3000, 2875, 3650]),
  rectangle("Fremennik Province", "Regions", [2460, 3600, 2800, 3925]),
  rectangle("Fremennik Isles", "Regions", [2260, 3725, 2465, 3925]),
  rectangle("Kharidian Desert", "Regions", [3150, 2800, 3550, 3265]),
  rectangle("Morytania", "Regions", [3350, 3150, 3810, 3610]),
  rectangle("Karamja", "Regions", [2680, 2750, 3025, 3225]),
  rectangle("Great Kourend", "Regions", [1380, 3450, 1850, 4010]),
  rectangle("Kebos Lowlands", "Regions", [1200, 3500, 1405, 3900]),
  rectangle("Varlamore", "Regions", [1260, 2900, 1850, 3450]),
  rectangle("Tirannwn", "Regions", [2100, 3100, 2400, 3455]),
  rectangle("Feldip Hills", "Regions", [2300, 2850, 2700, 3100]),
  rectangle("Piscatoris", "Regions", [2200, 3350, 2425, 3650]),
];

const FALLBACK_AREAS: PlaceRule[] = [
  rectangle("Open Sea", "Map spaces", [900, 1100, 2300, 3200], "Open Sea — western waters"),
  rectangle("Open Sea", "Map spaces", [2300, 2000, 4100, 2850], "Open Sea — southern waters"),
  rectangle("Open Sea", "Map spaces", [3900, 3000, 4300, 3711], "Open Sea — eastern waters"),
  rectangle("Underground", "Map spaces", [900, 3776, 4300, 10367]),
  rectangle("Instanced area", "Map spaces", [900, 10368, 4300, 12600]),
];

// Preserve Buddies' first-match precedence. In particular, Grand Exchange wins
// over Varrock, and named bosses/raids win over generic underground map space.
const PLACE_RULES: PlaceRule[] = [
  ...SPECIAL_AREAS,
  ...SPECIFIC_AREAS,
  ...BOSS_REGIONS,
  ...RAID_REGIONS,
  ...RAID_AREAS,
  ...GEOGRAPHIC_AREAS,
  ...FALLBACK_AREAS,
];

// These coordinates are asserted by Buddies' LocationResolverTest.java.
const REGION_LANDINGS: Record<number, Landing> = {
  12132: [3030, 6441, 0],
  15184: [3803, 5157, 1],
};

function slug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

/**
 * Searchable navigation presets. Each mapped region has its own destination,
 * including disconnected boss/raid layouts. Region numbers disambiguate maps
 * without guessing encounter names that the original mapping did not provide.
 */
export const BUDDIES_AREAS: Area[] = PLACE_RULES.flatMap((rule): Area[] => {
  if (rule.bounds) {
    const [minX, minY, maxX, maxY] = rule.bounds;
    const [x, y, plane] = rule.landing ?? [Math.floor((minX + maxX) / 2), Math.floor((minY + maxY) / 2), 0];
    return [{
      id: `${slug(rule.name)}-${minX}-${minY}`,
      name: rule.label ?? rule.name,
      category: rule.category,
      x,
      y,
      plane,
      bounds: [...rule.bounds],
    }];
  }

  return (rule.regionIds ?? []).map((regionId): Area => {
    const minX = (regionId >> 8) * 64;
    const minY = (regionId & 255) * 64;
    const [x, y, plane] = REGION_LANDINGS[regionId] ?? [minX + 32, minY + 32, 0];
    return {
      id: `${slug(rule.name)}-region-${regionId}`,
      name: `${rule.name} — region ${regionId}`,
      category: rule.category,
      x,
      y,
      plane,
      bounds: [minX, minY, minX + 63, minY + 63],
      regionIds: [regionId],
    };
  });
});

export const DETAILED_AREAS: Area[] = [...DOOM_AREAS, ...VARLAMORE_AREAS, ...ENCOUNTER_AREAS, ...DUNGEON_AREAS];
export const AREAS: Area[] = [...DOOM_AREAS, ...VARLAMORE_AREAS, ...ENCOUNTER_AREAS, ...BUDDIES_AREAS, ...DUNGEON_AREAS];

/** Match a sourced room/entrance on its actual plane; narrow bounds win. */
export function findDetailedArea(x: number, y: number, plane = 0): Area | undefined {
  if (![x, y, plane].every(Number.isInteger) || x < 0 || y < 0 || x > 16383 || y > 16383 || plane < 0 || plane > 3) return undefined;
  return DETAILED_AREAS.filter(area => {
    if (area.plane !== plane || !area.bounds) return false;
    const [west, south, east, north] = area.bounds;
    return x >= west && x <= east && y >= south && y <= north;
  }).sort((a, b) => {
    const size = (area: Area) => (area.bounds![2] - area.bounds![0] + 1) * (area.bounds![3] - area.bounds![1] + 1);
    return size(a) - size(b);
  })[0];
}

/** New precise presets augment, rather than rewrite, Buddies' original rules. */
export function resolveArea(x: number, y: number, plane = 0): string {
  return findDetailedArea(x, y, plane)?.name ?? resolveBuddiesArea(x, y);
}

/** Resolve integer world-tile coordinates using the original Buddies ordering. */
export function resolveBuddiesArea(x: number, y: number): string {
  if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || y < 0 || x > 16383 || y > 16383) {
    return "unknown area";
  }
  const regionId = ((x >> 6) << 8) | (y >> 6);
  for (const rule of PLACE_RULES) {
    if (rule.bounds) {
      const [minX, minY, maxX, maxY] = rule.bounds;
      if (x >= minX && x <= maxX && y >= minY && y <= maxY) return rule.name;
    } else if (rule.regionIds?.includes(regionId)) {
      return rule.name;
    }
  }
  return "unknown area";
}
