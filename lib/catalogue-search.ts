import type { Area } from "./area-types";

/** Normalize search text while retaining word boundaries and non-Latin letters. */
function normalize(value: string): string {
  return value.normalize("NFKD")
    .replace(/\p{M}+/gu, "")
    .toLowerCase()
    .replace(/['\u2018\u2019`]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

// Older Buddies presets predate explicit aliases. Keep their familiar raid and
// boss abbreviations searchable alongside aliases supplied by newer records.
const COMMON_ALIASES: readonly (readonly [string, string])[] = [
  ["chambers of xeric", "cox"],
  ["theatre of blood", "tob"],
  ["theater of blood", "tob"],
  ["tombs of amascut", "toa"],
  ["dagannoth kings", "dk"],
  ["king black dragon", "kbd"],
];

/**
 * Every query token must match a name or alias, or the start of a region ID.
 * Exact names/aliases/IDs rank first, followed by word prefixes and substrings.
 * Equal matches keep catalogue order, and the input array is never changed.
 */
export function searchAreas(areas: readonly Area[], query: string, category = "All areas"): Area[] {
  const normalizedQuery = normalize(query);
  const candidates = areas.filter(area => category === "All areas" || area.category === category);
  if (!normalizedQuery) return candidates;
  const tokens = normalizedQuery.split(" ");

  return candidates.flatMap((area, index) => {
    const name = normalize(area.name);
    const aliases = (area.aliases ?? []).map(normalize);
    for (const [canonical, alias] of COMMON_ALIASES) {
      if (name.includes(canonical)) aliases.push(alias);
    }
    const fields = [name, ...aliases].filter(Boolean);
    const regionIds = (area.regionIds ?? []).map(String);
    const matchesRegion = (token: string) => /^\d+$/.test(token) && regionIds.some(id => id.startsWith(token));
    if (!tokens.every(token => fields.some(field => field.includes(token)) || matchesRegion(token))) return [];

    const exact = fields.includes(normalizedQuery) || regionIds.includes(normalizedQuery);
    const words = fields.flatMap(field => field.split(" "));
    const prefix = tokens.every(token => words.some(word => word.startsWith(token)) || matchesRegion(token));
    return [{ area, index, rank: exact ? 0 : prefix ? 1 : 2 }];
  }).sort((a, b) => a.rank - b.rank || a.index - b.index).map(match => match.area);
}
