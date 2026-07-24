// 저장된 글자 크기 설정이 앱 시작 시점에 문서 전체로 복원되는지 검증한다.
import { afterEach, describe, expect, it } from "vitest";
import { FONT_SCALE_KEY, applyFontScale, readFontScale } from "./font-scale";

afterEach(() => {
  window.localStorage.clear();
  document.documentElement.style.removeProperty("--font-scale");
});

describe("글자 크기 접근성 설정", () => {
  it("저장값이 없거나 허용되지 않으면 기본 100을 돌려준다", () => {
    expect(readFontScale()).toBe("100");
    window.localStorage.setItem(FONT_SCALE_KEY, "999");
    expect(readFontScale()).toBe("100");
  });

  it("앱 시작 시 저장된 글자 크기를 문서 전체에 적용한다", () => {
    window.localStorage.setItem(FONT_SCALE_KEY, "130");
    applyFontScale(readFontScale());
    expect(document.documentElement.style.getPropertyValue("--font-scale")).toBe("1.3");
  });
});
