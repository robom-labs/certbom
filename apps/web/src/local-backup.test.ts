// 자격증봄 기기 백업이 손상·구버전 ID를 안전하게 처리하는지 검증한다.
import { describe, expect, it } from "vitest";
import { createDeviceBackup, parseDeviceBackup } from "./local-backup";

describe("기기 백업", () => {
  it("현재 시험과 준비 체크만 중복 없이 저장한다", () => {
    const backup = createDeviceBackup(
      ["history-advanced", "history-advanced", "missing"],
      ["history-advanced:history-v1:history-ticket", "missing"],
      "2026-08-08T00:00:00.000Z",
    );
    expect(backup.favoriteIds).toEqual(["history-advanced"]);
    expect(backup.checkedIds).toEqual(["history-advanced:history-v1:history-ticket"]);
  });

  it("이전 준비물 ID를 현재 안정 ID로 바꾸어 복원한다", () => {
    const restored = parseDeviceBackup(JSON.stringify({
      kind: "certbom-device-backup",
      version: 1,
      exportedAt: "2026-08-08T00:00:00.000Z",
      favoriteIds: ["information-engineer"],
      checkedIds: ["information-engineer-identity-check"],
    }));
    expect(restored.checkedIds).toEqual(["information-engineer:source-official-v1:identity"]);
  });

  it("손상되거나 다른 앱에서 만든 파일은 거부한다", () => {
    expect(() => parseDeviceBackup("{")).toThrow("JSON 백업 파일");
    expect(() => parseDeviceBackup(JSON.stringify({
      kind: "other-app",
      version: 1,
      exportedAt: "2026-08-08T00:00:00.000Z",
      favoriteIds: [],
      checkedIds: [],
    }))).toThrow("자격증봄 기기 백업 파일");
  });
});
