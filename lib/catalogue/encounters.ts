import type { Area } from "../area-types";

/**
 * Verified encounter navigation points, researched 2026-09-04.
 * Evidence and coverage checks: docs/catalogue-encounters.md.
 *
 * Marker-derived bounds are the footprint of published guide markers, not the
 * full room or a collision mask. Whole-region bounds are used only where the
 * source identifies a single destination in that region and plane. Coordinates
 * identify original map templates; they do not describe a generated instance.
 */
const MARKERS = "https://github.com/jamiegyoung/runemarkers/blob/e7e618564bfc29a166db78efad56f20ff98ee1ac/entities/";
const HD_AREAS = "https://github.com/117HD/RLHD/blob/7a3c679547c3525a983ff3f15953ec626324b60c/src/main/resources/rs117/hd/scene/areas.json";

type Bounds = [number, number, number, number];

function markerSource(file: string): string {
  return MARKERS + encodeURIComponent(file + ".json");
}

function arena(
  id: string,
  name: string,
  regionId: number,
  plane: number,
  bounds: Bounds,
  source: string,
  aliases: string[],
  category = "Bosses",
): Area {
  return {
    id: `encounter-${id}`,
    name,
    category,
    x: Math.floor((bounds[0] + bounds[2]) / 2),
    y: Math.floor((bounds[1] + bounds[3]) / 2),
    plane,
    bounds,
    regionIds: [regionId],
    aliases,
    kind: "arena",
    source,
    coverage: "verified",
    verifiedOn: "2026-09-04",
  };
}

function regionBounds(regionId: number): Bounds {
  const x = (regionId >> 8) * 64;
  const y = (regionId & 255) * 64;
  return [x, y, x + 63, y + 63];
}

export const ENCOUNTER_AREAS: Area[] = [
  arena("bandos", "General Graardor — Bandos arena", 11347, 2,
    [2864, 5351, 2876, 5369], markerSource("general graardor (6-0)"),
    ["bandos", "gwd", "god wars", "graardor"]),
  arena("saradomin", "Commander Zilyana — Saradomin arena", 11602, 0,
    [2889, 5258, 2907, 5275], markerSource("commander zilyana"),
    ["sara", "saradomin", "gwd", "god wars", "zilyana"]),
  arena("zamorak", "K'ril Tsutsaroth — Zamorak arena", 11603, 2,
    [2919, 5319, 2936, 5329], markerSource("k'ril tsutsaroth (6-0)"),
    ["kril", "k'ril", "zammy", "zamorak", "gwd", "god wars"]),

  arena("dagannoth-kings", "Dagannoth Kings — regular cave", 11589, 0,
    regionBounds(11589), HD_AREAS,
    ["dks", "dk", "dagannoth rex", "dagannoth prime", "dagannoth supreme", "waterbirth"]),
  arena("dagannoth-kings-slayer", "Dagannoth Kings — Slayer cave", 11588, 0,
    regionBounds(11588), HD_AREAS,
    ["dks", "dk", "dagannoth rex", "dagannoth prime", "dagannoth supreme", "task only", "waterbirth"]),
  arena("kalphite-queen", "Kalphite Queen — lower lair", 13972, 0,
    regionBounds(13972), HD_AREAS,
    ["kq", "kalphite lair", "kalphite queen arena"]),
  arena("king-black-dragon", "King Black Dragon — lair template", 9033, 0,
    [2241, 4672, 2303, 4722], HD_AREAS,
    ["kbd", "king black dragon lair"]),
  arena("fight-caves", "Fight Caves — Jad arena", 9551, 0,
    regionBounds(9551), HD_AREAS,
    ["jad", "tztok-jad", "tztok jad", "fight cave", "fire cape", "tzhaar"]),

  arena("olm", "Chambers of Xeric — Great Olm", 12889, 0,
    [3228, 5734, 3237, 5746], markerSource("olm"),
    ["cox", "chambers", "olm", "great olm", "raids 1"], "Raids"),
  arena("maiden", "Theatre of Blood — Maiden", 12613, 0,
    [3170, 4430, 3186, 4457], markerSource("the maiden of sugadinti"),
    ["tob", "the maiden of sugadinti", "maiden", "raids 2"], "Raids"),
  arena("bloat", "Theatre of Blood — Pestilent Bloat", 13125, 0,
    [3280, 4445, 3285, 4450], markerSource("pestilent bloat"),
    ["tob", "bloat", "raids 2"], "Raids"),
  arena("nylocas", "Theatre of Blood — Nylocas", 13122, 0,
    [3292, 4244, 3299, 4253], markerSource("nylocas vasilias"),
    ["tob", "nylos", "nylocas vasilias", "raids 2"], "Raids"),
  arena("sotetseg", "Theatre of Blood — Sotetseg", 13123, 0,
    [3275, 4312, 3284, 4331], markerSource("sotetseg"),
    ["tob", "sote", "sotetseg", "raids 2"], "Raids"),
  arena("xarpus", "Theatre of Blood — Xarpus", 12612, 1,
    [3165, 4382, 3175, 4392], markerSource("xarpus"),
    ["tob", "xarpus", "raids 2"], "Raids"),
  arena("verzik", "Theatre of Blood — Verzik Vitur", 12611, 0,
    [3160, 4305, 3176, 4318], markerSource("verzik vitur"),
    ["tob", "verzik", "raids 2"], "Raids"),

  arena("akkha", "Tombs of Amascut — Akkha", 14676, 1,
    [3671, 5398, 3690, 5417], markerSource("akkha (butterfly tech)"),
    ["toa", "akkha", "butterfly", "raids 3"], "Raids"),
  arena("baba", "Tombs of Amascut — Ba-Ba", 15188, 0,
    [3798, 5405, 3818, 5412], markerSource("baba"),
    ["toa", "baba", "ba ba", "ba-ba", "raids 3"], "Raids"),
  arena("wardens-west", "Tombs of Amascut — Wardens, western template", 15184, 1,
    [3803, 5149, 3805, 5159], markerSource("tumekens warden (advanced tactics)"),
    ["toa", "warden", "wardens", "tumeken", "elidinis", "raids 3"], "Raids"),
  arena("wardens-east", "Tombs of Amascut — Wardens, eastern template", 15696, 1,
    [3930, 5157, 3942, 5165], markerSource("tumekens warden (advanced tactics)"),
    ["toa", "warden", "wardens", "tumeken", "elidinis", "raids 3"], "Raids"),

  arena("alchemical-hydra", "Alchemical Hydra — arena", 5536, 0,
    [1357, 10263, 1377, 10278], markerSource("alchemical hydra"),
    ["hydra", "alchemical", "karuulm", "hydra arena"]),
  arena("grotesque-guardians", "Grotesque Guardians — rooftop arena", 6727, 0,
    [1701, 4579, 1704, 4582], markerSource("grotesque guardians"),
    ["gg", "ggs", "dusk", "dawn", "gargoyles", "slayer tower"]),
  arena("abyssal-sire-southwest", "Abyssal Sire — southwest chamber", 11850, 0,
    [2969, 4770, 2971, 4780], markerSource("abyssal sire"),
    ["sire", "abyssal nexus", "abyssal sire arena"]),
  arena("inferno", "Inferno — combat arena", 9043, 0,
    [2260, 5341, 2282, 5358], markerSource("inferno"),
    ["zuk", "tzkal-zuk", "tzkal zuk", "infernal cape"]),
  arena("sarachnis", "Sarachnis — combat room", 7322, 0,
    [1839, 9899, 1844, 9904], markerSource("sarachnis"),
    ["sarachnis", "forthos", "forthos dungeon"]),
];
