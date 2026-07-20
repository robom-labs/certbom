// 저장된 글자 크기 접근성 설정을 앱 시작 시점과 설정 화면에서 동일하게 적용한다.
import { readStoredValue } from "./storage";

export const FONT_SCALE_KEY = "certbom-font-scale";
export const fontScales = ["100", "115", "130"] as const;
export type FontScale = (typeof fontScales)[number];

export function readFontScale(): FontScale {
  const stored = readStoredValue(FONT_SCALE_KEY);
  return fontScales.find((value) => value === stored) ?? "100";
}

export function applyFontScale(scale: FontScale): void {
  document.documentElement.style.setProperty("--font-scale", `${Number(scale) / 100}`);
}
