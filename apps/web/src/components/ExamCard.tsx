// 시험의 접수 상태와 바로 해야 할 행동을 한 카드에 요약한다.
import type { Exam } from "@certbom/core";
import { examStatusLabel, nextAction } from "../format";

type Props = {
  exam: Exam;
  favorite: boolean;
  onOpen: (examId: string) => void;
  onToggleFavorite: (examId: string) => void;
  compact?: boolean;
};

export function ExamCard({ exam, favorite, onOpen, onToggleFavorite, compact = false }: Props) {
  const action = nextAction(exam);
  const status = examStatusLabel(exam);
  return (
    <article className={`exam-card${compact ? " exam-card--compact" : ""}`}>
      <button className="exam-card__main" type="button" onClick={() => onOpen(exam.id)}>
        <span className="exam-card__badges">
          <em className={status === "지금 접수 중" ? "is-open" : ""}>{status}</em>
          <small>{exam.scheduleType === "rolling" ? "상시" : exam.scheduleType === "announcement" ? "공고형" : "정기"}</small>
        </span>
        <h3>{exam.name}</h3>
        <p>{exam.category} · {exam.sourceName}</p>
        <strong>{action.label}</strong>
        <span className="exam-card__date">{action.detail}</span>
      </button>
      <button
        className={`favorite-button${favorite ? " is-on" : ""}`}
        type="button"
        onClick={() => onToggleFavorite(exam.id)}
        aria-label={`${exam.name} ${favorite ? "관심 해제" : "관심 저장"}`}
        aria-pressed={favorite}
      >
        {favorite ? "★" : "☆"}
      </button>
    </article>
  );
}
