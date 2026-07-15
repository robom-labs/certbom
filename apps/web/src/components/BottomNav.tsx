// 네 가지 핵심 화면으로 이동하는 모바일 하단 메뉴다.
export type Tab = "home" | "find" | "schedule" | "settings";

const tabs: Array<{ id: Tab; label: string; icon: string }> = [
  { id: "home", label: "홈", icon: "⌂" },
  { id: "find", label: "시험 찾기", icon: "⌕" },
  { id: "schedule", label: "내 일정", icon: "▦" },
  { id: "settings", label: "설정", icon: "⚙" },
];

export function BottomNav({ active, onChange }: { active: Tab; onChange: (tab: Tab) => void }) {
  return (
    <nav className="bottom-nav" aria-label="주 메뉴">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={active === tab.id ? "is-active" : ""}
          onClick={() => onChange(tab.id)}
          aria-current={active === tab.id ? "page" : undefined}
        >
          <span aria-hidden="true">{tab.icon}</span>
          {tab.label}
        </button>
      ))}
    </nav>
  );
}
