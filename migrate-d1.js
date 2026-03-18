import fs from "fs/promises";
import path from "path";
import dotenv from "dotenv";
import readline from "readline";
import {
  S3Client,
  ListObjectsV2Command,
  DeleteObjectsCommand,
} from "@aws-sdk/client-s3";

dotenv.config();

// ------------------------------------------------------------------
// Configuration
// ------------------------------------------------------------------
const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const D1_API_TOKEN = process.env.CLOUDFLARE_D1_API_TOKEN;
const KV_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const DATABASE_ID = process.env.CLOUDFLARE_D1_DATABASE_ID;
const KV_NAMESPACE = process.env.KV_NAMESPACE;

// Migrations folder
const MIGRATIONS_FOLDER = "./migrations";

// R2 configuration
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_ENDPOINT = process.env.R2_API_DOMAIN;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;

// ------------------------------------------------------------------
// Validation
// ------------------------------------------------------------------
if (!ACCOUNT_ID || !D1_API_TOKEN || !DATABASE_ID) {
  console.error("❌ Error: Missing required environment variables");
  process.exit(1);
}

const D1_API_URL = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/d1/database/${DATABASE_ID}/query`;

// ------------------------------------------------------------------
// Protected R2 images
// ------------------------------------------------------------------
const PROTECTED_R2_KEYS = [
  "rouge-technologies-ebay-image-logo.webp",
  "trade-in-your-unwanted-tech-with-rouge-technologies.webp",
  "view-more-products-from-rouge-technologies.webp",
  "view-related-products-from-rouge-technologies.webp",
];

// ------------------------------------------------------------------
// Helper: ask for confirmation
// ------------------------------------------------------------------
function askConfirmation(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === "y" || answer.toLowerCase() === "yes");
    });
  });
}

// ------------------------------------------------------------------
// D1 API wrapper
// ------------------------------------------------------------------
async function executeSQL(sql) {
  try {
    const response = await fetch(D1_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${D1_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ sql }),
    });

    const data = await response.json();
    return { success: data.success === true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ------------------------------------------------------------------
// Execute SQL from file (handles multi-statement files)
// ------------------------------------------------------------------
async function executeSQLFile(filePath) {
  try {
    const content = await fs.readFile(filePath, "utf8");

    // Skip empty files
    if (!content.trim()) {
      console.log(`   ⚠️  File ${path.basename(filePath)} is empty - skipping`);
      return true;
    }

    const statements = splitSql(content);

    console.log(
      `📄 Executing ${statements.length} statements from ${path.basename(filePath)}`,
    );

    for (let i = 0; i < statements.length; i++) {
      const sql = statements[i];
      const summary = sql.substring(0, 45).replace(/\n/g, " ") + "...";
      process.stdout.write(
        `   [${i + 1}/${statements.length}] ${summary.padEnd(50)} `,
      );

      const result = await executeSQL(sql);

      if (result.success) {
        console.log("✅");
      } else {
        console.log("❌");
        console.error("\nFAILED STATEMENT:");
        console.error("--------------------------------------------------");
        console.error(sql);
        console.error("--------------------------------------------------");
        console.error("REASON:", JSON.stringify(result.data.errors, null, 2));
        return false;
      }
    }
    return true;
  } catch (err) {
    console.error(`❌ Error reading/executing ${filePath}:`, err.message);
    return false;
  }
}

// ------------------------------------------------------------------
// Get all SQL files in order
// ------------------------------------------------------------------
// ------------------------------------------------------------------
// Get all SQL files in order
// ------------------------------------------------------------------
async function getMigrationFilesInOrder() {
  try {
    const files = await fs.readdir(MIGRATIONS_FOLDER);
    const sqlFiles = files.filter((file) => file.endsWith(".sql"));

    // Identify special files
    const wipeFile = sqlFiles.find(
      (f) => f.includes("wipe") || f === "03_wipe.sql",
    );
    const schemaFiles = sqlFiles.filter((f) => f.startsWith("01_")).sort();
    const mainSeedFile = sqlFiles.find(
      (f) => f === "02_seed_data.sql" || f === "02a_seed_data.sql",
    );
    const contentChunks = sqlFiles
      .filter(
        (f) =>
          f.startsWith("02b_seed_category_content_") ||
          f.startsWith("02_seed_category_content_"),
      )
      .sort((a, b) => {
        // Sort chunk files numerically
        const aNum = parseInt(a.match(/\d+/)?.[0] || "0");
        const bNum = parseInt(b.match(/\d+/)?.[0] || "0");
        return aNum - bNum;
      });
    const otherFiles = sqlFiles
      .filter(
        (f) =>
          f !== wipeFile &&
          !schemaFiles.includes(f) &&
          f !== mainSeedFile &&
          !contentChunks.includes(f) &&
          !f.includes("wipe"),
      )
      .sort((a, b) => {
        const aNum = parseInt(a.match(/^(\d+)/)?.[1] || "999");
        const bNum = parseInt(b.match(/^(\d+)/)?.[1] || "999");
        return aNum - bNum;
      });

    // Build ordered list: wipe → schema → main seed → content chunks → other files
    const orderedFiles = [];
    if (wipeFile) orderedFiles.push(wipeFile);
    orderedFiles.push(...schemaFiles);
    if (mainSeedFile) orderedFiles.push(mainSeedFile);
    orderedFiles.push(...contentChunks);
    orderedFiles.push(...otherFiles);

    return orderedFiles.map((file) => path.join(MIGRATIONS_FOLDER, file));
  } catch (error) {
    console.error("❌ Error reading migrations folder:", error.message);
    return [];
  }
}

// ------------------------------------------------------------------
// KV Cleanup Functions
// ------------------------------------------------------------------
async function listAllKVKeys() {
  if (!KV_NAMESPACE || !KV_API_TOKEN) return [];

  let allKeys = [];
  let cursor = null;
  let page = 1;

  try {
    do {
      let url = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/storage/kv/namespaces/${KV_NAMESPACE}/keys?per_page=1000`;
      if (cursor) {
        url += `&cursor=${encodeURIComponent(cursor)}`;
      }

      process.stdout.write(`   📋 Fetching KV keys page ${page}... `);

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${KV_API_TOKEN}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        console.log("❌");
        return [];
      }

      const data = await response.json();

      if (!data.success) {
        console.log("❌");
        return [];
      }

      if (data.result && Array.isArray(data.result)) {
        const pageKeys = data.result.map((item) => item.name);
        allKeys = allKeys.concat(pageKeys);
        console.log(`found ${pageKeys.length} keys (total: ${allKeys.length})`);
      } else {
        console.log(`found 0 keys`);
      }

      cursor = data.result_info?.cursor || null;
      page++;
    } while (cursor);

    return allKeys;
  } catch (error) {
    console.error("\n❌ Failed to list KV keys:", error.message);
    return [];
  }
}

