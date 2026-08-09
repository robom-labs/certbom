// 시험 알림의 취소·재조정 흐름이 네이티브 화면에서 끊기지 않게 확인한다.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const appSource = await readFile(new URL("../apps/mobile/App.tsx", import.meta.url), "utf8");
const notificationSource = await readFile(new URL("../apps/mobile/src/notifications.ts", import.meta.url), "utf8");

test("앱 시작 때 사용자별 알림 시점으로 예약을 재조정하고 화면 상태를 복원한다", () => {
  assert.match(appSource, /reconcileCertbomReminders\(exams, validPreferences\)/);
  assert.match(appSource, /loadReminderExamIds/);
  assert.match(appSource, /loadReminderPreferences/);
  assert.match(appSource, /saveReminderExamIds/);
  assert.match(appSource, /saveReminderPreferences/);
  assert.match(appSource, /setScheduledIds/);
  assert.match(notificationSource, /getAllScheduledNotificationsAsync/);
  assert.match(notificationSource, /cancelScheduledNotificationAsync/);
});

test("관심 시험·개별 알림·준비 체크를 서로 분리해 저장한다", () => {
  assert.match(appSource, /loadFavoriteExamIds/);
  assert.match(appSource, /loadPreparationCheckedIds/);
  assert.match(appSource, /savePreparationCheckedIds/);
  assert.match(appSource, /cancelCertbomRemindersForExam/);
  assert.match(appSource, /\(\[7, 3, 1\] as const\)/);
  assert.match(appSource, /Google 캘린더에 추가/);
});
