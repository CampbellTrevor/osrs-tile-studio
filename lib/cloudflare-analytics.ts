import type { HtmlTagDescriptor } from "vite";

/** Public beacon identifier only. Never pass a Cloudflare API or GitHub token. */
export function cloudflareAnalyticsTags(
  rawToken: string | undefined,
  productionBuild: boolean,
): HtmlTagDescriptor[] {
  if (!productionBuild) return [];
  const token = rawToken?.trim();
  if (!token) return [];
  if (!/^[a-f0-9]{32}$/i.test(token)) {
    // Do not include the value in an error: an operator may have pasted a secret.
    throw new Error("CLOUDFLARE_WEB_ANALYTICS_TOKEN must be the 32-character public Web Analytics site token, not an API token or a full script snippet.");
  }
  return [{
    tag: "script",
    attrs: {
      type: "module",
      src: "https://static.cloudflareinsights.com/beacon.min.js",
      "data-cf-beacon": JSON.stringify({ token, spa: false }),
    },
    injectTo: "body",
  }];
}
