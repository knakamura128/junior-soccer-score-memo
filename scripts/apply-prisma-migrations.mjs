import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

loadEnvFile(".env.local");
loadEnvFile(".env");

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is required before running Prisma migrations.");
  process.exit(1);
}

const prismaCli = join(process.cwd(), "node_modules", "prisma", "build", "index.js");
const result = spawnSync(process.execPath, [prismaCli, "migrate", "deploy"], {
  env: process.env,
  stdio: "inherit"
});

process.exit(result.status ?? 1);

function loadEnvFile(filename) {
  const filePath = join(process.cwd(), filename);
  if (!existsSync(filePath)) {
    return;
  }

  const lines = readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = stripQuotes(trimmed.slice(separatorIndex + 1).trim());
    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function stripQuotes(value) {
  if (
    (value.startsWith("\"") && value.endsWith("\"")) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}
