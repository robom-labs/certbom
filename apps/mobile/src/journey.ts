// 관심 시험의 현재 단계와 다음 준비 행동을 사용자에게 쉬운 문구로 정리한다.
import { eventRelevantUntil, getNextEventFromEvents, type Exam, type ExamEvent } from "@certbom/core";
import type { ExamJourneyStage, PersonalPreparationTask } from "./storage";

export const journeyStages: { id: ExamJourneyStage; label: string }[] = [
  { id: "watching", label: "관심" },
  { id: "applied", label: "접수 완료" },
  { id: "took", label: "응시 완료" },
  { id: "result", label: "결과 확인" },
];

export function journeyStageLabel(stage: ExamJourneyStage) {
  return journeyStages.find((item) => item.id === stage)?.label ?? "관심";
}

export function journeyNextAction(
  exam: Exam,
  stage: ExamJourneyStage,
  requiredIncomplete: number,
  tasks: readonly PersonalPreparationTask[],
  events: readonly ExamEvent[] = exam.events,
) {
  const personalIncomplete = tasks.filter((task) => !task.completed).length;
  if (stage === "result") return "결과 확인을 마쳤어요";
  if (stage === "took") return "합격자 발표 일정 확인";
  if (stage === "applied") {
    if (requiredIncomplete > 0) return `필수 준비물 ${requiredIncomplete}개 확인`;
    if (personalIncomplete > 0) return `내 준비 할 일 ${personalIncomplete}개 마무리`;
    return "시험장·입실 시각 최종 확인";
  }
  const now = new Date();
  const applicationOpen = events.some((event) => event.type === "application-open"
    && new Date(event.startAt).getTime() <= now.getTime()
    && eventRelevantUntil(event) >= now.getTime());
  if (applicationOpen) return "공식 접수처에서 원서 접수";
  const next = getNextEventFromEvents(events);
  return next?.type === "application-open" ? "접수 시작일 미리 확인" : "공식 일정과 응시자격 확인";
}
