// 관심 시험의 필기·실기 일정이 같은 날 겹치는 후보를 안전하게 묶는다.
import { eventRelevantUntil } from "./catalog";
import type { Exam, ExamEvent } from "./model";

export type SameDayExamGroup = {
  date: string;
  entries: Array<{ exam: Exam; event: ExamEvent }>;
};

function kstDate(value: string) {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Seoul",
  }).format(new Date(value));
}

export function getSameDayExamGroups(exams: readonly Exam[], now = new Date()): SameDayExamGroup[] {
  const byDate = new Map<string, Array<{ exam: Exam; event: ExamEvent }>>();

  for (const exam of exams) {
    for (const event of exam.events) {
      if (event.type !== "exam" || eventRelevantUntil(event) < now.getTime()) continue;
      const date = kstDate(event.startAt);
      const entries = byDate.get(date) ?? [];
      entries.push({ exam, event });
      byDate.set(date, entries);
    }
  }

  return [...byDate.entries()]
    .map(([date, entries]) => ({
      date,
      entries: entries
        .filter((entry, index, all) => all.findIndex((candidate) => candidate.exam.id === entry.exam.id) === index)
        .sort((left, right) => left.exam.name.localeCompare(right.exam.name, "ko")),
    }))
    .filter((group) => group.entries.length >= 2)
    .sort((left, right) => left.date.localeCompare(right.date));
}
