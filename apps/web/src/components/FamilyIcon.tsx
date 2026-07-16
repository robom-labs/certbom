// 중앙 생성 SVG 스프라이트의 선형 아이콘을 접근성 안전하게 표시한다.
import iconsUrl from "../generated/robom-family/icons.svg?no-inline";

export type FamilyIconName = "home" | "search" | "calendar" | "bell" | "settings" | "family" | "install" | "info";

export function FamilyIcon({ name, className = "family-icon" }: { name: FamilyIconName; className?: string }) {
  return (
    <svg className={className} aria-hidden="true" focusable="false">
      <use href={`${iconsUrl}#family-icon-${name}`} />
    </svg>
  );
}
