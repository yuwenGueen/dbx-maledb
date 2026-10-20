import { build } from "vite";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";

export const root = fileURLToPath(new URL("..", import.meta.url));
export async function buildUI() {
  const result = await build({ configFile: false, root, logLevel: "error", build: { write: false, minify: true, lib: { entry: join(root, "src/app.js"), formats: ["iife"], name: "MaLeDB" } } });
  const output = (Array.isArray(result) ? result[0] : result).output;
  const code = output
    .filter((o) => o.type === "chunk")
    .map((o) => o.code)
    .join("\n")
    .replace(/<\/script/gi, "<\\/script");
  const hero = await readFile(join(root, "assets/home-hero.png"));
  const style = (await readFile(join(root, "src/style.css"), "utf8")).replace("__HOME_HERO__", "data:image/png;base64," + hero.toString("base64"));
  const source = await readFile(join(root, "src/index.html"), "utf8");
  const html = source.replace("<!--APP_STYLE-->", "<style>" + style + "</style>").replace("<!--APP_SCRIPT-->", "<script>" + code + "</script>");
  await mkdir(join(root, "ui"), { recursive: true });
  await writeFile(join(root, "ui/index.html"), html);
  console.log(`UI built: ${(Buffer.byteLength(html) / 1024 / 1024).toFixed(2)} MiB, all assets inline`);
}
export async function buildNative() {
  if (process.platform !== "darwin" || process.arch !== "arm64") throw Error("This development package currently targets macOS Apple Silicon (darwin-arm64).");
  const out = join(root, "bin/darwin-arm64/maledb");
  await mkdir(dirname(out), { recursive: true });
  const result = spawnSync("go", ["build", "-trimpath", "-ldflags=-s -w", "-o", out, "."], { cwd: join(root, "backend"), stdio: "inherit", env: { ...process.env, GOCACHE: join(tmpdir(), "maledb-go-cache"), CGO_ENABLED: "1" } });
  if (result.status !== 0) throw result.error || Error("Native scorer build failed");
  console.log("Native scorer built: darwin-arm64");
}
export async function buildProject() {
  await buildUI();
  await buildNative();
}
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) await buildProject();
