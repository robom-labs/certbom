// 시험 이벤트를 사용자 공유용 ICS와 외부 캘린더 URL로 변환한다.
import type { Exam, ExamEvent } from "./model";

function toIcsDate(value: string) {
  return new Date(value).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function toKstDate(value: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Seoul",
  }).formatToParts(new Date(value));
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}${part("month")}${part("day")}`;
}

function nextDate(value: string) {
  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(4, 6)) - 1;
  const day = Number(value.slice(6, 8));
  const next = new Date(Date.UTC(year, month, day + 1));
  return next.toISOString().slice(0, 10).replaceAll("-", "");
}

function escapeIcs(value: string) {
  return value.replaceAll("\\", "\\\\").replaceAll("\n", "\\n").replaceAll(",", "\\,").replaceAll(";", "\\;");
}

export function createIcs(exam: Exam, event: ExamEvent) {
  const end = event.endAt ?? new Date(new Date(event.startAt).getTime() + 60 * 60 * 1000).toISOString();
  const dateOnly = event.timePrecision === "date-only";
  const startLine = dateOnly ? `DTSTART;VALUE=DATE:${toKstDate(event.startAt)}` : `DTSTART:${toIcsDate(event.startAt)}`;
  const endLine = dateOnly ? `DTEND;VALUE=DATE:${nextDate(toKstDate(event.startAt))}` : `DTEND:${toIcsDate(end)}`;
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//robom//CertBom//KO",
    "BEGIN:VEVENT",
    `UID:${event.id}@certbom.robom.kr`,
    `DTSTAMP:${toIcsDate(new Date().toISOString())}`,
    startLine,
    endLine,
    `SUMMARY:${escapeIcs(`${exam.name} - ${event.title}`)}`,
    `DESCRIPTION:${escapeIcs(`공식 출처에서 최신 일정을 다시 확인하세요. ${event.officialSourceUrl}`)}`,
    `URL:${event.officialSourceUrl}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

export function createGoogleCalendarUrl(exam: Exam, event: ExamEvent) {
  const end = event.endAt ?? new Date(new Date(event.startAt).getTime() + 60 * 60 * 1000).toISOString();
  const dates = event.timePrecision === "date-only"
    ? `${toKstDate(event.startAt)}/${nextDate(toKstDate(event.startAt))}`
    : `${toIcsDate(event.startAt)}/${toIcsDate(end)}`;
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: `${exam.name} - ${event.title}`,
    dates,
    details: `공식 출처에서 최신 일정을 다시 확인하세요. ${event.officialSourceUrl}`,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
