// 자격증봄의 휴대폰·폴더블·태블릿 및 큰 글자 적응형 레이아웃 계약을 검증한다.
import { describe, expect, it } from "vitest";
import { getAdaptiveLayout } from "./adaptive-layout";

describe("적응형 레이아웃", () => {
  it("320px 소형 휴대폰에서는 한 열과 좁은 여백을 사용한다", () => {
    const layout = getAdaptiveLayout(320);
    expect(layout.size).toBe("compact");
    expect(layout.horizontalPadding).toBe(12);
    expect(layout.listColumns).toBe(1);
    expect(layout.statColumns).toBe(1);
    expect(layout.modalCentered).toBe(false);
  });

  it("390px 일반 휴대폰에서는 통계 3개를 유지한다", () => {
    const layout = getAdaptiveLayout(390);
    expect(layout.size).toBe("compact");
    expect(layout.statColumns).toBe(3);
    expect(layout.listColumns).toBe(1);
  });

  it("720px 폴더블·소형 태블릿에서는 두 열과 중앙 모달을 사용한다", () => {
    const layout = getAdaptiveLayout(720);
    expect(layout.size).toBe("medium");
    expect(layout.listColumns).toBe(2);
    expect(layout.modalCentered).toBe(true);
  });

  it("1024px 태블릿에서는 넓은 콘텐츠 폭을 사용한다", () => {
    const layout = getAdaptiveLayout(1024);
    expect(layout.size).toBe("expanded");
    expect(layout.contentMaxWidth).toBe(1120);
    expect(layout.navigationMaxWidth).toBe(920);
  });

  it("시스템 큰 글자에서는 넓은 화면도 한 열로 되돌린다", () => {
    const layout = getAdaptiveLayout(768, 2);
    expect(layout.listColumns).toBe(1);
    expect(layout.statColumns).toBe(1);
  });
});
