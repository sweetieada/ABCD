import { readFile, rm, writeFile } from "node:fs/promises";

const generatedFiles = ["next-env.d.ts", "tsconfig.json"];
const backupFile = ".e2e-source-backup.json";

export async function saveSourceState() {
  const files = Object.fromEntries(
    await Promise.all(
      generatedFiles.map(async (file) => [file, await readFile(file, "utf8")]),
    ),
  );
  let agentRules;
  try {
    agentRules = await readFile("AGENTS.md", "utf8");
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  await writeFile(backupFile, JSON.stringify({ files, agentRules }));
}

export async function restoreSourceState() {
  let backup;
  try {
    backup = JSON.parse(await readFile(backupFile, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return;
    throw error;
  }

  await Promise.all(
    Object.entries(backup.files).map(async ([file, content]) => {
      await writeFile(file, content);
    }),
  );
  if (backup.agentRules === undefined) {
    await rm("AGENTS.md", { force: true });
  } else {
    await writeFile("AGENTS.md", backup.agentRules);
  }
  await rm(backupFile, { force: true });
}
