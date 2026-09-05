# Dungeon entrance image coverage

All 60 dungeon destinations passed image coverage checks at native zooms 2 and 3. The check downloaded and decoded 111 unique 256 × 256 PNGs on 2026-09-04 at 22:04 EDT (`2026-09-05T02:04:24.015Z`). No requests failed, no center images were blank, and each landing neighborhood contained visible map pixels.

Coordinates come from RuneLite's [DungeonLocation.java at commit 0e25fd80d0d248cb051761671a0bb60766556643](https://github.com/runelite/runelite/blob/0e25fd80d0d248cb051761671a0bb60766556643/runelite-client/src/main/java/net/runelite/client/plugins/worldmap/DungeonLocation.java). They identify entrance/map-icon positions, including entrances within underground maps. Image coverage uses the current [Mejrs OSRS map layers](https://github.com/mejrs/layers_osrs), so later upstream image changes can change these results.

This verifies the image containing each supplied coordinate and a small neighborhood around it. It does not establish coverage of the entire viewport, all dungeon rooms, other planes, other zoom levels, walkability, collision, or current in-game access. No dungeon interiors were inferred from surface entrances.

## Method

The repeatable, read-only check is [check-map-coverage.mjs](../scripts/check-map-coverage.mjs). It uses the project's existing `sharp` dependency to decode image pixels, with six concurrent requests and a 15-second request timeout. Run it from the repository root:

```sh
node --experimental-strip-types scripts/check-map-coverage.mjs
```

For zoom `z`, each image spans `256 / 2^z` game tiles. The checked image index is `floor(x / span), floor(y / span)` on the entry's plane, under `mapsquares/-1/{z}/{plane}_{imageX}_{imageY}.png`. Zoom 2 spans one 64 × 64 region; zoom 3 is the source level selected by the app's usual scale of 12 pixels per game tile.

A pass requires successful HTTP retrieval and image decoding, exactly 256 × 256 pixels, at least 0.5% visible non-background image pixels, and at least eight quantized colors across the image. A roughly four-tile-wide patch around the landing tile center must also contain at least 5% non-background pixels. Pixels with zero alpha or all RGB channels at most 8 count as background. Color quantization uses five bits per channel. The patch is clipped at image boundaries. These pixel checks distinguish image content from an HTTP 200 response serving a blank image; they do not classify terrain or confirm an entrance's appearance.

## Results

“Pass” means the center image and landing neighborhood passed the checks above. Coordinates and regions are integer OSRS world coordinates; every listed entry uses plane 0.

