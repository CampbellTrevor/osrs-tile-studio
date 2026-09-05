import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { createAppServer, type AppServerOptions } from "../server/app.ts";

const origin = "https://studio.example";
const submission = () => ({ requestId: randomUUID(), website: "", draft: { kind: "missing-area", area: "Doom", details: "Add the entrance room.", includeLocation: false } });
type Call = { url: string; init: RequestInit };
async function withApp(options: AppServerOptions, run: (base: string, calls: Call[]) => Promise<void>) {
  const calls: Call[] = [];
  const server = createAppServer({
    githubToken: "test-only-not-a-real-token", githubRepository: "example/feedback", publicOrigin: origin,
    fetchImpl: async (url, init) => { calls.push({ url, init }); return Response.json({ number: 123 }, { status: 201 }); },
    ...options,
  });
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.ok(address && typeof address === "object");
  try { await run(`http://127.0.0.1:${address.port}`, calls); }
  finally { server.closeAllConnections(); await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); }
}
const post = (base: string, body: unknown, headers: Record<string, string> = {}) => fetch(`${base}/api/feedback`, {
  method: "POST", headers: { Origin: origin, "Content-Type": "application/json", ...headers }, body: JSON.stringify(body),
});

test("anonymous relay creates a fixed-repository issue without forwarding private app state", async () => {
  await withApp({}, async (base, calls) => {
    const body = { ...submission(), context: { area: "private-map", x: 99, y: 88, plane: 3 }, markers: "private-markers", token: "private-input-token", repository: "other/destination" };
    const result = await post(base, body);
    assert.equal(result.status, 201);
    assert.deepEqual(await result.json(), { ok: true, reference: 123 });
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, "https://api.github.com/repos/example/feedback/issues");
    const issue = JSON.parse(String(calls[0].init.body));
    assert.match(issue.body, /^Submitted anonymously from Tile Studio\./);
    assert.match(issue.body, /Add the entrance room/);
    assert.doesNotMatch(JSON.stringify(issue), /private-|99|88|Map location|other\/destination/);
    assert.deepEqual(Object.keys(issue).sort(), ["body", "title"]);
  });
});

test("opted-in map location is formatted, and anonymous Markdown/mentions stay inert", async () => {
  await withApp({}, async (base, calls) => {
    const input = submission();
    input.draft.includeLocation = true;
    input.draft.details = "```\n@someone ![image](https://example.invalid/tracker)\n```";
    assert.equal((await post(base, { ...input, context: { area: "Lumbridge", x: 3222, y: 3218, plane: 0 } })).status, 201);
    const issue = JSON.parse(String(calls[0].init.body));
    assert.match(issue.body, /Region ID: 12850/);
    assert.match(issue.body, /````text/);
    assert.ok(issue.body.endsWith("````"));
    assert.doesNotMatch(issue.body, /@someone/);
  });
});

test("disabled configuration is explicit, with no public issue read endpoint", async () => {
  await withApp({ githubToken: undefined }, async (base, calls) => {
    assert.deepEqual(await (await fetch(`${base}/api/feedback/status`)).json(), { available: false });
    assert.equal((await post(base, submission())).status, 503);
    assert.equal((await fetch(`${base}/api/feedback`)).status, 405);
    assert.equal((await fetch(`${base}/api/issues`)).status, 404);
    assert.deepEqual(await (await fetch(`${base}/healthz`)).json(), { ok: true });
    assert.equal(calls.length, 0);
  });
});

test("relay rejects invalid origin, malformed fields, honeypots, and oversized bodies before GitHub", async () => {
  await withApp({}, async (base, calls) => {
    assert.equal((await post(base, submission(), { Origin: "https://unrelated.invalid" })).status, 403);
    assert.equal((await post(base, submission(), { "Content-Type": "text/plain" })).status, 415);
    assert.equal((await post(base, { ...submission(), website: "bot" })).status, 400);
    assert.equal((await post(base, { ...submission(), requestId: "invalid" })).status, 400);
    assert.equal((await post(base, { ...submission(), draft: { kind: "unknown" } })).status, 400);
    assert.equal((await post(base, { ...submission(), extra: "x".repeat(17000) })).status, 413);
    assert.equal(calls.length, 0);
  });
});

test("same request IDs are deduplicated, changed payloads conflict, and rate limits cap new reports", async () => {
  await withApp({ perIpLimit: 1 }, async (base, calls) => {
    const input = submission();
    assert.equal((await post(base, input)).status, 201);
    assert.equal((await post(base, input)).status, 201);
    assert.equal(calls.length, 1);
    assert.equal((await post(base, { ...input, draft: { ...input.draft, details: "Different report" } })).status, 409);
    const blocked = await post(base, submission(), { "X-Forwarded-For": "198.51.100.42" });
    assert.equal(blocked.status, 429);
    assert.equal(blocked.headers.get("Retry-After"), "600");
    assert.equal(calls.length, 1);
  });
});

test("upstream rejection and timeout never produce a false success or expose credentials", async () => {
  await withApp({ fetchImpl: async () => Response.json({ secret: "do-not-leak" }, { status: 403 }) }, async base => {
    const response = await post(base, submission());
    assert.equal(response.status, 502);
    const result = await response.json();
    assert.equal(result.ok, false);
    assert.doesNotMatch(JSON.stringify(result), /do-not-leak|test-only-not-a-real-token/);
  });
  let calls = 0;
  await withApp({ upstreamTimeoutMs: 10, fetchImpl: async () => { calls++; return new Promise<Response>(() => {}); } }, async base => {
    const input = submission();
    const response = await post(base, input);
    assert.equal(response.status, 504);
    assert.equal((await response.json()).uncertain, true);
    assert.equal((await post(base, input)).status, 504);
    assert.equal(calls, 1);
  });
});

test("static allowlist serves public assets and denies source, secrets, and API fallbacks", async () => {
  await withApp({ staticDir: fileURLToPath(new URL("../public/", import.meta.url)) }, async base => {
    const asset = await fetch(`${base}/favicon.svg`);
    assert.equal(asset.status, 200);
    assert.equal(asset.headers.get("X-Content-Type-Options"), "nosniff");
    assert.match(asset.headers.get("Content-Type") || "", /image\/svg/);
    assert.equal(await (await fetch(`${base}/favicon.svg`, { method: "HEAD" })).text(), "");
    for (const path of ["/.env.local", "/package.json", "/server/app.ts", "/assets/index.js.map", "/assets/%2e%2e%2f%2e%2e%2fpackage.json"]) {
      assert.equal((await fetch(base + path)).status, 404, path);
    }
  });
});
