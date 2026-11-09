import { spawn } from "node:child_process";
import { restoreSourceState, saveSourceState } from "./e2e-source-state.mjs";

await saveSourceState();
const next = spawn(
  process.execPath,
  ["node_modules/next/dist/bin/next", "dev", "--hostname", "127.0.0.1", "--port", "3100"],
  { env: process.env, stdio: "inherit" },
);

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => next.kill(signal));
}

next.once("error", async (error) => {
  console.error("Could not start the Next.js E2E server.", error);
  await restoreSourceState();
  process.exitCode = 1;
});

next.once("close", async (code) => {
  await restoreSourceState();
  process.exitCode = code ?? 1;
});
