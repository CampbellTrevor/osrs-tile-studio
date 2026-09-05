# Encounter catalogue evidence

Research and live imagery checks performed on **2026-09-04**. The 24 destinations
in `lib/catalogue/encounters.ts` supplement the original Buddies shortcuts with
named combat rooms and verified floors. The original Buddies mapping is preserved.

## Sources and coordinate derivation

Most destinations use published RuneLite marker data from the author-maintained
[RuneMarkers entities](https://github.com/jamiegyoung/runemarkers/tree/e7e618564bfc29a166db78efad56f20ff98ee1ac/entities)
at commit `e7e618564bfc29a166db78efad56f20ff98ee1ac`. Each catalogue entry links to
its exact JSON file; those files also retain the guide creator's source where
available. No marker colors, labels, or combat strategies are imported.

For each marker: `x = (regionId >> 8) * 64 + regionX`,
`y = (regionId & 255) * 64 + regionY`, and `plane = z`. The navigation point is
the floored midpoint of the marker footprint listed below. The bounds are that
footprint, not the complete arena and not a guarantee that the midpoint is a
walkable tile. This provides a reproducible camera destination without inventing
room outlines.

Legacy caves use the explicitly named regions or bounds in
[117 HD's area metadata](https://github.com/117HD/RLHD/blob/7a3c679547c3525a983ff3f15953ec626324b60c/src/main/resources/rs117/hd/scene/areas.json)
at commit `7a3c679547c3525a983ff3f15953ec626324b60c`. Their camera points are
region/bounds midpoints, not measured boss spawn points. Dagannoth Kings' regular
and Slayer cave names and planes come from `DAGANNOTH_KINGS_REGULAR_CAVE` and
`DAGANNOTH_KINGS_SLAYER_CAVE`; KQ's lower floor comes from
`KALPHITE_LAIR_QUEEN_ROOM`. The
[Wiki's published Dagannoth Kings route/arena markers](https://oldschool.runescape.wiki/w/Dagannoth_Kings/Strategies)
independently corroborate both cave regions at plane 0.

`TZHAAR_FIGHT_CAVES` identifies region 9551; its plane-0 arena image was checked.
`NIGHTMARE_ZONE_AND_KING_BLACK_DRAGON` supplies bounds
`[2241,4670,2303,4722]`. The KBD preset clips the southern two rows to region
9033 (`y >= 4672`) to retain a single-region destination. This template is also
reused by Nightmare Zone; the preset does not assert exclusive ownership.

## Destination evidence and image coverage

Every image below returned **HTTP 200**, decoded as a **256 × 256 PNG**, and
contained multiple sampled opaque colors. Tests sampled every eighth pixel in
both dimensions to reject uniform placeholder images. `coverage: "verified"`
means this map-image check passed on the research date; it does not promise
future availability or current-game collision accuracy.

Image filenames below are relative to
[`https://raw.githubusercontent.com/mejrs/layers_osrs/master/mapsquares/-1/2/`](https://github.com/mejrs/layers_osrs/tree/master/mapsquares/-1/2).
At native zoom 2, one image covers 64 × 64 game tiles. Its filename is
`{plane}_{floor(x / 64)}_{floor(y / 64)}.png`. **The native Y index is not
inverted.** Screen drawing inverts the vertical direction separately because
world north is positive Y.

| Destination | Region / plane | Bounds: min X, min Y, max X, max Y | Evidence entity / metadata name | PNG filename |
| --- | --- | --- | --- | --- |
| Bandos / General Graardor | 11347 / 2 | 2864,5351,2876,5369 | `general graardor (6-0).json` | `2_44_83.png` |
| Saradomin / Commander Zilyana | 11602 / 0 | 2889,5258,2907,5275 | `commander zilyana.json` | `0_45_82.png` |
| Zamorak / K'ril Tsutsaroth | 11603 / 2 | 2919,5319,2936,5329 | `k'ril tsutsaroth (6-0).json` | `2_45_83.png` |
| Dagannoth Kings, regular | 11589 / 0 | 2880,4416,2943,4479 | `DAGANNOTH_KINGS_REGULAR_CAVE` | `0_45_69.png` |
| Dagannoth Kings, Slayer | 11588 / 0 | 2880,4352,2943,4415 | `DAGANNOTH_KINGS_SLAYER_CAVE` | `0_45_68.png` |
| Kalphite Queen | 13972 / 0 | 3456,9472,3519,9535 | `KALPHITE_LAIR_QUEEN_ROOM` | `0_54_148.png` |
| King Black Dragon template | 9033 / 0 | 2241,4672,2303,4722 | `NIGHTMARE_ZONE_AND_KING_BLACK_DRAGON` | `0_35_73.png` |
| Fight Caves | 9551 / 0 | 2368,5056,2431,5119 | `TZHAAR_FIGHT_CAVES` | `0_37_79.png` |
| Great Olm | 12889 / 0 | 3228,5734,3237,5746 | `olm.json` | `0_50_89.png` |
| Maiden | 12613 / 0 | 3170,4430,3186,4457 | `the maiden of sugadinti.json` | `0_49_69.png` |
| Bloat | 13125 / 0 | 3280,4445,3285,4450 | `pestilent bloat.json` | `0_51_69.png` |
| Nylocas | 13122 / 0 | 3292,4244,3299,4253 | `nylocas vasilias.json` | `0_51_66.png` |
| Sotetseg | 13123 / 0 | 3275,4312,3284,4331 | `sotetseg.json` | `0_51_67.png` |
| Xarpus | 12612 / 1 | 3165,4382,3175,4392 | `xarpus.json` | `1_49_68.png` |
| Verzik Vitur | 12611 / 0 | 3160,4305,3176,4318 | `verzik vitur.json` | `0_49_67.png` |
| Akkha | 14676 / 1 | 3671,5398,3690,5417 | `akkha (butterfly tech).json` | `1_57_84.png` |
| Ba-Ba | 15188 / 0 | 3798,5405,3818,5412 | `baba.json` | `0_59_84.png` |
| Wardens, western template | 15184 / 1 | 3803,5149,3805,5159 | `tumekens warden (advanced tactics).json` | `1_59_80.png` |
| Wardens, eastern template | 15696 / 1 | 3930,5157,3942,5165 | `tumekens warden (advanced tactics).json` | `1_61_80.png` |
| Alchemical Hydra | 5536 / 0 | 1357,10263,1377,10278 | `alchemical hydra.json` | `0_21_160.png` |
| Grotesque Guardians | 6727 / 0 | 1701,4579,1704,4582 | `grotesque guardians.json` | `0_26_71.png` |
| Abyssal Sire, southwest | 11850 / 0 | 2969,4770,2971,4780 | `abyssal sire.json`, region 11850 | `0_46_74.png` |
| Inferno | 9043 / 0 | 2260,5341,2282,5358 | `inferno.json` | `0_35_83.png` |
| Sarachnis | 7322 / 0 | 1839,9899,1844,9904 | `sarachnis.json` | `0_28_154.png` |

For example, the live
[Bandos image](https://raw.githubusercontent.com/mejrs/layers_osrs/master/mapsquares/-1/2/2_44_83.png)
and [Xarpus image](https://raw.githubusercontent.com/mejrs/layers_osrs/master/mapsquares/-1/2/1_49_68.png)
demonstrate why a blanket plane-0 default is wrong for some boss arenas.

## Deliberately unresolved destinations

Kree'arra, Nex, Corporeal Beast, individual Wilderness boss variants, and fixed
Hunllef boss rooms are not added by this module. More source evidence is needed
to distinguish specific rooms and original template floors reliably. Gauntlet
region images alone describe a collection of template rooms, not an assembled
random dungeon or a verified boss-room center.

Corporeal Beast regions 11842 and 11844 returned valid HTTP-200 PNGs at plane 0,
but each was uniform. Plane-2 images contained terrain; that is not sufficient
by itself to assert a correct in-game marker floor, so these entries remain
excluded. No missing destination was filled with a surface entrance disguised
as an arena.