async function deleteKVKey(key) {
  if (!KV_NAMESPACE || !KV_API_TOKEN) return false;

  try {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/storage/kv/namespaces/${KV_NAMESPACE}/values/${encodeURIComponent(key)}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${KV_API_TOKEN}`,
        },
      },
    );
    return response.ok;
  } catch (error) {
    return false;
  }
}

async function deleteAllKVData() {
  if (!KV_NAMESPACE || !KV_API_TOKEN) {
    console.log("   ⚠️ KV not configured - skipping");
    return { success: false, skipped: true };
  }

  console.log("\n🗑️  Starting KV data cleanup...");
  const keys = await listAllKVKeys();

  if (keys.length === 0) {
    console.log("   ℹ️ No KV keys to delete");
    return { success: true, deletedCount: 0 };
  }

  console.log(`   📊 Total keys found: ${keys.length}`);

  const confirmKV = await askConfirmation(
    `   ⚠️  This will delete ${keys.length} KV keys. Continue? (y/N) `,
  );

  if (!confirmKV) {
    console.log("   ⛔ KV cleanup skipped by user");
    return { success: false, skipped: true };
  }

  console.log(`   🧹 Deleting ${keys.length} KV keys...`);

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < keys.length; i++) {
    const deleted = await deleteKVKey(keys[i]);
    if (deleted) {
      successCount++;
    } else {
      failCount++;
    }

    if ((i + 1) % 10 === 0 || i === keys.length - 1) {
      process.stdout.write(
        `      Progress: ${i + 1}/${keys.length} (${Math.round(((i + 1) / keys.length) * 100)}%)\r`,
      );
    }
  }

  console.log(`\n   ✅ Deleted ${successCount} keys successfully`);
  if (failCount > 0) {
    console.log(`   ⚠️ Failed to delete ${failCount} keys`);
  }

  return { success: true, deletedCount: successCount, failedCount: failCount };
}

// ------------------------------------------------------------------
// R2 Cleanup Functions
// ------------------------------------------------------------------
function createR2Client() {
  return new S3Client({
    region: "auto",
    endpoint: R2_ENDPOINT,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
  });
}

async function listAllR2Objects() {
  const client = createR2Client();
  let allKeys = [];
  let continuationToken = undefined;

  try {
    do {
      const command = new ListObjectsV2Command({
        Bucket: R2_BUCKET_NAME,
        ContinuationToken: continuationToken,
        MaxKeys: 1000,
      });

      const response = await client.send(command);

      if (response.Contents) {
        allKeys = allKeys.concat(response.Contents.map((obj) => obj.Key));
      }

      continuationToken = response.NextContinuationToken;
    } while (continuationToken);

    return allKeys;
  } catch (error) {
    console.error("❌ Failed to list R2 objects:", error.message);
    return [];
  }
}

async function deleteR2Objects(keys) {
  if (keys.length === 0) return { deleted: 0, failed: 0 };

  const client = createR2Client();
  const batchSize = 1000;
  let deleted = 0;
  let failed = 0;

  for (let i = 0; i < keys.length; i += batchSize) {
    const batch = keys.slice(i, i + batchSize);
    try {
      const command = new DeleteObjectsCommand({
        Bucket: R2_BUCKET_NAME,
        Delete: {
          Objects: batch.map((Key) => ({ Key })),
          Quiet: false,
        },
      });

      const response = await client.send(command);

      if (response.Deleted) {
        deleted += response.Deleted.length;
      }
      if (response.Errors) {
        failed += response.Errors.length;
      }
    } catch (error) {
      failed += batch.length;
    }

    process.stdout.write(
      `      Progress: ${Math.min(i + batchSize, keys.length)}/${keys.length} (${Math.round((Math.min(i + batchSize, keys.length) / keys.length) * 100)}%)\r`,
    );
  }

  return { deleted, failed };
}

async function deleteAllR2Data() {
  if (
    !R2_ACCESS_KEY_ID ||
    !R2_SECRET_ACCESS_KEY ||
    !R2_ENDPOINT ||
    !R2_BUCKET_NAME
  ) {
    console.log("   ⚠️ R2 not configured - skipping");
    return { success: false, skipped: true };
  }

  console.log("\n🗄️  Starting R2 data cleanup...");
  const allKeys = await listAllR2Objects();
  console.log(`   📋 Found ${allKeys.length} objects`);

  if (allKeys.length === 0) {
    console.log("   ℹ️ No R2 objects to delete");
    return { success: true, deletedCount: 0 };
  }

  const deletableKeys = allKeys.filter(
    (key) => !PROTECTED_R2_KEYS.includes(key),
  );
  const protectedKeys = allKeys.filter((key) =>
    PROTECTED_R2_KEYS.includes(key),
  );

  console.log(
    `   📊 Deletable: ${deletableKeys.length}, Protected: ${protectedKeys.length}`,
  );

  if (deletableKeys.length === 0) {
    console.log("   ✅ No deletable objects found");
    return { success: true, deletedCount: 0 };
  }

  const confirmR2 = await askConfirmation(
    `   ⚠️  Delete ${deletableKeys.length} R2 objects? (y/N) `,
  );

  if (!confirmR2) {
    console.log("   ⛔ R2 cleanup skipped by user");
    return { success: false, skipped: true };
  }

  console.log(`   🧹 Deleting ${deletableKeys.length} objects...`);
  const { deleted, failed } = await deleteR2Objects(deletableKeys);

  console.log(`\n   ✅ Deleted ${deleted} objects`);
  if (failed > 0) {
    console.log(`   ⚠️ Failed to delete ${failed} objects`);
  }

  return { success: true, deletedCount: deleted, failedCount: failed };
}

// ------------------------------------------------------------------
// Intelligent SQL Splitter
// ------------------------------------------------------------------
function splitSql(sql) {
  const cleanSql = sql.replace(/\u00A0/g, " ").replace(/\r\n/g, "\n");
  const statements = [];
  let current = "";
  let inTrigger = false;

  const lines = cleanSql.split("\n");

  for (let line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("--")) continue;

    if (/\bBEGIN\b/i.test(trimmed)) {
      inTrigger = true;
    }

    current += (inTrigger ? " " : "\n") + trimmed;

    if (/\bEND\s*;\s*$/i.test(trimmed)) {
      inTrigger = false;
      statements.push(current.trim());
      current = "";
      continue;
    }

    if (!inTrigger && trimmed.endsWith(";")) {
      statements.push(current.trim());
      current = "";
    }
  }

  if (current.trim()) statements.push(current.trim());
  return statements;
}

// ------------------------------------------------------------------
// Main execution
// ------------------------------------------------------------------
async function main() {
  console.log("🚀 Starting Database, KV, and R2 Refresh...");
  console.log(`Target DB: ${DATABASE_ID}`);
  console.log(`Migrations folder: ${MIGRATIONS_FOLDER}`);
  console.log("");

  // Test connection
  process.stdout.write("Checking D1 API connection... ");
  const test = await executeSQL("SELECT 1");
  if (!test.success) {
    console.log("❌");
    console.error("Connection failed!");
    process.exit(1);
  }
  console.log("✅");

  // Confirm wipe
  const confirmed = await askConfirmation(
    "\n⚠️  WARNING: This will DELETE ALL EXISTING DATA, TABLES, KV DATA, AND MOST R2 OBJECTS. Are you sure? (y/N) ",
  );
  if (!confirmed) {
    console.log("❌ Operation cancelled.");
    process.exit(0);
  }

  // R2 Cleanup
  if (R2_BUCKET_NAME && R2_ACCESS_KEY_ID) {
    await deleteAllR2Data();
  }

  // KV Cleanup
  if (KV_NAMESPACE && KV_API_TOKEN) {
    await deleteAllKVData();
  }

  // Get all migration files in order
  const migrationFiles = await getMigrationFilesInOrder();

  if (migrationFiles.length === 0) {
    console.error("❌ No SQL files found in migrations folder");
    process.exit(1);
  }

  console.log(`\n📋 Found ${migrationFiles.length} SQL files to execute:`);
  migrationFiles.forEach((file, index) => {
    console.log(`   ${index + 1}. ${path.basename(file)}`);
  });
  console.log("");

  // Execute each migration file
  for (let i = 0; i < migrationFiles.length; i++) {
    const file = migrationFiles[i];
    console.log(
      `\n📂 [${i + 1}/${migrationFiles.length}] Processing ${path.basename(file)}...`,
    );

    const success = await executeSQLFile(file);
    if (!success) {
      console.error(`❌ Failed to execute ${path.basename(file)}`);
      process.exit(1);
    }
  }

  // Final verification
  console.log("\n🔍 Verifying setup...");
  const verify = await executeSQL(
    "SELECT 'Conditions' as table_name, COUNT(*) as count FROM conditions UNION ALL SELECT 'Categories', COUNT(*) FROM categories UNION ALL SELECT 'Category Content', COUNT(*) FROM category_content;",
  );

  if (verify.success && verify.data.result[0]?.results) {
    console.log("\n📊 Final counts:");
    verify.data.result[0].results.forEach((row) => {
      console.log(`   ${row.table_name}: ${row.count}`);
    });
  }

  console.log("\n==========================================");
  console.log("🎉 DATABASE, KV, AND R2 SETUP SUCCESSFULLY COMPLETED!");
  console.log("==========================================\n");
}

main();
