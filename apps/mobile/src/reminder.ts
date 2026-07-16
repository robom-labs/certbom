// 공식 시험 일정에 맞춘 로컬 알림 시각과 안내 문구를 계산한다.
import type { ExamEvent } from "@certbom/core";

export const FALLBACK_REMINDER_DELAY_MS = 60_000;
const ONE_DAY_MS = 24 * 60 * 60 * 1_000;

type ReminderEvent = Pick<ExamEvent, "startAt" | "title">;

export type ReminderPlan = {
  date: Date;
  eventTitle: string;
  isFallback: boolean;
};

export function createReminderPlan(event: ReminderEvent | undefined, now = new Date()): ReminderPlan {
  const fallback = () => ({
    date: new Date(now.getTime() + FALLBACK_REMINDER_DELAY_MS),
    eventTitle: event?.title ?? "공식 일정 확인",
    isFallback: true,
  });

  if (!event) return fallback();

  const eventTime = new Date(event.startAt).getTime();
  if (!Number.isFinite(eventTime)) return fallback();

  const preferredTime = eventTime - ONE_DAY_MS;
  if (preferredTime <= now.getTime() + FALLBACK_REMINDER_DELAY_MS) return fallback();

  return {
    date: new Date(preferredTime),
    eventTitle: event.title,
    isFallback: false,
  };
}
