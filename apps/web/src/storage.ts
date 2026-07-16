// 브라우저 저장 실패를 격리하면서 관심 시험과 설정을 안전하게 보관한다.
import { useCallback, useEffect, useState } from "react";

export function readStoredValue(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeStoredValue(key: string, value: string): boolean {
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function useStoredIds(key: string) {
  const [ids, setIds] = useState<string[]>(() => {
    try {
      const parsed: unknown = JSON.parse(readStoredValue(key) ?? "[]");
      return Array.isArray(parsed) && parsed.every((item) => typeof item === "string") ? parsed : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    writeStoredValue(key, JSON.stringify(ids));
  }, [ids, key]);

  const toggle = useCallback((id: string) => {
    setIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }, []);

  const clear = useCallback(() => setIds([]), []);

  return { ids, toggle, clear };
}
