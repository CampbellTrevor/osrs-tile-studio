import type { Area } from "../area-types";

// Coordinate data adapted verbatim from RuneLite DungeonLocation.java.
// Copyright (c) 2020, Arman S <https://github.com/Rman887>.
// BSD-2-Clause: complete license in THIRD_PARTY_NOTICES.md.
export const DUNGEON_SOURCE = "https://github.com/runelite/runelite/blob/0e25fd80d0d248cb051761671a0bb60766556643/runelite-client/src/main/java/net/runelite/client/plugins/worldmap/DungeonLocation.java";

const points: [key: string, name: string, x: number, y: number, plane: number][] = [
  ["ABANDONED_MINE","Abandoned Mine",3439,3232,0],
  ["ANCIENT_CAVERN","Ancient Cavern",2511,3508,0],
  ["APE_ATOLL","Ape Atoll Dungeon",2762,2703,0],
  ["ASGARNIAN_ICE","Asgarnian Ice Dungeon",3007,3150,0],
  ["BRIMHAVEN_N","Brimhaven Dungeon",2743,3154,0],
  ["BRIMHAVEN_S","Brimhaven Dungeon",2759,3062,0],
  ["CATACOMBS_OF_KOUREND","Catacombs of Kourend",1636,3673,0],
  ["CHASM_OF_FIRE","Chasm of Fire",1432,3670,0],
  ["CORSAIR_COVE_E","Corsair Cove Dungeon",2522,2861,0],
  ["EDGEVILLE","Edgeville Dungeon",3096,3469,0],
  ["EDGEVILLE_SHED","Edgeville Dungeon",3115,3452,0],
  ["EDGEVILLE_WILDERNESS","Edgeville Dungeon",3087,3571,0],
  ["FORTHOS_E","Forthos Dungeon",1701,3574,0],
  ["FORTHOS_W","Forthos Dungeon",1669,3567,0],
  ["FREMENNIK_SLAYER","Fremennik Slayer Dungeon",2796,3615,0],
  ["GIANTS_DEN","Giants' Den",1419,3588,0],
  ["ISLE_OF_SOULS_DUNGEON","Isle of Souls Dungeon",2308,2919,0],
  ["IORWERTH","Iorwerth Dungeon",3224,6044,0],
  ["KALPHITE_CAVE","Kalphite Cave",3319,3122,0],
  ["KALPHITE_LAIR","Kalphite Lair",3226,3108,0],
  ["KARAMJA_VOLCANO","Karamja Dungeon",2855,3168,0],
  ["KARUULM_SLAYER","Karuulm Slayer Dungeon",1308,3807,0],
  ["KRAKEN_BOSS","Kraken (boss)",2279,10017,0],
  ["KRAKEN_COVE","Kraken Cove",2277,3611,0],
  ["LAVA_MAZE","Lava Maze Dungeon",3068,3856,0],
  ["LIZARDMAN_CAVES","Lizardman Caves",1306,3574,0],
  ["LIZARDMAN_TEMPLE_E","Lizardman Temple",1329,3669,0],
  ["LIZARDMAN_TEMPLE_N","Lizardman Temple",1311,3686,0],
  ["LIZARDMAN_TEMPLE_S","Lizardman Temple",1313,3663,0],
  ["LIZARDMAN_TEMPLE_W","Lizardman Temple",1291,3657,0],
  ["LUMBRIDGE_SWAMP","Lumbridge Swamp Caves",3168,3172,0],
  ["MORYTANIA_SPIDER_NEST","Morytania Spider Nest",3656,3409,0],
  ["MOS_LE_HARMLESS","Mos Le'Harmless Cave",3747,2973,0],
  ["MYTH_GUILD","Myths' Guild dungeon",2456,2847,0],
  ["OURANIA_CAVE","Ourania Cave",2451,3231,0],
  ["REVENANT_CAVES_N","Revenant Caves",3124,3832,0],
  ["REVENANT_CAVES_S","Revenant Caves",3074,3655,0],
  ["REVENANT_CAVES_W","Revenant Caves",3067,3741,0],
  ["RUINS_OF_CAMDOZAAL","Ruins of Camdozaal",2998,3493,0],
  ["SHADE_CATACOMBS","Shade Catacombs",3484,3321,0],
  ["SLAYER_TOWER","Slayer Tower basement",3416,3535,0],
  ["SMOKE_DEVIL","Smoke Devil Dungeon",2411,3061,0],
  ["SMOKE_DEVIL_BOSS","Thermonuclear Smoke Devil (boss)",2377,9452,0],
  ["SMOKE_DUNGEON","Smoke Dungeon",3309,2962,0],
  ["STALKER_DEN_W","Stalker Den",1296,3374,0],
  ["STALKER_DEN_E","Stalker Den",1324,3364,0],
  ["STRONGHOLD_OF_SECURITY","Stronghold of Security",3080,3420,0],
  ["STRONGHOLD_SLAYER","Stronghold Slayer Dungeon",2427,3424,0],
  ["TAVERLEY","Taverley Dungeon",2883,3397,0],
  ["TAVERLEY_ISLAND","Taverley Dungeon",2841,3424,0],
  ["TZHAAR_CITY","TzHaar City (Mor Ul Rek)",2862,9572,0],
  ["VARROCK_SEWERS","Varrock Sewers",3236,3458,0],
  ["VARROCK_SEWERS_ZOO","Varrock Sewers",3229,3504,0],
  ["WATERBIRTH","Waterbirth Dungeon",2520,3740,0],
  ["WATERBIRTH_SUBLEVELS","Waterbirth Dungeon (sub-levels)",2545,10143,0],
  ["WILDERNESS_GOD_WARS","Wilderness God Wars Dungeon",3016,3739,0],
  ["WILDERNESS_SLAYER_CAVE_NORTH","Wilderness Slayer Cave",3292,3746,0],
  ["WILDERNESS_SLAYER_CAVE_SOUTH","Wilderness Slayer Cave",3259,3666,0],
  ["WYVERN_CAVE","Wyvern Cave",3745,3779,0],
  ["WYVERN_CAVE_TASK","Wyvern Cave (task only)",3677,3854,0],
];

// These are the entrance/map-icon positions in RuneLite, not inferred dungeon
// interiors. A one-tile bound prevents an entrance naming its entire region.
export const DUNGEON_AREAS: Area[] = points.map(([key, name, x, y, plane]) => {
  const duplicates = points.filter(point => point[1] === name);
  const number = duplicates.findIndex(point => point[0] === key) + 1;
  return {
    id: `dungeon-${key.toLowerCase().replaceAll("_", "-")}`,
    name: `${name} — entrance${duplicates.length > 1 ? ` ${number}` : ""}`,
    category: "Dungeons",
    kind: "entrance",
    x, y, plane,
    bounds: [x, y, x, y],
    regionIds: [((x >> 6) << 8) | (y >> 6)],
    aliases: [name, key.replaceAll("_", " ").toLowerCase()],
    source: DUNGEON_SOURCE,
    coverage: "verified",
    verifiedOn: "2026-09-04",
  };
});
