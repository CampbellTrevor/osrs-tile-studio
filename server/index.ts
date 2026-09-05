import { createAppServer } from "./app.ts";

const development = process.argv.includes("--dev");
const rawPort = process.env.PORT || "10000";
if (!/^\d+$/.test(rawPort) || Number(rawPort) < 1 || Number(rawPort) > 65535) throw new Error("PORT must be a whole number from 1 to 65535.");
const port = Number(rawPort);
const host = process.env.HOST || (development ? "127.0.0.1" : "0.0.0.0");
const server = createAppServer({
  githubToken: process.env.FEEDBACK_GITHUB_TOKEN,
  githubRepository: process.env.FEEDBACK_GITHUB_REPOSITORY,
  publicOrigin: process.env.PUBLIC_ORIGIN || process.env.RENDER_EXTERNAL_URL || (development ? "http://127.0.0.1:5173" : undefined),
});

server.on("error", () => { console.error("The app server could not start."); process.exitCode = 1; });
server.listen(port, host, () => console.log(`Tile Studio is listening on port ${port}.`));
for (const signal of ["SIGTERM", "SIGINT"] as const) {
  process.once(signal, () => {
    server.close(() => { process.exitCode = 0; });
    setTimeout(() => server.closeAllConnections(), 5000).unref();
  });
}
