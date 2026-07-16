// 공식 시험 일정에 맞춘 로컬 알림 시각과 안내 문구를 계산한다.
import type { ExamEvent } from "@certbom/core";

export const FALLBACK_REMINDER_DELAY_MS = 5 * 60_000;
const ONE_DAY_MS = 24 * 60 * 60 * 1_000;

type ReminderEvent = Pick<ExamEvent, "startAt" | "title" | "timePrecision">;

export type ReminderPlan = {
  date: Date;
  eventTitle: string;
  isFallback: boolean;
  timePrecision: ExamEvent["timePrecision"];
};

export function createReminderPlan(event: ReminderEvent | undefined, now = new Date()): ReminderPlan | undefined {
  if (!event) return undefined;

  const eventTime = new Date(event.startAt).getTime();
  if (!Number.isFinite(eventTime) || eventTime <= now.getTime() + FALLBACK_REMINDER_DELAY_MS) return undefined;

  const preferredTime = event.timePrecision === "date-only"
    ? new Date(`${event.startAt.slice(0, 10)}T09:00:00+09:00`).getTime() - ONE_DAY_MS
    : eventTime - ONE_DAY_MS;
  if (preferredTime <= now.getTime() + FALLBACK_REMINDER_DELAY_MS) {
    return {
      date: new Date(now.getTime() + FALLBACK_REMINDER_DELAY_MS),
      eventTitle: event.title,
      isFallback: true,
      timePrecision: event.timePrecision,
    };
  }

  return {
    date: new Date(preferredTime),
    eventTitle: event.title,
    isFallback: false,
    timePrecision: event.timePrecision,
  };
}
