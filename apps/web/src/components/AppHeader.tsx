// 로봄 패밀리형 워드마크와 데이터 상태를 보여주는 앱바다.
import wordmarkUrl from "../generated/robom-family/wordmark.svg";

export function AppHeader({ compact = false }: { compact?: boolean }) {
  return (
    <header className={`app-header${compact ? " app-header--compact" : ""}`}>
      <img src="/icons/icon.svg" alt="" className="app-header__icon" />
      <div>
        <p className="app-header__eyebrow">robom · 놓치지 않는 시험 준비</p>
        <h1 className="family-wordmark">
          <span className="sr-only">자격증봄</span>
          <span aria-hidden="true">자격증</span>
          <img src={wordmarkUrl} alt="" aria-hidden="true" />
        </h1>
      </div>
      <span className="source-pill">공식 일정 확인</span>
    </header>
  );
}
