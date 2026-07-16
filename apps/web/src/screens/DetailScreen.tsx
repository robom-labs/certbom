// 시험 상세에서 다음 행동·공식 일정·준비물·공유를 순서대로 제공한다.
import { createGoogleCalendarUrl, createIcs, type Exam, type PreparationItem } from "@certbom/core";
import { useState } from "react";
import { trackFamilyEvent } from "../analytics";
import { formatEventDate, nextAction, trustLabels } from "../format";

type Props = {
  exam: Exam;
  favorite: boolean;
  checkedIds: string[];
  storageError: boolean;
  onBack: () => void;
  onToggleFavorite: (id: string) => void;
  onToggleChecked: (id: string) => void;
};

const categoryLabels: Record<PreparationItem["category"], string> = {
  identity: "신분증",
  ticket: "수험표",
  writing: "필기구",
  calculator: "계산기",
  tool: "실기 도구",
  clothing: "복장",
  document: "제출 서류",
  forbidden: "금지 물품",
  arrival: "입실 시간·주의",
  other: "기타",
};
const categoryOrder = Object.keys(categoryLabels) as PreparationItem["category"][];
const sourceTypeLabels: Record<PreparationItem["sourceType"], string> = {
  official: "공식 확인",
  "cross-checked": "교차 확인 참고",
  general: "일반 준비",
};

function scheduleYearLabel(exam: Exam) {
  const years = [...new Set(exam.events.map((event) => new Intl.DateTimeFormat("en", {
    year: "numeric",
    timeZone: "Asia/Seoul",
  }).format(new Date(event.startAt))))];
  return years.length ? `${years.join("·")} 공식 일정` : "공식 일정";
}

