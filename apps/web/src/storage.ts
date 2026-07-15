// 관심 시험과 준비물 체크를 기기에 안전하게 보관하는 훅을 제공한다.
import { useCallback, useEffect, useState } from "react";

export function useStoredIds(key: string) {
  const [ids, setIds] = useState<string[]>(() => {
    try {
      const parsed: unknown = JSON.parse(window.localStorage.getItem(key) ?? "[]");
      return Array.isArray(parsed) && parsed.every((item) => typeof item === "string") ? parsed : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    window.localStorage.setItem(key, JSON.stringify(ids));
  }, [ids, key]);

  const toggle = useCallback((id: string) => {
    setIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }, []);

  const clear = useCallback(() => setIds([]), []);

  return { ids, toggle, clear };
}
