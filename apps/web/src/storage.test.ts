// 기기 저장 데이터가 손상돼도 앱이 안전하게 시작되는지 검증한다.
import { renderHook, act } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useStoredIds } from "./storage";

describe("기기 저장", () => {
  it("손상된 값은 빈 목록으로 복구한다", () => {
    window.localStorage.setItem("bad", "{");
    const { result } = renderHook(() => useStoredIds("bad"));
    expect(result.current.ids).toEqual([]);
  });

  it("관심 시험을 추가하고 해제한다", () => {
    const { result } = renderHook(() => useStoredIds("toggle"));
    act(() => result.current.toggle("exam-1"));
    expect(result.current.ids).toEqual(["exam-1"]);
    act(() => result.current.toggle("exam-1"));
    expect(result.current.ids).toEqual([]);
  });
});
