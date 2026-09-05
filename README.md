# Tile Studio

**[Open Tile Studio](https://osrs-tile-studio.onrender.com/)**

A browser editor for Old School RuneScape tile markers. Explore a top-down map,
plan a layout, and export it to RuneLite.

- Search 212 area destinations: 114 original Buddies presets, 38 sourced boss,
  raid, and activity locations, and 60 RuneLite dungeon entrances. Search names,
  familiar abbreviations, or region IDs, or jump to exact world coordinates.
- Paint tiles, draw lines and rectangle outlines, erase, and inspect markers.
  Set colors and labels; undo or redo edits.
- Pan, zoom, toggle the tile grid, and switch between planes 0–3.
- Import a RuneLite profile `.properties` file to load saved markers from every
  region, or import Ground Markers JSON. Merge or replace a layout and copy or
  download a compatible export. Files are parsed locally; unrelated profile
  settings are discarded.
- Browse **Your markers** by region and plane; search locations, region IDs, or
  marker labels and jump directly to each group.
- Export the current boss/area, visible map only, or all markers. The dialog
  shows the exact scope and count before copying or downloading. Verified arena
  boundaries are used where available; otherwise current-area export covers the
  mapped region(s) on the selected plane. Visible-map export can narrow a room.
- Save a draft automatically in the current browser. Share the exported JSON
  with other players, who can import and edit their own copies.
- Send anonymous feedback without a GitHub login or email address. The server
  creates an issue in the configured GitHub repository on the visitor's behalf.

## Run locally

Use Node.js 22.13 or later within the Node 22 release line.

```sh
npm ci
npm run dev
```

Open [http://127.0.0.1:5173](http://127.0.0.1:5173), or the URL printed by the
development server if that port is busy.

```sh
npm test
npm run build
npm start
```

The build writes `render-dist/`. `npm start` serves it and the feedback API at
the URL printed in the terminal (port 10000 by default).

For feedback during development, also run `npm run dev:api` in another terminal.
Vite forwards `/api` to that server. Copy `.env.example` to `.env.local` and fill
in the server-only feedback settings; both start scripts load that file when
present. The API defaults to the Vite origin `http://127.0.0.1:5173` in dev mode.
If Vite uses another origin, set `PUBLIC_ORIGIN` to match and restart the API.
Never commit `.env.local` or put the GitHub token in a `VITE_`/`NEXT_PUBLIC_` variable.

## Deploy on Render

Push this project to a GitHub repository. In Render, choose **New → Web Service**,
connect the repository, choose Node, and use these settings:

| Setting | Value |
| --- | --- |
| Build command | `npm ci && npm run build` |
| Start command | `npm start` |
| Health check | `/healthz` |
| Plan | Free for initial testing |

The included [render.yaml](render.yaml) provides the equivalent Blueprint
configuration. Anonymous GitHub feedback requires a server, so this is now a
Node web service rather than a static-only deployment. No database is required.
GitHub holds accepted feedback; do not use local files as a feedback inbox.

Render's free web service sleeps after 15 minutes idle and can take about a
minute to wake. An always-on paid plan avoids that delay; do not upgrade without
approving the cost. See [Render's free-plan limits](https://render.com/docs/free).

### Connect anonymous GitHub feedback

1. Enable Issues on the destination repository. It can remain private: visitors
   receive a report number, not a link requiring GitHub access.
2. Create a [fine-grained GitHub token](https://github.com/settings/personal-access-tokens/new)
   restricted to that repository with **Issues: read and write**. Choose an
   expiration and rotate it before expiry. Do not reuse a broad CLI login token.
3. In the Render service's Environment page, set `FEEDBACK_GITHUB_REPOSITORY`
   to `owner/repo` and store the token as `FEEDBACK_GITHUB_TOKEN`.
   Keep this value private; never paste it into the frontend, repository, or chat.
4. The allowed origin defaults to Render's assigned site URL. For a custom
   domain, set `PUBLIC_ORIGIN` to that exact HTTPS origin and redeploy.

Issues are authored by the token's account, not the visitor. A dedicated account
can be used for that purpose; a GitHub App would be a future alternative.
Only the text entered in the form and optionally its displayed map location are
submitted. Profiles, tile markers, layout names, cookies, and account details
are not attached. Avoid entering personal information in feedback. Repository
visibility controls who can see accepted reports.

The relay validates input and origin, limits request sizes, uses a honeypot,
and applies bounded process-local rate limits and duplicate-request protection.
Those limits reset when the service restarts and are not a distributed abuse
control. There is no automatic retry of GitHub issue creation after a timeout.
The form confirms success only after GitHub accepts an issue; errors keep its
text available for copying. An unconfigured service clearly disables sending.

The editor can still be hosted as static files using `render-dist/`, but feedback
will be unavailable without routing `/api` to the relay. `npm run preview:static`
previews that editor-only setup.

After Render provides an HTTPS address, share that app address with other
players. They can import the JSON files you export. A link beginning with
`localhost` or `127.0.0.1` points to the viewer's own device and cannot share
your local app.
Existing local drafts do not automatically move to the deployed site's browser
storage; export and import their JSON to transfer them.

The app does not provide live collaborative sessions. Browser drafts are local
to that browser and site address; use **Export → All markers** for a complete
backup before clearing browser data. Older snapshot links remain importable,
but the duplicate Share button has been removed.

### Page views with Cloudflare Web Analytics

Analytics is optional and disabled until configured. The app stays on Render;
there is no need to connect GitHub to Cloudflare, move hosting, or change DNS.

1. In [Cloudflare Web Analytics](https://dash.cloudflare.com/?to=/:account/web-analytics),
   choose **Add a site** and enter `osrs-tile-studio.onrender.com` (or your actual
   public hostname). Open **Manage site** to get its JavaScript snippet.
2. Copy only the `token` value from `data-cf-beacon`: the 32-character public
   site identifier, not a Cloudflare API token or GitHub PAT.
3. Add `CLOUDFLARE_WEB_ANALYTICS_TOKEN` in the Render service's Environment
   settings, then save and rebuild/redeploy. It is read at build time, so a
   restart without a new build does not change it.
4. Visit the public app and check that site's Web Analytics dashboard after a
   few minutes. Counts begin after activation; earlier traffic is not recovered.

The production build adds one official Cloudflare beacon. Development mode does
not load it. SPA navigation measurement is disabled, so editing tiles, panning,
or switching areas does not create extra page views. No custom events, marker
data, imported profile contents, or feedback text are sent by the integration.
Cloudflare collects page-load/performance data; its beacon does not use cookies
or browser storage. Ad blockers and disabled JavaScript can prevent counting.
See the official [setup guide](https://developers.cloudflare.com/web-analytics/get-started/),
[SPA settings](https://developers.cloudflare.com/web-analytics/get-started/web-analytics-spa/),
and [data collection documentation](https://developers.cloudflare.com/speed/observatory/rum-beacon/).
To disable analytics, remove the variable and rebuild/redeploy.

## Coordinates and map coverage

To get all markers from a profile, use RuneLite **Configuration → Profiles →
Export profile**, then choose that `.properties` file under **Import**. Local
Windows profiles are usually in `%USERPROFILE%\.runelite\profiles2`. This
supports the real `groundMarker.region_*` keys, Java property escaping and line
continuations, and legacy marker colors. A world-map globe JSON export contains
nearby regions; it does not necessarily contain your whole profile. Imports are
limited to 10 MB and 20,000 markers and fail clearly rather than dropping tiles.

Map images load from [Mejrs' OSRS map layers](https://github.com/mejrs/layers_osrs).
This external imagery can lag game updates, load slowly, or return missing-image
responses for some regions. The tile grid and coordinates remain available when
imagery is missing. This is a top-down planning view, not a 3D game renderer.

Planes 0–3 are height levels. Dungeons often use their own X/Y coordinates;
changing the plane alone does not navigate underground. Instanced encounter
markers use the original template's coordinates and plane, which can differ
from the runtime instance location. Use the matching area and plane in RuneLite.
Catalog bounds identify named places; they do not describe collision or
walkability.

## Credits and project structure

The [RuneLite tile viewer](https://runelite.net/tile) inspired this editor.
RuneLite's website and viewer are open source under the
[MIT license](https://github.com/runelite/runelite.net/blob/master/LICENSE).
Tile Studio uses an original canvas editor; no viewer source was copied.

The place catalog is adapted from Buddies. Its BSD-2-Clause attribution and full
license are preserved in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
Old School RuneScape belongs to Jagex. This is an independent fan tool and is not
affiliated with Jagex or RuneLite.

`components/` contains the editor and canvas; `lib/` contains marker conversion,
map math, and area data. `server/` serves the built editor and relays anonymous
feedback to GitHub. An optional Sites starter path remains available through `dev:sites` and
`build:sites`; its backend and database examples are excluded from the default
Render bundle.
