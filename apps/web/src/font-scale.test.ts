// 저장된 글자 크기 설정이 앱 시작 시점에 문서 전체로 복원되는지 검증한다.
import { afterEach, describe, expect, it } from "vitest";
import { FONT_SCALE_KEY, applyFontScale, readFontScale } from "./font-scale";

afterEach(() => {
  window.localStorage.clear();
  document.documentElement.style.removeProperty("--font-scale");
});

describe("글자 크기 접근성 설정", () => {
  it("저장값이 없으면 기본 100을 돌려준다", () => {
    expect(readFontScale()).toBe("100");
  });

  it("허용되지 않은 저장값은 기본 100으로 처리한다", () => {
    window.localStorage.setItem(FONT_SCALE_KEY, "999");
    expect(readFontScale()).toBe("100");
  });

  it("허용된 저장값을 그대로 읽는다", () => {
    window.localStorage.setItem(FONT_SCALE_KEY, "130");
    expect(readFontScale()).toBe("130");
  });

  it("앱 시작 시 저장된 글자 크기를 문서 전체 --font-scale로 적용한다", () => {
    // 회귀 방지: 설정 화면을 열지 않아도 재실행 첫 화면부터 큰 글자가 유지돼야 한다.
    window.localStorage.setItem(FONT_SCALE_KEY, "130");
    applyFontScale(readFontScale());
    expect(document.documentElement.style.getPropertyValue("--font-scale")).toBe("1.3");
  });
});
