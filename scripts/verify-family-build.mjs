// 배포 디렉터리의 패밀리 JSON 계약이 source lock과 같은 hash인지 검증한다.
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const [generatedDir, lockFile, deployedDir] = process.argv.slice(2);
if (!generatedDir || !lockFile || !deployedDir) {
  throw new Error("사용법: verify-family-build.mjs <generated-dir> <lock-file> <deployed-dir>");
}

const lock = JSON.parse(await readFile(resolve(lockFile), "utf8"));
const jsonContracts = Object.entries(lock.files).filter(([name]) => name.endsWith(".json"));
if (!jsonContracts.length) throw new Error("배포할 family JSON 계약이 없습니다.");

for (const [name, expectedHash] of jsonContracts) {
  const source = await readFile(resolve(generatedDir, name));
  const deployed = await readFile(resolve(deployedDir, name));
  const sourceHash = `sha256:${createHash("sha256").update(source).digest("hex")}`;
  const deployedHash = `sha256:${createHash("sha256").update(deployed).digest("hex")}`;
  if (sourceHash !== expectedHash) throw new Error(`source family JSON hash 불일치: ${name}`);
  if (deployedHash !== expectedHash) throw new Error(`배포 family JSON hash 불일치: ${name}`);
}

console.log(`배포 family JSON ${jsonContracts.length}개 lock hash 검증 완료`);
