// 공식 시험 일정에 맞춘 로컬 알림 시각과 안내 문구를 계산한다.
import type { ExamEvent } from "@certbom/core";

const ONE_DAY_MS = 24 * 60 * 60 * 1_000;

type ReminderEvent = Pick<ExamEvent, "startAt" | "title" | "timePrecision">;

export type ReminderPlan = {
  date: Date;
  eventTitle: string;
  timePrecision: ExamEvent["timePrecision"];
};

export function createReminderPlan(event: ReminderEvent | undefined, now = new Date()): ReminderPlan | undefined {
  if (!event) return undefined;

  const eventTime = new Date(event.startAt).getTime();
  if (!Number.isFinite(eventTime) || eventTime <= now.getTime()) return undefined;

  const preferredTime = event.timePrecision === "date-only"
    ? new Date(`${event.startAt.slice(0, 10)}T09:00:00+09:00`).getTime() - ONE_DAY_MS
    : eventTime - ONE_DAY_MS;
  // 사용자가 다시 알림을 요청하지 않은 이상, 이미 지난 "하루 전" 시각을 임의의 5분 뒤로 바꾸지 않는다.
  if (preferredTime <= now.getTime()) return undefined;

  return {
    date: new Date(preferredTime),
    eventTitle: event.title,
    timePrecision: event.timePrecision,
  };
}
