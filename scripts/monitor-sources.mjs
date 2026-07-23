#!/usr/bin/env node
// Read-only official-source content monitor for 로봄(ROBOM).
//
// Purpose: machine-verify when official exam sources change by recording the
// HTTP status and a SHA-256 of each official page/PDF body. This is a monitor:
// it RECORDS status and never fails the process on bot-blocks or network errors.
//
// No secrets, no API keys — public officialUrl values only.

import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..");
const REGISTRY_PATH = join(REPO_ROOT, "ops", "source-registry", "sources.json");
const OUTPUT_PATH = join(REPO_ROOT, "ops", "source-registry", "source-hashes.json");

const FETCH_TIMEOUT_MS = 15_000;
// A normal browser User-Agent reduces trivial bot-blocks; we still tolerate blocks.
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

async function checkSource(entry, checkedAt) {
  const url = entry.officialUrl;
  const result = {
    sourceId: entry.sourceId,
    url,
    httpStatus: 0,
    ok: false,
    contentLength: null,
    contentSha256: null,
    checkedAt,
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "*/*",
      },
    });
    result.httpStatus = res.status;
    result.ok = res.ok;
    const buf = Buffer.from(await res.arrayBuffer());
    result.contentLength = buf.length;
    if (res.status === 200) {
      result.contentSha256 = createHash("sha256").update(buf).digest("hex");
    }
  } catch {
    // Network error, timeout, DNS failure, bot-block reset, etc.
    // Leave the default 0 / false / null status — recording the block is the job.
  } finally {
    clearTimeout(timer);
  }
  return result;
}

async function main() {
  const registryRaw = await readFile(REGISTRY_PATH, "utf8");
  const registry = JSON.parse(registryRaw);
  const sources = Array.isArray(registry.sources) ? registry.sources : [];

  const checkedAt = process.env.MONITOR_NOW || new Date().toISOString();

  const results = [];
  for (const entry of sources) {
    // Sequential to stay gentle on the official sites.
    results.push(await checkSource(entry, checkedAt));
  }

  const output = {
    schemaVersion: 1,
    generatedAt: checkedAt,
    sources: results,
  };

  await writeFile(OUTPUT_PATH, `${JSON.stringify(output, null, 2)}\n`, "utf8");

  const ok200 = results.filter((r) => r.httpStatus === 200).length;
  const blocked = results.length - ok200;
  console.log(
    `monitor-sources: ${results.length} sources checked, ${ok200} returned 200, ${blocked} blocked/failed -> ${OUTPUT_PATH}`
  );
}

main().catch((err) => {
  // A monitor should not crash CI; surface the error but still exit 0.
  console.error("monitor-sources: unexpected error:", err);
  process.exit(0);
});
