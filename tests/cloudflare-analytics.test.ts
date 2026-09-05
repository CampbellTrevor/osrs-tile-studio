import assert from "node:assert/strict";
import test from "node:test";
import { cloudflareAnalyticsTags } from "../lib/cloudflare-analytics.ts";

const publicToken = "0123456789abcdef0123456789abcdef";

test("unconfigured builds do not load analytics", () => {
  for (const value of [undefined, "", " \n "]) {
    assert.deepEqual(cloudflareAnalyticsTags(value, true), []);
  }
});

test("development and non-production builds never load analytics", () => {
  assert.deepEqual(cloudflareAnalyticsTags(publicToken, false), []);
  assert.deepEqual(cloudflareAnalyticsTags("not-a-token", false), []);
});

test("production injects one official beacon with SPA tracking disabled", () => {
  assert.deepEqual(cloudflareAnalyticsTags(` ${publicToken}\n`, true), [{
    tag: "script",
    attrs: {
      type: "module",
      src: "https://static.cloudflareinsights.com/beacon.min.js",
      "data-cf-beacon": JSON.stringify({ token: publicToken, spa: false }),
    },
    injectTo: "body",
  }]);
});

test("invalid configuration fails without exposing its value", () => {
  for (const value of ["a".repeat(31), "g".repeat(32), "a".repeat(33),
    '"/><script>alert(1)</script>', "github_pat_secret-example"]) {
    assert.throws(() => cloudflareAnalyticsTags(value, true), (error: unknown) => {
      assert.ok(error instanceof Error);
      assert.match(error.message, /public Web Analytics site token/);
      assert.ok(!error.message.includes(value));
      return true;
    });
  }
});