| Destination | X, Y | Plane | Region | Zoom 2 | Zoom 3 |
| --- | --- | --- | --- | --- | --- |
| Abandoned Mine — entrance | 3439, 3232 | 0 | 13618 | Pass | Pass |
| Ancient Cavern — entrance | 2511, 3508 | 0 | 10038 | Pass | Pass |
| Ape Atoll Dungeon — entrance | 2762, 2703 | 0 | 11050 | Pass | Pass |
| Asgarnian Ice Dungeon — entrance | 3007, 3150 | 0 | 11825 | Pass | Pass |
| Brimhaven Dungeon — entrance 1 | 2743, 3154 | 0 | 10801 | Pass | Pass |
| Brimhaven Dungeon — entrance 2 | 2759, 3062 | 0 | 11055 | Pass | Pass |
| Catacombs of Kourend — entrance | 1636, 3673 | 0 | 6457 | Pass | Pass |
| Chasm of Fire — entrance | 1432, 3670 | 0 | 5689 | Pass | Pass |
| Corsair Cove Dungeon — entrance | 2522, 2861 | 0 | 10028 | Pass | Pass |
| Edgeville Dungeon — entrance 1 | 3096, 3469 | 0 | 12342 | Pass | Pass |
| Edgeville Dungeon — entrance 2 | 3115, 3452 | 0 | 12341 | Pass | Pass |
| Edgeville Dungeon — entrance 3 | 3087, 3571 | 0 | 12343 | Pass | Pass |
| Forthos Dungeon — entrance 1 | 1701, 3574 | 0 | 6711 | Pass | Pass |
| Forthos Dungeon — entrance 2 | 1669, 3567 | 0 | 6711 | Pass | Pass |
| Fremennik Slayer Dungeon — entrance | 2796, 3615 | 0 | 11064 | Pass | Pass |
| Giants' Den — entrance | 1419, 3588 | 0 | 5688 | Pass | Pass |
| Isle of Souls Dungeon — entrance | 2308, 2919 | 0 | 9261 | Pass | Pass |
| Iorwerth Dungeon — entrance | 3224, 6044 | 0 | 12894 | Pass | Pass |
| Kalphite Cave — entrance | 3319, 3122 | 0 | 13104 | Pass | Pass |
| Kalphite Lair — entrance | 3226, 3108 | 0 | 12848 | Pass | Pass |
| Karamja Dungeon — entrance | 2855, 3168 | 0 | 11313 | Pass | Pass |
| Karuulm Slayer Dungeon — entrance | 1308, 3807 | 0 | 5179 | Pass | Pass |
| Kraken (boss) — entrance | 2279, 10017 | 0 | 9116 | Pass | Pass |
| Kraken Cove — entrance | 2277, 3611 | 0 | 9016 | Pass | Pass |
| Lava Maze Dungeon — entrance | 3068, 3856 | 0 | 12092 | Pass | Pass |
| Lizardman Caves — entrance | 1306, 3574 | 0 | 5175 | Pass | Pass |
| Lizardman Temple — entrance 1 | 1329, 3669 | 0 | 5177 | Pass | Pass |
| Lizardman Temple — entrance 2 | 1311, 3686 | 0 | 5177 | Pass | Pass |
| Lizardman Temple — entrance 3 | 1313, 3663 | 0 | 5177 | Pass | Pass |
| Lizardman Temple — entrance 4 | 1291, 3657 | 0 | 5177 | Pass | Pass |
| Lumbridge Swamp Caves — entrance | 3168, 3172 | 0 | 12593 | Pass | Pass |
| Morytania Spider Nest — entrance | 3656, 3409 | 0 | 14645 | Pass | Pass |
| Mos Le'Harmless Cave — entrance | 3747, 2973 | 0 | 14894 | Pass | Pass |
| Myths' Guild dungeon — entrance | 2456, 2847 | 0 | 9772 | Pass | Pass |
| Ourania Cave — entrance | 2451, 3231 | 0 | 9778 | Pass | Pass |
| Revenant Caves — entrance 1 | 3124, 3832 | 0 | 12347 | Pass | Pass |
| Revenant Caves — entrance 2 | 3074, 3655 | 0 | 12345 | Pass | Pass |
| Revenant Caves — entrance 3 | 3067, 3741 | 0 | 12090 | Pass | Pass |
| Ruins of Camdozaal — entrance | 2998, 3493 | 0 | 11830 | Pass | Pass |
| Shade Catacombs — entrance | 3484, 3321 | 0 | 13875 | Pass | Pass |
| Slayer Tower basement — entrance | 3416, 3535 | 0 | 13623 | Pass | Pass |
| Smoke Devil Dungeon — entrance | 2411, 3061 | 0 | 9519 | Pass | Pass |
| Thermonuclear Smoke Devil (boss) — entrance | 2377, 9452 | 0 | 9619 | Pass | Pass |
| Smoke Dungeon — entrance | 3309, 2962 | 0 | 13102 | Pass | Pass |
| Stalker Den — entrance 1 | 1296, 3374 | 0 | 5172 | Pass | Pass |
| Stalker Den — entrance 2 | 1324, 3364 | 0 | 5172 | Pass | Pass |
| Stronghold of Security — entrance | 3080, 3420 | 0 | 12341 | Pass | Pass |
| Stronghold Slayer Dungeon — entrance | 2427, 3424 | 0 | 9525 | Pass | Pass |
| Taverley Dungeon — entrance 1 | 2883, 3397 | 0 | 11573 | Pass | Pass |
| Taverley Dungeon — entrance 2 | 2841, 3424 | 0 | 11317 | Pass | Pass |
| TzHaar City (Mor Ul Rek) — entrance | 2862, 9572 | 0 | 11413 | Pass | Pass |
| Varrock Sewers — entrance 1 | 3236, 3458 | 0 | 12854 | Pass | Pass |
| Varrock Sewers — entrance 2 | 3229, 3504 | 0 | 12854 | Pass | Pass |
| Waterbirth Dungeon — entrance | 2520, 3740 | 0 | 10042 | Pass | Pass |
| Waterbirth Dungeon (sub-levels) — entrance | 2545, 10143 | 0 | 10142 | Pass | Pass |
| Wilderness God Wars Dungeon — entrance | 3016, 3739 | 0 | 12090 | Pass | Pass |
| Wilderness Slayer Cave — entrance 1 | 3292, 3746 | 0 | 13114 | Pass | Pass |
| Wilderness Slayer Cave — entrance 2 | 3259, 3666 | 0 | 12857 | Pass | Pass |
| Wyvern Cave — entrance | 3745, 3779 | 0 | 14907 | Pass | Pass |
| Wyvern Cave (task only) — entrance | 3677, 3854 | 0 | 14652 | Pass | Pass |
