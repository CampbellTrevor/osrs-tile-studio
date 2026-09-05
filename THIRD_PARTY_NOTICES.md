# Third-party notices

## Buddies location catalog

The curated coordinates and place-resolution rules in `lib/areas.ts` were adapted
from the Buddies RuneLite plugin's
`src/main/java/com/buddies/location/LocationResolver.java`.

The curated coordinate-to-place resolver was developed during Trevor Campbell's
location-display experiments in a locally modified GIMP Tracker checkout. It is
not part of upstream GIMP Tracker, and that experiment was the progenitor of
Buddies. The resolver retains applicable BSD 2-Clause source attribution.

The TypeScript adaptation preserves the original inclusive coordinate bounds,
region IDs, canonical names, and first-match resolution order. Display labels,
search categories, separate region navigation presets, and navigation points
were added for this application. Coordinate bounds describe place naming, not
walkable terrain or rendering coverage.

BSD 2-Clause License

Copyright (c) 2021, David Vorona
Copyright (c) 2026, Trevor Campbell
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

1. Redistributions of source code must retain the above copyright notice, this
   list of conditions and the following disclaimer.
2. Redistributions in binary form must reproduce the above copyright notice,
   this list of conditions and the following disclaimer in the documentation
   and/or other materials provided with the distribution.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

## RuneLite dungeon entrance coordinates

`lib/catalogue/dungeons.ts` adapts selected coordinate records from RuneLite's
`DungeonLocation.java` at commit `0e25fd80d0d248cb051761671a0bb60766556643`.
The source identifies world-map entrance icons, not dungeon interiors.

Copyright (c) 2020, Arman S <https://github.com/Rman887>
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

1. Redistributions of source code must retain the above copyright notice, this
   list of conditions and the following disclaimer.
2. Redistributions in binary form must reproduce the above copyright notice,
   this list of conditions and the following disclaimer in the documentation
   and/or other materials provided with the distribution.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

## OSRS imagery and encounter references

Game artwork belongs to Jagex. Map images are loaded from the Mejrs
`layers_osrs` project and are not bundled with Tile Studio. RuneLite's MIT
licensed website viewer inspired the approach; this app's canvas implementation
is original. Source URLs for additional factual encounter coordinates appear
beside each catalogue entry and in `docs/catalogue-*.md`.
