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

function parseStoredIds(value: string | null) {
  try {
    const parsed: unknown = JSON.parse(value ?? "[]");
    return Array.isArray(parsed) && parsed.every((item) => typeof item === "string") ? parsed : [];
  } catch {
    return [];
  }
}

type StoredIdOptions = {
  migrateFromKey?: string;
  migrate?: (ids: string[]) => string[];
};

export function useStoredIds(key: string, options: StoredIdOptions = {}) {
  const [saveFailed, setSaveFailed] = useState(false);
  const [ids, setIds] = useState<string[]>(() => {
    const current = readStoredValue(key);
    if (current !== null) {
      const parsed = parseStoredIds(current);
      return options.migrate ? options.migrate(parsed) : parsed;
    }
    if (!options.migrateFromKey || !options.migrate) return [];
    return options.migrate(parseStoredIds(readStoredValue(options.migrateFromKey)));
  });

  useEffect(() => {
    setSaveFailed(!writeStoredValue(key, JSON.stringify(ids)));
  }, [ids, key]);

  const toggle = useCallback((id: string) => {
    setIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }, []);

  const clear = useCallback(() => setIds([]), []);

  return { ids, toggle, clear, saveFailed };
}
