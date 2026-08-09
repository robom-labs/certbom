// 공식 시험 일정에 맞춘 로컬 알림 시각과 안내 문구를 계산한다.
import { getNextEvent, type Exam, type ExamEvent } from "@certbom/core";

const ONE_DAY_MS = 24 * 60 * 60 * 1_000;

type ReminderEvent = Pick<ExamEvent, "startAt" | "title" | "timePrecision">;

export type ReminderScope = "next" | "critical";

export type ReminderPlan = {
  date: Date;
  daysBefore: ReminderDaysBefore;
  eventId?: string;
  eventTitle: string;
  eventType?: ExamEvent["type"];
  timePrecision: ExamEvent["timePrecision"];
};

export type ReminderDaysBefore = 1 | 3 | 7;

export function createReminderPlan(
  event: ReminderEvent | undefined,
  now = new Date(),
  daysBefore: ReminderDaysBefore = 1,
): ReminderPlan | undefined {
  if (!event) return undefined;

  const eventTime = new Date(event.startAt).getTime();
  if (!Number.isFinite(eventTime) || eventTime <= now.getTime()) return undefined;

  const preferredTime = event.timePrecision === "date-only"
    ? new Date(`${event.startAt.slice(0, 10)}T09:00:00+09:00`).getTime() - (daysBefore * ONE_DAY_MS)
    : eventTime - (daysBefore * ONE_DAY_MS);
  // 사용자가 다시 알림을 요청하지 않은 이상, 이미 지난 예약 시각을 임의의 5분 뒤로 바꾸지 않는다.
  if (preferredTime <= now.getTime()) return undefined;

  return {
    date: new Date(preferredTime),
    daysBefore,
    eventTitle: event.title,
    timePrecision: event.timePrecision,
  };
}

const CRITICAL_EVENT_TYPES = new Set<ExamEvent["type"]>([
  "application-open",
  "application-close",
  "exam",
  "result",
]);

export function createExamReminderPlans(
  exam: Exam,
  daysBefore: ReminderDaysBefore,
  scope: ReminderScope,
  now = new Date(),
) {
  const events = scope === "next"
    ? [getNextEvent(exam)].filter((event): event is ExamEvent => Boolean(event))
    : exam.events.filter((event) => CRITICAL_EVENT_TYPES.has(event.type));
  return events.flatMap((event) => {
    const plan = createReminderPlan(event, now, daysBefore);
    return plan ? [{ ...plan, eventId: event.id, eventType: event.type }] : [];
  });
}
