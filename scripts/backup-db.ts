/**
 * Automated Postgres Backup Script
 *
 * Reads DATABASE_URL from .env, runs pg_dump, saves SQL dump to
 * ../../backups/{date}-backup.sql, and retains only the last 7 backups.
 *
 * Usage: npx tsx scripts/backup-db.ts
 */

import "dotenv/config";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";

// ─── Configuration ───────────────────────────────────────────────────────────

const BACKUPS_DIR = path.resolve(process.cwd(), "..", "backups");
const MAX_BACKUPS = 7;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getTimestamp(): string {
  const now = new Date();
  return now.toISOString().replace(/[:.]/g, "-").slice(0, 19);
}

function parseDatabaseUrl(url: string): {
  user: string;
  password: string;
  host: string;
  port: string;
  database: string;
} {
  // Handles: postgresql://user:password@host:port/database?params
  const parsed = new URL(url);
  return {
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    host: parsed.hostname,
    port: parsed.port || "5432",
    database: parsed.pathname.slice(1).split("?")[0], // remove leading /
  };
}

function ensureBackupsDir(): void {
  if (!fs.existsSync(BACKUPS_DIR)) {
    fs.mkdirSync(BACKUPS_DIR, { recursive: true });
    console.log(`[backup] Created backups directory: ${BACKUPS_DIR}`);
  }
}

function pruneOldBackups(): void {
  const files = fs
    .readdirSync(BACKUPS_DIR)
    .filter((f) => f.endsWith("-backup.sql"))
    .sort()
    .reverse(); // newest first

  if (files.length <= MAX_BACKUPS) {
    console.log(
      `[backup] ${files.length} backup(s) on disk, within limit of ${MAX_BACKUPS}`
    );
    return;
  }

  const toDelete = files.slice(MAX_BACKUPS);
  for (const file of toDelete) {
    const fullPath = path.join(BACKUPS_DIR, file);
    fs.unlinkSync(fullPath);
    console.log(`[backup] Pruned old backup: ${file}`);
  }
  console.log(
    `[backup] Kept ${MAX_BACKUPS} backups, deleted ${toDelete.length}`
  );
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("[backup] ERROR: DATABASE_URL not set in .env");
    process.exit(1);
  }

  const db = parseDatabaseUrl(databaseUrl);
  const timestamp = getTimestamp();
  const filename = `${timestamp}-backup.sql`;
  const outputPath = path.join(BACKUPS_DIR, filename);

  console.log("[backup] Starting Postgres backup...");
  console.log(`[backup] Host: ${db.host}:${db.port}`);
  console.log(`[backup] Database: ${db.database}`);
  console.log(`[backup] Output: ${outputPath}`);

  ensureBackupsDir();

  try {
    // Build pg_dump command
    // PGPASSWORD is set via environment to avoid password prompts
    const env = {
      ...process.env,
      PGPASSWORD: db.password,
    };

    const cmd = [
      "pg_dump",
      `--host=${db.host}`,
      `--port=${db.port}`,
      `--username=${db.user}`,
      "--format=plain",
      "--no-owner",
      "--no-privileges",
      `--file=${outputPath}`,
      db.database,
    ].join(" ");

    execSync(cmd, {
      env,
      stdio: "pipe",
      timeout: 120_000, // 2 minute timeout
    });

    const stats = fs.statSync(outputPath);
    const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);

    console.log(`[backup] Backup complete: ${filename} (${sizeMB} MB)`);
  } catch (error) {
    console.error("[backup] ERROR: pg_dump failed.");
    if (error instanceof Error) {
      console.error("[backup]", error.message);
    }
    console.error(
      "[backup] Make sure pg_dump is installed and accessible on your PATH."
    );
    console.error(
      "[backup] On Windows, install PostgreSQL client tools or add their bin/ to PATH."
    );
    process.exit(1);
  }

  // Prune old backups
  pruneOldBackups();

  console.log("[backup] Done.");
}

main();
