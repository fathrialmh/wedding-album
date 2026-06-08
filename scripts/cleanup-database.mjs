import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const STORAGE_BUCKET = "wedding-photos";
const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = resolve(__dirname, "..");

function loadEnvFile(filename) {
  try {
    const content = readFileSync(resolve(ROOT_DIR, filename), "utf8");

    for (const line of content.split("\n")) {
      const trimmed = line.trim();

      if (!trimmed || trimmed.startsWith("#")) {
        continue;
      }

      const separatorIndex = trimmed.indexOf("=");

      if (separatorIndex === -1) {
        continue;
      }

      const key = trimmed.slice(0, separatorIndex).trim();
      let value = trimmed.slice(separatorIndex + 1).trim();

      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  } catch {
    // Ignore missing env files.
  }
}

loadEnvFile(".env.local");
loadEnvFile(".env");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local",
  );
  process.exit(1);
}

const supabase = createClient(url, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function listAllStoragePaths(prefix = "") {
  const { data, error } = await supabase.storage.from(STORAGE_BUCKET).list(prefix, {
    limit: 1000,
  });

  if (error) {
    throw error;
  }

  const paths = [];

  for (const item of data ?? []) {
    const itemPath = prefix ? `${prefix}/${item.name}` : item.name;

    if (item.id === null) {
      paths.push(...(await listAllStoragePaths(itemPath)));
      continue;
    }

    paths.push(itemPath);
  }

  return paths;
}

async function clearStorageBucket() {
  const paths = await listAllStoragePaths();

  if (paths.length === 0) {
    console.log("Storage: no files to delete.");
    return;
  }

  const chunkSize = 100;

  for (let index = 0; index < paths.length; index += chunkSize) {
    const chunk = paths.slice(index, index + chunkSize);
    const { error } = await supabase.storage.from(STORAGE_BUCKET).remove(chunk);

    if (error) {
      throw error;
    }
  }

  console.log(`Storage: deleted ${paths.length} file(s).`);
}

async function clearTable(tableName) {
  const { error, count } = await supabase
    .from(tableName)
    .delete({ count: "exact" })
    .neq("id", "00000000-0000-0000-0000-000000000000");

  if (error) {
    throw error;
  }

  console.log(`${tableName}: deleted ${count ?? 0} row(s).`);
}

async function main() {
  console.log("Cleaning wedding album database...");

  await clearStorageBucket();
  await clearTable("photo_likes");
  await clearTable("photos");
  await clearTable("guests");

  console.log("Database cleanup complete.");
}

main().catch((error) => {
  console.error("Database cleanup failed:", error.message ?? error);
  process.exit(1);
});
