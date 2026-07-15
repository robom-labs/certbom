// 시험 상세에서 다음 행동·공식 일정·준비물·공유를 순서대로 제공한다.
import { createGoogleCalendarUrl, createIcs, type Exam } from "@certbom/core";
import { formatEventDate, nextAction, trustLabels } from "../format";

type Props = {
  exam: Exam;
  favorite: boolean;
  checkedIds: string[];
  onBack: () => void;
  onToggleFavorite: (id: string) => void;
  onToggleChecked: (id: string) => void;
};

export function DetailScreen({ exam, favorite, checkedIds, onBack, onToggleFavorite, onToggleChecked }: Props) {
  const action = nextAction(exam);
  const calendarEvent = action.event;

  const downloadIcs = () => {
    if (!calendarEvent) return;
    const blob = new Blob([createIcs(exam, calendarEvent)], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${exam.slug}.ics`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const share = async () => {
    const data = { title: exam.name, text: `${exam.name} · ${action.label} ${action.detail}`, url: window.location.href };
    if (navigator.share) await navigator.share(data);
    else await navigator.clipboard.writeText(window.location.href);
  };

  return (
    <main className="screen detail-screen">
      <button className="back-button" type="button" onClick={onBack}>← 시험 목록</button>
      <div className="detail-heading"><span className="trust-badge">{trustLabels[exam.trustLevel]}</span><h1>{exam.name}</h1><p>{exam.sourceName} · 마지막 확인 {new Date(exam.lastVerifiedAt).toLocaleDateString("ko-KR")}</p></div>

      <section className="next-action-card"><p>지금 해야 할 일</p><h2>{action.label}</h2><strong>{action.detail}</strong><a href={exam.applicationUrl ?? exam.officialUrl} target="_blank" rel="noreferrer">공식 접수처에서 확인 <span>↗</span></a></section>

      <button className={`follow-button${favorite ? " is-on" : ""}`} type="button" aria-pressed={favorite} onClick={() => onToggleFavorite(exam.id)}>{favorite ? "★ 관심 시험으로 저장됨" : "☆ 관심 시험 저장하기"}</button>

      <section className="detail-card"><h2>이 시험은요.</h2><p>{exam.description}</p><dl><div><dt>일정 방식</dt><dd>{exam.scheduleType === "rolling" ? "상시 · 시험장별 날짜 선택" : exam.scheduleType === "announcement" ? "공고 확인형" : "회차별 정기 시험"}</dd></div><div><dt>시험 구성</dt><dd>{exam.practical ? "필기·실기 확인" : "필기 중심"}</dd></div><div><dt>일정 출처</dt><dd>{exam.sourceName}</dd></div>{exam.feeLabel && <div><dt>응시료</dt><dd>{exam.feeLabel}</dd></div>}</dl><p className="caution">{exam.caution}</p></section>

      <section className="detail-card"><div className="detail-card__head"><h2>2026 공식 일정</h2><a href={exam.officialUrl} target="_blank" rel="noreferrer">원문 ↗</a></div>{exam.events.length ? <ol className="timeline">{exam.events.map((event) => <li key={event.id}><span aria-hidden="true" /><div><strong>{event.title}</strong><time dateTime={event.startAt}>{formatEventDate(event)}</time>{event.regionCode && <small>대상 지역 {event.regionCode === "ALL" ? "전 지역" : event.regionCode}</small>}</div></li>)}</ol> : <div className="inline-empty"><strong>{exam.scheduleType === "rolling" ? "시험장별 날짜를 직접 선택하는 상시 시험이에요." : "다음 확정 일정은 공식 페이지에서 확인해 주세요."}</strong><p>확인되지 않은 날짜를 임의로 만들지 않고 공식 접수처로 바로 연결합니다.</p></div>}</section>

      <section className="detail-card"><h2>시험 당일 준비</h2><p>시험별 공식 기준을 확인한 뒤 기기에서 체크해 두세요.</p><div className="checklist">{exam.preparation.map((item) => <label key={item.id}><input type="checkbox" checked={checkedIds.includes(item.id)} onChange={() => onToggleChecked(item.id)} /><span><strong>{item.label}{item.required && <em>필수</em>}</strong><small>{item.detail}</small></span></label>)}</div><a className="source-link" href={exam.officialUrl} target="_blank" rel="noreferrer">준비물 공식 출처 확인 ↗</a></section>

      <section className="detail-card"><h2>일정 공유</h2><div className="share-grid"><button type="button" onClick={share}>공유하기</button><button type="button" disabled={!calendarEvent} onClick={downloadIcs}>ICS 저장</button>{calendarEvent ? <a href={createGoogleCalendarUrl(exam, calendarEvent)} target="_blank" rel="noreferrer">Google 캘린더</a> : <span>일정 확정 후 캘린더 제공</span>}</div></section>

      <aside className="disclaimer">자격증봄은 공식 시험기관이 아닙니다. 접수·응시자격·준비물은 시행기관의 최신 공고가 최종 기준입니다.</aside>
    </main>
  );
}
