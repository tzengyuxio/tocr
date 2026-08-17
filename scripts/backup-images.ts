/**
 * Mirror the Vercel Blob store into R2, uploading only what is not there yet.
 *
 * Scans are the one asset nobody can recreate -- the catalogue is transcribed
 * from them, and Vercel Blob keeps no version history, so a mistaken delete is
 * final. Blobs are write-once (the app never overwrites a pathname; it uploads
 * a new timestamped one), which is what makes "copy the ones R2 is missing" a
 * complete mirror rather than a guess.
 *
 * 用法：npx tsx --env-file=.env.local scripts/backup-images.ts
 * CI 走 .github/workflows/backup-images.yml，環境變數由 workflow 提供。
 */
import { list } from "@vercel/blob";
import { spawnSync } from "node:child_process";

const BUCKET = requireEnv("R2_BUCKET");
const ENDPOINT = `https://${requireEnv("R2_ACCOUNT_ID")}.r2.cloudflarestorage.com`;
const PREFIX = "images";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

function aws(args: string[]) {
  const result = spawnSync("aws", [...args, "--endpoint-url", ENDPOINT], {
    encoding: "utf8",
    env: { ...process.env, AWS_DEFAULT_REGION: "auto" },
  });
  if (result.status !== 0) {
    throw new Error(`aws ${args[0]} ${args[1]} failed: ${result.stderr.trim()}`);
  }
  return result.stdout;
}

/** Every blob in the store, following the cursor to the end. */
async function listBlobs() {
  const blobs: { pathname: string; url: string; size: number }[] = [];
  let cursor: string | undefined;
  do {
    const page = await list({ cursor, limit: 1000 });
    blobs.push(...page.blobs.map((b) => ({ pathname: b.pathname, url: b.url, size: b.size })));
    cursor = page.cursor;
  } while (cursor);
  return blobs;
}

/** The keys already mirrored, as blob pathnames. */
function listMirrored(): Set<string> {
  const output = aws(["s3", "ls", `s3://${BUCKET}/${PREFIX}/`, "--recursive"]);
  const keys = output
    .split("\n")
    .map((line) => line.trim().split(/\s+/).slice(3).join(" "))
    .filter(Boolean)
    .map((key) => key.slice(`${PREFIX}/`.length));
  return new Set(keys);
}

async function main() {
  const [blobs, mirrored] = [await listBlobs(), listMirrored()];
  const missing = blobs.filter((b) => !mirrored.has(b.pathname));

  const totalMb = (blobs.reduce((sum, b) => sum + b.size, 0) / 1048576).toFixed(1);
  console.log(`blob store: ${blobs.length} files, ${totalMb} MB`);
  console.log(`already mirrored: ${mirrored.size}`);
  console.log(`to copy: ${missing.length}`);

  for (const [index, blob] of missing.entries()) {
    const response = await fetch(blob.url);
    if (!response.ok) {
      throw new Error(`GET ${blob.pathname} returned ${response.status}`);
    }
    const body = Buffer.from(await response.arrayBuffer());

    // Piping through the CLI's stdin keeps the file off the runner's disk.
    const upload = spawnSync(
      "aws",
      ["s3", "cp", "-", `s3://${BUCKET}/${PREFIX}/${blob.pathname}`, "--endpoint-url", ENDPOINT],
      { input: body, env: { ...process.env, AWS_DEFAULT_REGION: "auto" }, encoding: "buffer" }
    );
    if (upload.status !== 0) {
      throw new Error(`upload of ${blob.pathname} failed: ${upload.stderr?.toString().trim()}`);
    }
    console.log(`  [${index + 1}/${missing.length}] ${blob.pathname}`);
  }

  // Deletions are deliberately not mirrored. A blob removed from the store is
  // exactly the case a backup exists for, so R2 keeps it.
  console.log(`done: ${missing.length} copied`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