export function DetailScreen({ exam, favorite, checkedIds, storageError, onBack, onToggleFavorite, onToggleChecked }: Props) {
  const [shareStatus, setShareStatus] = useState("");
  const action = nextAction(exam);
  const calendarEvent = action.event;
  const checkedCount = exam.preparation.filter((item) => checkedIds.includes(item.id)).length;
  const requiredIncomplete = exam.preparation.filter((item) => item.importance === "required" && !checkedIds.includes(item.id)).length;
  const groups = categoryOrder
    .map((category) => ({ category, items: exam.preparation.filter((item) => item.category === category) }))
    .filter((group) => group.items.length > 0);
  const hasOfficialPreparation = exam.preparation.some((item) => item.sourceType === "official");

  const downloadIcs = () => {
    if (!calendarEvent) return;
    trackFamilyEvent("calendar_added", "exam-detail-ics");
    const blob = new Blob([createIcs(exam, calendarEvent)], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${exam.slug}.ics`;
    link.hidden = true;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
  };

  const copyShareUrl = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setShareStatus("링크를 복사했어요.");
    } catch {
      const field = document.createElement("textarea");
      field.value = window.location.href;
      field.setAttribute("readonly", "");
      field.style.position = "fixed";
      field.style.opacity = "0";
      document.body.append(field);
      field.select();
      const copied = document.execCommand("copy");
      field.remove();
      setShareStatus(copied ? "링크를 복사했어요." : "복사하지 못했어요. 주소창의 링크를 직접 복사해 주세요.");
    }
  };

  const share = async () => {
    const data = { title: exam.name, text: `${exam.name} · ${action.label} ${action.detail}`, url: window.location.href };
    if (!navigator.share) {
      await copyShareUrl();
      return;
    }
    try {
      await navigator.share(data);
      setShareStatus("공유 화면을 열었어요.");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      await copyShareUrl();
    }
  };

  return (
    <main className="screen detail-screen">
      <button className="back-button" type="button" onClick={onBack}>← 시험 목록</button>
      <div className="detail-heading"><span className="trust-badge">{trustLabels[exam.trustLevel]}</span><h1>{exam.name}</h1><p>{exam.sourceName} · 마지막 확인 {new Date(exam.lastVerifiedAt).toLocaleDateString("ko-KR")}</p></div>

      <section className="next-action-card"><p>지금 해야 할 일</p><h2>{action.label}</h2><strong>{action.detail}</strong><a href={exam.applicationUrl ?? exam.officialUrl} target="_blank" rel="noreferrer" onClick={() => trackFamilyEvent("official_exam_clicked", "exam-detail-action")}>공식 접수처에서 확인 <span>↗</span></a></section>

      <button className={`follow-button${favorite ? " is-on" : ""}`} type="button" aria-pressed={favorite} onClick={() => onToggleFavorite(exam.id)}>{favorite ? "★ 관심 시험으로 저장됨" : "☆ 관심 시험 저장하기"}</button>

      <section className="detail-card"><h2>이 시험은요.</h2><p>{exam.description}</p><dl><div><dt>일정 방식</dt><dd>{exam.scheduleType === "rolling" ? "상시 · 시험장별 날짜 선택" : exam.scheduleType === "announcement" ? "공고 확인형" : "회차별 정기 시험"}</dd></div><div><dt>시험 구성</dt><dd>{exam.practical ? "필기·실기 확인" : "필기 중심"}</dd></div><div><dt>일정 출처</dt><dd>{exam.sourceName}</dd></div>{exam.feeLabel && <div><dt>응시료</dt><dd>{exam.feeLabel}</dd></div>}</dl><p className="caution">{exam.caution}</p></section>

      <section className="detail-card"><div className="detail-card__head"><h2>{scheduleYearLabel(exam)}</h2><a href={exam.officialUrl} target="_blank" rel="noreferrer" onClick={() => trackFamilyEvent("official_exam_clicked", "exam-detail-schedule")}>원문 ↗</a></div>{exam.events.length ? <ol className="timeline">{exam.events.map((event) => <li key={event.id}><span aria-hidden="true" /><div><strong>{event.title}</strong><time dateTime={event.startAt}>{formatEventDate(event)}</time>{event.regionCode && <small>대상 지역 {event.regionCode === "ALL" ? "전 지역" : event.regionCode}</small>}</div></li>)}</ol> : <div className="inline-empty"><strong>{exam.scheduleType === "rolling" ? "시험장별 날짜를 직접 선택하는 상시 시험이에요." : "다음 확정 일정은 공식 페이지에서 확인해 주세요."}</strong><p>확인되지 않은 날짜를 임의로 만들지 않고 공식 접수처로 바로 연결합니다.</p></div>}</section>

      <section className="detail-card preparation-card">
        <h2>시험 당일 준비</h2>
        <p>{hasOfficialPreparation ? "필수 준비물을 빠짐없이 확인하고 이 기기에 체크해 두세요." : "공식 세부 목록을 기다리는 동안 지금 먼저 챙길 수 있는 일반 준비를 확인하세요."}</p>
        <div className="preparation-progress" role="status" aria-label={`준비물 ${exam.preparation.length}개 중 ${checkedCount}개 완료`}>
          <div><strong>전체 {exam.preparation.length}개</strong><span>완료 {checkedCount}개 · 필수 미완료 {requiredIncomplete}개</span></div>
          <progress max={Math.max(exam.preparation.length, 1)} value={checkedCount}>{checkedCount}개 완료</progress>
        </div>
        {!hasOfficialPreparation && (
          <div className="preparation-unverified" role="status">
            <strong>공식 세부 준비물은 확인 중이지만, 빈손으로 돌려보내지 않아요.</strong>
            <p>아래 {exam.preparation.length}개는 여러 시험에 공통으로 도움이 되는 일반 준비예요. 확정 준비물·허용 기종·입실 시각은 공식 원문을 함께 확인하세요.</p>
          </div>
        )}
        {storageError && <p className="storage-error" role="alert">체크 상태를 기기에 저장하지 못했어요. 현재 화면에서는 유지되지만 새로고침 전 공식 목록을 다시 확인해 주세요.</p>}
        <div className="checklist">
          {groups.map((group) => (
            <section className="preparation-group" key={group.category} aria-labelledby={`preparation-${group.category}`}>
              <h3 id={`preparation-${group.category}`}>{categoryLabels[group.category]} <span>{group.items.length}개</span></h3>
              {group.items.map((item) => (
                <label key={item.id} data-preparation-id={item.id}>
                  <input type="checkbox" checked={checkedIds.includes(item.id)} onChange={() => onToggleChecked(item.id)} />
                  <span>
                    <strong>
                      {item.label}
                      <em className={`importance-${item.sourceType === "general" ? "general" : item.sourceType === "cross-checked" ? "cross-checked" : item.importance}`}>
                        {item.sourceType === "official"
                          ? item.importance === "required" ? "필수" : item.importance === "forbidden" ? "금지" : "권장"
                          : sourceTypeLabels[item.sourceType]}
                      </em>
                    </strong>
                    <small>{item.detail}</small>
                    <small className="preparation-meta">{item.stage === "all" ? "전 단계" : item.stage === "written" ? "필기" : item.stage === "practical" ? "실기" : "면접"} · {item.sourceLabel} · 기준 {item.preparationVersion} · 마지막 확인 {new Date(item.lastVerifiedAt).toLocaleDateString("ko-KR")}</small>
                  </span>
                </label>
              ))}
            </section>
          ))}
        </div>
        <a className="source-link" href={exam.officialUrl} target="_blank" rel="noreferrer" onClick={() => trackFamilyEvent("official_exam_clicked", "exam-detail-preparation")}>준비물 공식 출처 확인 ↗</a>
      </section>

      <section className="detail-card"><h2>일정 공유</h2><div className="share-grid"><button type="button" onClick={share}>공유하기</button><button type="button" disabled={!calendarEvent} onClick={downloadIcs}>ICS 저장</button>{calendarEvent ? <a href={createGoogleCalendarUrl(exam, calendarEvent)} target="_blank" rel="noreferrer" onClick={() => trackFamilyEvent("calendar_added", "exam-detail-google")}>Google 캘린더</a> : <span>일정 확정 후 캘린더 제공</span>}</div>{shareStatus && <p className="share-feedback" role="status">{shareStatus}</p>}</section>

      <aside className="disclaimer">자격증봄은 공식 시험기관이 아닙니다. 접수·응시자격·준비물은 시행기관의 최신 공고가 최종 기준입니다.</aside>
    </main>
  );
}
