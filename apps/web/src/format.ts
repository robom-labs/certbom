// 시험 날짜·신뢰도·다음 행동을 쉬운 한국어로 바꾼다.
import { eventRelevantUntil, type Exam, type ExamEvent, type TrustLevel } from "@certbom/core";

export const trustLabels: Record<TrustLevel, string> = {
  "official-api": "공식 API",
  "official-notice": "공식 공고 확인",
  "manual-review": "일정 재확인 필요",
  unverified: "검토 중",
};

export function formatEventDate(event: ExamEvent) {
  const date = new Date(event.startAt);
  const dateText = new Intl.DateTimeFormat("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "short",
    ...(event.timePrecision === "date-only" ? {} : { hour: "numeric", minute: "2-digit" }),
    timeZone: "Asia/Seoul",
  }).format(date);
  return event.timePrecision === "conventional" ? `${dateText} · 표준 시각 기준` : dateText;
}

export function nextAction(exam: Exam, now = new Date()) {
  const event = exam.events
    .filter((item) => eventRelevantUntil(item) >= now.getTime())
    .sort((a, b) => {
      const aStart = new Date(a.startAt).getTime();
      const bStart = new Date(b.startAt).getTime();
      const aActive = aStart <= now.getTime();
      const bActive = bStart <= now.getTime();
      if (aActive !== bActive) return aActive ? -1 : 1;
      return aStart - bStart;
    })[0];
  if (event) return { label: event.title, detail: formatEventDate(event), event };
  if (exam.scheduleType === "rolling") return { label: "상시 접수 확인", detail: "원하는 시험장과 날짜를 공식 접수처에서 선택하세요." };
  if (exam.scheduleType === "announcement") return { label: "최신 공고 확인", detail: "확정 일정은 시행기관 공고가 기준이에요." };
  return { label: "다음 회차 확인", detail: "공식 API 연결 전에는 날짜를 추정하지 않아요." };
}
