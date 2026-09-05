import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { createReadStream } from "node:fs";
import { realpath, stat } from "node:fs/promises";
import { createHash } from "node:crypto";
import { extname, isAbsolute, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { formatFeedback, type FeedbackContext, type FeedbackDraft } from "../lib/feedback.ts";

export type AppServerOptions = {
  githubToken?: string;
  githubRepository?: string;
  publicOrigin?: string;
  staticDir?: string;
  fetchImpl?: (url: string, init: RequestInit) => Promise<Response>;
  now?: () => number;
  rateWindowMs?: number;
  perIpLimit?: number;
  globalLimit?: number;
  maxIpEntries?: number;
  dedupeTtlMs?: number;
  maxDedupeEntries?: number;
  upstreamTimeoutMs?: number;
};

type ApiResult = { status: number; body: { ok: boolean; reference?: number; error?: string; uncertain?: boolean } };
type CachedRequest = { fingerprint: string; expires: number; result: Promise<ApiResult> };
type Counter = { count: number; expires: number };

const MAX_BODY_BYTES = 16 * 1024;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const REPOSITORY = /^([a-z\d](?:[a-z\d-]{0,37}[a-z\d])?)\/([a-z\d_.-]{1,100})$/i;
const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png",
  ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".ico": "image/x-icon",
  ".woff": "font/woff", ".woff2": "font/woff2", ".ttf": "font/ttf", ".txt": "text/plain; charset=utf-8",
};

class RequestError extends Error {
  status: number;
  constructor(status: number, message: string) { super(message); this.status = status; }
}

function positive(value: number | undefined, fallback: number): number {
  if (value === undefined) return fallback;
  if (!Number.isSafeInteger(value) || value < 1) throw new Error("Server limits must be positive whole numbers.");
  return value;
}

function originFromConfig(value: string | undefined): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    if (!/^https?:$/.test(url.protocol) || url.username || url.password || url.search || url.hash || url.pathname !== "/") throw new Error();
    return url.origin;
  } catch { throw new Error("PUBLIC_ORIGIN must be an HTTP or HTTPS origin without credentials, query, or path."); }
}

function sameOrigin(request: IncomingMessage, configured: string | undefined): boolean {
  if (configured) return request.headers.origin === configured;
  // The Host header is a fallback only for loopback development, never a production trust source.
  const host = request.headers.host;
  if (!host || !/^(localhost|127\.0\.0\.1|\[::1\])(?::\d{1,5})?$/.test(host)) return false;
  try {
    const expected = new URL(`http://${host}`);
    return Number(expected.port || 80) === request.socket.localPort && request.headers.origin === expected.origin;
  } catch { return false; }
}

function json(response: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body);
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "Content-Length": Buffer.byteLength(payload) });
  response.end(payload);
}

async function readJson(request: IncomingMessage): Promise<unknown> {
  const type = request.headers["content-type"] || "";
  if (!/^application\/json(?:\s*;\s*charset=(?:utf-8|"utf-8"))?\s*$/i.test(type)) {
    throw new RequestError(415, "Send feedback as application/json.");
  }
  const length = request.headers["content-length"];
  if (length && (!/^\d+$/.test(length) || Number(length) > MAX_BODY_BYTES)) throw new RequestError(413, "Feedback exceeds the 16 KiB request limit.");
  const raw = await new Promise<Buffer>((accept, reject) => {
    let bytes = 0;
    const chunks: Buffer[] = [];
    const cleanup = () => {
      request.off("data", onData); request.off("end", onEnd); request.off("error", onError); request.off("aborted", onAborted);
    };
    const onError = () => { cleanup(); reject(new RequestError(400, "The feedback request was interrupted.")); };
    const onAborted = () => onError();
    const onData = (chunk: Buffer) => {
      bytes += chunk.length;
      if (bytes > MAX_BODY_BYTES) { cleanup(); request.resume(); reject(new RequestError(413, "Feedback exceeds the 16 KiB request limit.")); }
      else chunks.push(chunk);
    };
    const onEnd = () => { cleanup(); accept(Buffer.concat(chunks)); };
    request.on("data", onData); request.on("end", onEnd); request.on("error", onError); request.on("aborted", onAborted);
  });
  try { return JSON.parse(raw.toString("utf8")); }
  catch { throw new RequestError(400, "Feedback must be valid JSON."); }
}

