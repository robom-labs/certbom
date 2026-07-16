// 기기 저장 데이터가 손상돼도 앱이 안전하게 시작되는지 검증한다.
import { renderHook, act } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { readStoredValue, useStoredIds, writeStoredValue } from "./storage";

describe("기기 저장", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
  });

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

  it("localStorage 쓰기가 실패해도 화면 상태를 유지한다", () => {
    const setItem = vi.spyOn(window.localStorage, "setItem").mockImplementation(() => {
      throw new Error("quota exceeded");
    });
    const { result } = renderHook(() => useStoredIds("write-failure"));

    act(() => result.current.toggle("exam-1"));

    expect(result.current.ids).toEqual(["exam-1"]);
    expect(setItem).toHaveBeenCalled();
  });

  it("저장소 접근 오류를 null과 false로 격리한다", () => {
    vi.spyOn(window.localStorage, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(window.localStorage, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });

    expect(readStoredValue("blocked")).toBeNull();
    expect(writeStoredValue("blocked", "value")).toBe(false);
  });

  it("기존 키를 새 안정 ID로 이전하고 원본은 보존한다", () => {
    window.localStorage.setItem("legacy", JSON.stringify(["old-id"]));
    const { result } = renderHook(() => useStoredIds("next", {
      migrateFromKey: "legacy",
      migrate: (ids) => ids.map((id) => `new:${id}`),
    }));

    expect(result.current.ids).toEqual(["new:old-id"]);
    expect(window.localStorage.getItem("legacy")).toBe(JSON.stringify(["old-id"]));
    expect(window.localStorage.getItem("next")).toBe(JSON.stringify(["new:old-id"]));
  });

  it("현재 키에 남은 이전 버전 ID도 새 안정 ID로 다시 정규화한다", () => {
    window.localStorage.setItem("current", JSON.stringify(["old-current-id"]));
    const { result } = renderHook(() => useStoredIds("current", {
      migrate: (ids) => ids.map((id) => `new:${id}`),
    }));

    expect(result.current.ids).toEqual(["new:old-current-id"]);
    expect(window.localStorage.getItem("current")).toBe(JSON.stringify(["new:old-current-id"]));
  });
});
