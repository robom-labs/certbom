// 준비물 객체를 모바일 카드에서 읽기 쉬운 짧은 라벨로 변환한다.
import type { PreparationItem } from "@certbom/core";

export function formatPreparationPreview(items: readonly PreparationItem[], limit = 3) {
  return items.slice(0, limit).map((item) => item.label).join(" · ");
}
