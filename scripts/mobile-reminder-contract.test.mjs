// 시험 알림의 취소·재조정 흐름이 네이티브 화면에서 끊기지 않게 확인한다.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const appSource = await readFile(new URL("../apps/mobile/App.tsx", import.meta.url), "utf8");
const notificationSource = await readFile(new URL("../apps/mobile/src/notifications.ts", import.meta.url), "utf8");

test("앱 시작 때 예약을 재조정하고 화면 상태를 복원한다", () => {
  assert.match(appSource, /reconcileCertbomReminders\(exams\)/);
  assert.match(appSource, /setScheduledReminderIds/);
  assert.match(notificationSource, /getAllScheduledNotificationsAsync/);
  assert.match(notificationSource, /cancelScheduledNotificationAsync/);
});

test("관심 시험과 개별 알림의 취소 행동을 분리한다", () => {
  assert.match(appSource, /알림도 함께 취소할까요\?/);
  assert.match(appSource, /cancelCertbomRemindersForExam/);
  assert.match(appSource, /시험 상세를 열었어요\./);
  assert.match(appSource, /관심 시험에 저장했어요\./);
});