function parseSubmission(value: unknown): { requestId: string; report: { title: string; body: string } } {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new RequestError(400, "Feedback must be a JSON object.");
  const input = value as Record<string, unknown>;
  if (typeof input.website !== "string" || input.website !== "") throw new RequestError(400, "Feedback could not be accepted.");
  if (typeof input.requestId !== "string" || !UUID.test(input.requestId)) throw new RequestError(400, "Feedback needs a valid request ID.");
  const draft = input.draft as FeedbackDraft;
  // Context and all extra properties are deliberately ignored when location was not opted in.
  const context = draft?.includeLocation === true ? input.context as FeedbackContext : { area: "", x: 0, y: 0, plane: 0 };
  try { return { requestId: input.requestId.toLowerCase(), report: formatFeedback(draft, context) }; }
  catch (error) { throw new RequestError(400, error instanceof Error ? error.message : "Feedback is invalid."); }
}

function plainIssue(report: { title: string; body: string }): { title: string; body: string } {
  // No user-controlled Markdown runs outside this fence. A longer fence cannot be closed by the report.
  const fence = "`".repeat(Math.max(3, ...Array.from(report.body.matchAll(/`+/g), match => match[0].length + 1)));
  const body = report.body.replace(/@/g, "@\u200b");
  const title = report.title.replace(/@/g, "\uff20").replace(/[\u0000-\u001f\u007f]/g, " ");
  return { title, body: `Submitted anonymously from Tile Studio.\n\n${fence}text\n${body}\n${fence}` };
}

function uncertain(status: number): ApiResult {
  return { status, body: { ok: false, uncertain: true, error: "Delivery could not be confirmed. Your feedback may have been received. Keep this report open and ask the site owner before sending another copy." } };
}

/** Anonymous, write-only feedback relay and a small allowlisted static-file server. */
export function createAppServer(options: AppServerOptions = {}) {
  const token = options.githubToken?.trim();
  const repository = options.githubRepository?.trim();
  const match = repository?.match(REPOSITORY);
  const available = Boolean(token && !/\s/.test(token) && match && ![".", ".."].includes(match[2]));
  const publicOrigin = originFromConfig(options.publicOrigin);
  const staticRoot = resolve(options.staticDir || fileURLToPath(new URL("../render-dist/", import.meta.url)));
  const fetchImpl = options.fetchImpl || fetch;
  const now = options.now || Date.now;
  const windowMs = positive(options.rateWindowMs, 10 * 60_000);
  const perIpLimit = positive(options.perIpLimit, 10);
  const globalLimit = positive(options.globalLimit, 50);
  const maxIps = positive(options.maxIpEntries, 1024);
  const dedupeTtl = positive(options.dedupeTtlMs, 10 * 60_000);
  const maxRequests = positive(options.maxDedupeEntries, 1000);
  const timeoutMs = positive(options.upstreamTimeoutMs, 10_000);
  const ips = new Map<string, Counter>();
  const requests = new Map<string, CachedRequest>();
  let global: Counter = { count: 0, expires: 0 };

  function prune(time: number): void {
    for (const [key, entry] of ips) if (entry.expires <= time) ips.delete(key);
    for (const [key, entry] of requests) if (entry.expires <= time) requests.delete(key);
    if (global.expires <= time) global = { count: 0, expires: time + windowMs };
  }

  function allowRequest(request: IncomingMessage, time: number): boolean {
    // Never trust client-supplied forwarding headers. Proxies may conservatively share one IP bucket.
    const ip = request.socket.remoteAddress || "unknown";
    const entry = ips.get(ip);
    if (global.count >= globalLimit || (entry?.count || 0) >= perIpLimit || (!entry && ips.size >= maxIps)) return false;
    global.count++;
    if (entry) entry.count++;
    else ips.set(ip, { count: 1, expires: time + windowMs });
    return true;
  }

  async function deliver(report: { title: string; body: string }): Promise<ApiResult> {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<ApiResult>(accept => {
      timer = setTimeout(() => { controller.abort(); accept(uncertain(504)); }, timeoutMs);
    });
    const delivery = (async (): Promise<ApiResult> => {
      try {
        const response = await fetchImpl(`https://api.github.com/repos/${repository}/issues`, {
          method: "POST", redirect: "error", signal: controller.signal,
          headers: { Accept: "application/vnd.github+json", Authorization: `Bearer ${token}`, "Content-Type": "application/json", "X-GitHub-Api-Version": "2026-03-10", "User-Agent": "OSRS-Tile-Studio-Feedback" },
          body: JSON.stringify(plainIssue(report)),
        });
        if (response.status !== 201) {
          await response.body?.cancel().catch(() => undefined);
          return { status: 502, body: { ok: false, error: "Feedback was not accepted by the inbox. Please wait 10 minutes before trying again, or contact the site owner." } };
        }
        const issue = await response.json() as { number?: unknown };
        if (!Number.isSafeInteger(issue?.number) || (issue.number as number) < 1) return uncertain(502);
        return { status: 201, body: { ok: true, reference: issue.number as number } };
      } catch { return uncertain(502); }
    })();
    try { return await Promise.race([delivery, timeout]); }
    finally { if (timer) clearTimeout(timer); }
  }

  async function serveStatic(path: string, request: IncomingMessage, response: ServerResponse): Promise<void> {
    if (request.method !== "GET" && request.method !== "HEAD") throw new RequestError(405, "Method not allowed.");
    const name = path === "/" ? "index.html" : path.slice(1);
    const parts = name.split("/");
    const extension = extname(name).toLowerCase();
    const allowed = name === "index.html" || name === "THIRD_PARTY_NOTICES.txt"
      || (parts[0] === "assets" && parts.length > 1 && Boolean(MIME[extension]) && ![".html", ".txt"].includes(extension))
      || (parts.length === 1 && [".svg", ".png", ".jpg", ".jpeg", ".webp", ".ico", ".woff", ".woff2", ".ttf"].includes(extension));
    if (!allowed || parts.some(part => !part || part.startsWith(".") || !/^[a-z\d_.-]+$/i.test(part))) throw new RequestError(404, "Not found.");
    const requested = resolve(staticRoot, ...parts);
    try {
      const [root, file] = await Promise.all([realpath(staticRoot), realpath(requested)]);
      const within = relative(root, file);
      if (!within || within === ".." || within.startsWith(`..${sep}`) || isAbsolute(within)) throw new RequestError(404, "Not found.");
      const info = await stat(file);
      if (!info.isFile()) throw new RequestError(404, "Not found.");
      const fingerprinted = /^assets\/[^/]+-[a-z\d_-]{8,}\.[a-z\d]+$/i.test(name);
      response.writeHead(200, { "Content-Type": MIME[extension], "Content-Length": info.size, "Cache-Control": fingerprinted ? "public, max-age=31536000, immutable" : "no-cache" });
      if (request.method === "HEAD") { response.end(); return; }
      const stream = createReadStream(file);
      stream.on("error", () => response.destroy());
      response.on("close", () => stream.destroy());
      stream.pipe(response);
    } catch (error) {
      if (error instanceof RequestError) throw error;
      throw new RequestError(404, "Not found.");
    }
  }

  const server = createServer({ requestTimeout: 15_000, headersTimeout: 10_000, keepAliveTimeout: 5000, maxHeaderSize: 8192 }, async (request, response) => {
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    try {
      const rawPath = (request.url || "").split("?", 1)[0];
      if (!rawPath.startsWith("/") || rawPath.startsWith("//")) throw new RequestError(400, "Invalid request path.");
      let path: string;
      try { path = decodeURIComponent(rawPath); } catch { throw new RequestError(400, "Invalid request path."); }
      if (path === "/healthz") {
        if (request.method !== "GET") throw new RequestError(405, "Method not allowed.");
        json(response, 200, { ok: true }); return;
      }
      if (path === "/api/feedback/status") {
        if (request.method !== "GET") throw new RequestError(405, "Method not allowed.");
        json(response, 200, { available }); return;
      }
      if (path === "/api/feedback") {
        if (request.method !== "POST") throw new RequestError(405, "Method not allowed.");
        if (!sameOrigin(request, publicOrigin)) throw new RequestError(403, "Feedback must be sent from this site.");
        if (!available) throw new RequestError(503, "Feedback is not configured yet. Please try again later.");
        const submission = parseSubmission(await readJson(request));
        const time = now();
        prune(time);
        const fingerprint = createHash("sha256").update(JSON.stringify(submission.report)).digest("hex");
        let entry = requests.get(submission.requestId);
        if (entry && entry.fingerprint !== fingerprint) throw new RequestError(409, "This request ID belongs to different feedback. Reopen the form before sending edited feedback.");
        if (!entry) {
          if (requests.size >= maxRequests || !allowRequest(request, time)) {
            response.setHeader("Retry-After", String(Math.ceil(windowMs / 1000)));
            throw new RequestError(429, "Too many feedback submissions. Please try again later.");
          }
          entry = { fingerprint, expires: time + dedupeTtl, result: deliver(submission.report) };
          requests.set(submission.requestId, entry);
        }
        const result = await entry.result;
        json(response, result.status, result.body); return;
      }
      if (path === "/api" || path.startsWith("/api/")) throw new RequestError(404, "Not found.");
      await serveStatic(path, request, response);
    } catch (error) {
      request.resume();
      if (response.destroyed || response.headersSent) return;
      if (error instanceof RequestError) {
        if (error.status === 413) response.setHeader("Connection", "close");
        json(response, error.status, { ok: false, error: error.message });
      } else json(response, 500, { ok: false, error: "The request could not be completed." });
    }
  });
  return server;
}
