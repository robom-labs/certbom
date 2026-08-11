// 자격증봄 화면을 소형 휴대폰부터 폴더블·태블릿까지 폭과 글자 크기에 맞춰 재배치한다.
export type AdaptiveSize = "compact" | "medium" | "expanded";

export type AdaptiveLayout = {
  size: AdaptiveSize;
  contentMaxWidth: number;
  horizontalPadding: number;
  modalMaxWidth: number;
  modalCentered: boolean;
  listColumns: 1 | 2;
  statColumns: 1 | 3;
  navigationMaxWidth: number;
};

export function getAdaptiveLayout(width: number, fontScale = 1): AdaptiveLayout {
  const safeWidth = Number.isFinite(width) && width > 0 ? width : 390;
  const safeFontScale = Number.isFinite(fontScale) && fontScale > 0 ? fontScale : 1;
  const size: AdaptiveSize = safeWidth >= 900 ? "expanded" : safeWidth >= 600 ? "medium" : "compact";
  const largeText = safeFontScale >= 1.35;

  return {
    size,
    contentMaxWidth: size === "expanded" ? 1120 : size === "medium" ? 960 : 760,
    horizontalPadding: size === "expanded" ? 28 : size === "medium" ? 22 : safeWidth <= 340 ? 12 : 16,
    modalMaxWidth: size === "expanded" ? 720 : size === "medium" ? 680 : Math.max(296, safeWidth),
    modalCentered: size !== "compact",
    listColumns: size === "compact" || largeText ? 1 : 2,
    statColumns: safeWidth <= 360 || largeText ? 1 : 3,
    navigationMaxWidth: size === "expanded" ? 920 : size === "medium" ? 820 : 760,
  };
}
