import { spawn } from "node:child_process";
import { join } from "node:path";
import { buildProject, root } from "./build.mjs";
await buildProject();
const port = process.env.MALEDB_PORT || "5217";
const child = spawn(join(root, "bin/darwin-arm64/maledb"), ["--preview", `127.0.0.1:${port}`, "--ui", join(root, "ui")], { cwd: root, stdio: "inherit" });
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => child.kill(signal));
child.on("exit", (code) => process.exit(code || 0));
