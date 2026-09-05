# Varlamore and newer boss destination audit

Verified on 2026-09-04. This module adds 13 destinations, including Yama in Kourend. Doom's previously verified deep-delve destination stays in `lib/catalogue/doom.ts`; it is not duplicated here.

## Verification meaning

Every landing point comes from an authored NPC/object location or a Wiki RuneLite marker export. Both native zoom-2 and zoom-4 landing images returned HTTP 200 and were individually inspected: all contain the expected nonblank terrain. This verifies those landing images, not every neighboring image, walkability, every instance variant, or perpetual upstream availability. These are 2D map renders: missing NPCs and dynamic objects are expected.

Instance coordinates refer to original map templates, not live allocated instance coordinates. All coordinates below are `x, y, plane`. The antechamber and Doom entrance are plane **1**; the other entries are plane **0**. Entrances are explicitly named and are not advertised as arenas.

Quest Helper supplies the three Moon room bounds and Amoxliatl's room bounds. These four entries also expose `exportBounds` so scoped exports include the full source-defined room even across region boundaries. Other bounds are mechanically derived 64-by-64 map-region extents used for naming, not invented room outlines. `regionIds` records the landing region only, including where an authored room bound crosses a region edge.

## Coordinate evidence

| Destination | Landing | Primary evidence |
| --- | --- | --- |
| Fortis Colosseum arena | 1815, 3115, 0 | [Wiki strategy markers](https://oldschool.runescape.wiki/w/Fortis_Colosseum/Strategies): region 7216, local 23,43, plane 0; authored marker A near the northwest pillar. |
| Hueycoatl summit arena | 1512, 3289, 0 | [Wiki strategy markers](https://oldschool.runescape.wiki/w/The_Hueycoatl/Strategies): region 5939, local 40,25, plane 0. |
| Yama arena | 1502, 10086, 0 | [Wiki strategy markers](https://oldschool.runescape.wiki/w/Yama/Strategies): region 6045, local 30,38, plane 0. |
| Blood Moon arena | 1391, 9632, 0 | [Quest Helper][moons]: `fightBloodMoon` NPC location; `bloodMoonRoom` bounds. |
| Blue Moon arena | 1441, 9678, 0 | [Quest Helper][moons]: `fightBlueMoon` NPC location; `blueMoonRoom` bounds. |
| Eclipse Moon arena | 1487, 9632, 0 | [Quest Helper][moons]: `fightEclipseMoon` NPC location; `eclipseRoom` bounds. |
| Amoxliatl arena template | 1365, 4510, 0 | [Quest Helper][amox]: `defeatAmoxliatl` uses the regular `AMOXLIATL` NPC ID with quest alternatives; `bossRoom` supplies bounds. |
| Neypotzli antechamber | 1440, 9639, 1 | [Quest Helper][moons]: `talkToJessamineInNey` location beside the monolith. |
| Streambound Cavern camp | 1510, 9693, 0 | [Quest Helper][moons]: `buildStreamCamp` range object location. |
| Earthbound Cavern camp | 1374, 9710, 0 | [Quest Helper][moons]: `buildEarthCamp` range object location. |
| Doom entrance door | 1311, 9533, 1 | [Quest Helper][doom]: `MOKI_ENTRANCE_TO_DOM_BOSS` in the north of the final quest area. This is the door, not a delve arena. |
| Mastering Mixology lab | 1394, 9326, 0 | [Plugin author's AlchemyObject][mixology]: mixing-vessel location. The plugin also explicitly identifies lab region 5521, plane 0. |
| Hunter Guild Caverns entrance | 1557, 3049, 0 | [RuneLite's DungeonLocation][hunter]: `HUNTER_GUILD_CAVERNS` surface entrance pin. |

[moons]: https://github.com/Zoinkwiz/quest-helper/blob/633ab56e2eb3eb363f21da3fd75f6f2bc0fa073a/src/main/java/com/questhelper/helpers/quests/perilousmoon/PerilousMoon.java
[amox]: https://github.com/Zoinkwiz/quest-helper/blob/633ab56e2eb3eb363f21da3fd75f6f2bc0fa073a/src/main/java/com/questhelper/helpers/quests/theheartofdarkness/TheHeartOfDarkness.java
[doom]: https://github.com/Zoinkwiz/quest-helper/blob/633ab56e2eb3eb363f21da3fd75f6f2bc0fa073a/src/main/java/com/questhelper/helpers/quests/thefinaldawn/TheFinalDawn.java
[mixology]: https://github.com/hex-agon/mastering-mixology/blob/10f4ceda7fb044f006d0aecc449afcf2339acfa0/src/main/java/work/fking/masteringmixology/AlchemyObject.java
[hunter]: https://github.com/runelite/runelite/blob/ac79ed8bd8926bec7bf172aa291574b4d944b0e7/runelite-client/src/main/java/net/runelite/client/plugins/worldmap/DungeonLocation.java

## Live imagery checks

Both links in every row returned HTTP 200 and were visually inspected. Zoom 2 is 4 pixels per game tile (one 64-tile region per image); zoom 4 is 16 pixels per game tile (16 game tiles per image).

| Destination | Zoom 2 | Zoom 4 | Visible content |
| --- | --- | --- | --- |
| Colosseum | [0_28_48](https://raw.githubusercontent.com/mejrs/layers_osrs/master/mapsquares/-1/2/0_28_48.png) | [0_113_194](https://raw.githubusercontent.com/mejrs/layers_osrs/master/mapsquares/-1/4/0_113_194.png) | Sand arena, four pillars, stands. |
| Hueycoatl | [0_23_51](https://raw.githubusercontent.com/mejrs/layers_osrs/master/mapsquares/-1/2/0_23_51.png) | [0_94_205](https://raw.githubusercontent.com/mejrs/layers_osrs/master/mapsquares/-1/4/0_94_205.png) | Snowy summit enclosure and surrounding mountain. |
| Yama | [0_23_157](https://raw.githubusercontent.com/mejrs/layers_osrs/master/mapsquares/-1/2/0_23_157.png) | [0_93_630](https://raw.githubusercontent.com/mejrs/layers_osrs/master/mapsquares/-1/4/0_93_630.png) | Central dark arena surrounded by lava. |
| Blood Moon | [0_21_150](https://raw.githubusercontent.com/mejrs/layers_osrs/master/mapsquares/-1/2/0_21_150.png) | [0_86_602](https://raw.githubusercontent.com/mejrs/layers_osrs/master/mapsquares/-1/4/0_86_602.png) | Red arena floor and walls. |
| Blue Moon | [0_22_151](https://raw.githubusercontent.com/mejrs/layers_osrs/master/mapsquares/-1/2/0_22_151.png) | [0_90_604](https://raw.githubusercontent.com/mejrs/layers_osrs/master/mapsquares/-1/4/0_90_604.png) | Icy blue arena floor and walls. |
| Eclipse Moon | [0_23_150](https://raw.githubusercontent.com/mejrs/layers_osrs/master/mapsquares/-1/2/0_23_150.png) | [0_92_602](https://raw.githubusercontent.com/mejrs/layers_osrs/master/mapsquares/-1/4/0_92_602.png) | Gold-bordered arena with sun-pattern floor. |
| Amoxliatl | [0_21_70](https://raw.githubusercontent.com/mejrs/layers_osrs/master/mapsquares/-1/2/0_21_70.png) | [0_85_281](https://raw.githubusercontent.com/mejrs/layers_osrs/master/mapsquares/-1/4/0_85_281.png) | Small icy arena template with eastern approach. |
| Neypotzli hub | [1_22_150](https://raw.githubusercontent.com/mejrs/layers_osrs/master/mapsquares/-1/2/1_22_150.png) | [1_90_602](https://raw.githubusercontent.com/mejrs/layers_osrs/master/mapsquares/-1/4/1_90_602.png) | Central monolith area and four diagonal wings. |
| Streambound camp | [0_23_151](https://raw.githubusercontent.com/mejrs/layers_osrs/master/mapsquares/-1/2/0_23_151.png) | [0_94_605](https://raw.githubusercontent.com/mejrs/layers_osrs/master/mapsquares/-1/4/0_94_605.png) | Vegetated cavern and turquoise pools. |
| Earthbound camp | [0_21_151](https://raw.githubusercontent.com/mejrs/layers_osrs/master/mapsquares/-1/2/0_21_151.png) | [0_85_606](https://raw.githubusercontent.com/mejrs/layers_osrs/master/mapsquares/-1/4/0_85_606.png) | Vegetated cavern and water channels. |
| Doom entrance | [1_20_148](https://raw.githubusercontent.com/mejrs/layers_osrs/master/mapsquares/-1/2/1_20_148.png) | [1_81_595](https://raw.githubusercontent.com/mejrs/layers_osrs/master/mapsquares/-1/4/1_81_595.png) | Crypt rooms with door at the northern chamber's edge. |
| Mixology lab | [0_21_145](https://raw.githubusercontent.com/mejrs/layers_osrs/master/mapsquares/-1/2/0_21_145.png) | [0_87_582](https://raw.githubusercontent.com/mejrs/layers_osrs/master/mapsquares/-1/4/0_87_582.png) | Underground rooms and octagonal laboratory. |
| Hunter Guild cave entrance | [0_24_47](https://raw.githubusercontent.com/mejrs/layers_osrs/master/mapsquares/-1/2/0_24_47.png) | [0_97_190](https://raw.githubusercontent.com/mejrs/layers_osrs/master/mapsquares/-1/4/0_97_190.png) | Surface guild compound at the entrance pin. |

Image URL indices are computed from the authored world coordinates: `imageX = floor(x / 2^(8-zoom))`, likewise `imageY`. Region IDs are `((x >> 6) << 8) | (y >> 6)`. Wiki local markers are decoded as `x = (regionId >> 8) * 64 + regionX`, `y = (regionId & 255) * 64 + regionY`; their `z` is the map plane.

## Limits and attribution

No first-delve Doom arena is asserted here. The often-repeated `(1311,9540,0)` is south of the visible early-layout arena and was not sufficient primary evidence for an arena landing. The verified doorway is deliberately separate from the deep-delve template at `(3551,6437,0)`.

Amoxliatl is explicitly labeled as the arena template established by Quest Helper's quest/regular-NPC definition. No claim is made that live runtime instance allocations use these world coordinates. The Hunter Guild preset is a surface entrance, not an underground rumour desk.

Coordinate facts were independently transcribed into the app's own catalogue, without copying plugin implementation. Sources are OSRS Wiki strategy authors, Zoinkwiz/Quest Helper contributors, hex-agon's Mastering Mixology plugin, and RuneLite contributors. Images are served by [Mejrs layers_osrs](https://github.com/mejrs/layers_osrs); RuneScape game art belongs to Jagex. Source-code licenses do not transfer ownership of that game art.
