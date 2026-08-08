// 관심 시험과 준비 체크를 검증 가능한 기기 백업 파일로 변환한다.
import { exams, migratePreparationIds } from "@certbom/core";

const BACKUP_KIND = "certbom-device-backup";
const BACKUP_VERSION = 1;
export const MAX_BACKUP_BYTES = 512 * 1024;

export type DeviceBackup = {
  kind: typeof BACKUP_KIND;
  version: typeof BACKUP_VERSION;
  exportedAt: string;
  favoriteIds: string[];
  checkedIds: string[];
};

function uniqueStrings(values: string[]) {
  return [...new Set(values)];
}

function assertStringArray(value: unknown, field: string): string[] {
  if (!Array.isArray(value) || !value.every((item) => typeof item === "string")) {
    throw new Error(`${field} 형식이 올바르지 않습니다.`);
  }
  return value;
}

export function createDeviceBackup(favoriteIds: string[], checkedIds: string[], exportedAt = new Date().toISOString()): DeviceBackup {
  const currentExamIds = new Set(exams.map((exam) => exam.id));
  return {
    kind: BACKUP_KIND,
    version: BACKUP_VERSION,
    exportedAt,
    favoriteIds: uniqueStrings(favoriteIds).filter((id) => currentExamIds.has(id)),
    checkedIds: migratePreparationIds(uniqueStrings(checkedIds)),
  };
}

export function parseDeviceBackup(text: string): DeviceBackup {
  if (new Blob([text]).size > MAX_BACKUP_BYTES) throw new Error("백업 파일이 너무 큽니다.");
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("JSON 백업 파일을 읽을 수 없습니다.");
  }
  if (!parsed || typeof parsed !== "object") throw new Error("자격증봄 백업 파일이 아닙니다.");
  const candidate = parsed as Record<string, unknown>;
  if (candidate.kind !== BACKUP_KIND) throw new Error("자격증봄 기기 백업 파일이 아닙니다.");
  if (candidate.version !== BACKUP_VERSION) throw new Error("지원하지 않는 백업 버전입니다.");
  if (typeof candidate.exportedAt !== "string" || !Number.isFinite(Date.parse(candidate.exportedAt))) {
    throw new Error("백업 생성 시각을 확인할 수 없습니다.");
  }
  const favorites = assertStringArray(candidate.favoriteIds, "관심 시험");
  const checked = assertStringArray(candidate.checkedIds, "준비 체크");
  return createDeviceBackup(favorites, checked, candidate.exportedAt);
}
