// 시험 날짜·공식 확인 상태·다음 행동을 쉬운 한국어로 바꾼다.
import { type Exam, type ExamEvent, getNextEvent, isApplicationOpen, type TrustLevel } from "@certbom/core";

export const trustLabels: Record<TrustLevel, string> = {
  "official-api": "공식 데이터 확인",
  "official-notice": "공식 일정 확인",
  "manual-review": "공식 공고 연결",
  unverified: "검토 중",
};

function formatPoint(value: string, precision: ExamEvent["timePrecision"]) {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "short",
    ...(precision === "date-only" ? {} : { hour: "numeric", minute: "2-digit" }),
    timeZone: "Asia/Seoul",
  }).format(new Date(value));
}

function formatEndPoint(event: ExamEvent) {
  if (!event.endAt) return "";
  const startDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date(event.startAt));
  const endDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date(event.endAt));
  if (startDate === endDate && event.timePrecision !== "date-only") {
    return new Intl.DateTimeFormat("ko-KR", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Seoul" }).format(new Date(event.endAt));
  }
  return formatPoint(event.endAt, event.timePrecision);
}

export function formatEventDate(event: ExamEvent) {
  const start = formatPoint(event.startAt, event.timePrecision);
  const range = event.endAt ? `${start} ~ ${formatEndPoint(event)}` : start;
  return event.timePrecision === "conventional" ? `${range} · 표준 시각 기준` : range;
}

export function examStatusLabel(exam: Exam, now = new Date()) {
  if (isApplicationOpen(exam, now)) return "지금 접수 중";
  const event = getNextEvent(exam, now);
  if (event?.type === "application-open") return "접수 예정";
  if (event?.type === "exam") return "시험 예정";
  if (event?.type === "result") return "발표 예정";
  if (exam.scheduleType === "rolling") return "상시 접수";
  if (exam.scheduleType === "announcement") return "공고 확인형";
  return "공식 일정 확인";
}

export function nextAction(exam: Exam, now = new Date()) {
  const event = getNextEvent(exam, now);
  if (event) return { label: event.title, detail: formatEventDate(event), event };
  if (exam.scheduleType === "rolling") return { label: "시험장·날짜 선택", detail: "지역별 잔여 좌석을 공식 접수처에서 바로 확인하세요." };
  if (exam.scheduleType === "announcement") return { label: "최신 시행 공고 확인", detail: "직렬과 단계별 확정 일정은 공식 공고가 기준이에요." };
  return { label: "연간 일정 다시 확인", detail: "공식 일정 페이지에서 다음 회차와 변경 공고를 확인하세요." };
}
