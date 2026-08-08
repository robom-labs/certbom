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

export function removeStoredValue(key: string): boolean {
  try {
    window.localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

export function parseStoredIdsResult(value: string | null): { ok: boolean; ids: string[] } {
  try {
    const parsed: unknown = JSON.parse(value ?? "[]");
    return Array.isArray(parsed) && parsed.every((item) => typeof item === "string")
      ? { ok: true, ids: parsed }
      : { ok: false, ids: [] };
  } catch {
    return { ok: false, ids: [] };
  }
}

export function replaceStoredIdListsAtomically(replacements: Array<{ key: string; ids: string[] }>) {
  const previous = replacements.map(({ key }) => ({ key, value: readStoredValue(key) }));
  const normalized = replacements.map(({ key, ids }) => ({ key, ids: [...new Set(ids)] }));

  try {
    for (const replacement of normalized) {
      if (!writeStoredValue(replacement.key, JSON.stringify(replacement.ids))) {
        throw new Error("기기 저장 공간에 백업을 쓰지 못했습니다.");
      }
    }
    for (const replacement of normalized) {
      const verified = parseStoredIdsResult(readStoredValue(replacement.key));
      if (!verified.ok || JSON.stringify(verified.ids) !== JSON.stringify(replacement.ids)) {
        throw new Error("백업을 저장한 뒤 확인하지 못했습니다.");
      }
    }
  } catch (error) {
    for (const snapshot of previous) {
      if (snapshot.value === null) removeStoredValue(snapshot.key);
      else writeStoredValue(snapshot.key, snapshot.value);
    }
    throw error;
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
      const parsed = parseStoredIdsResult(current);
      if (parsed.ok) return options.migrate ? options.migrate(parsed.ids) : parsed.ids;
    }
    if (!options.migrateFromKey || !options.migrate) return [];
    const legacy = parseStoredIdsResult(readStoredValue(options.migrateFromKey));
    return legacy.ok ? options.migrate(legacy.ids) : [];
  });

  useEffect(() => {
    setSaveFailed(!writeStoredValue(key, JSON.stringify(ids)));
  }, [ids, key]);

  const toggle = useCallback((id: string) => {
    setIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }, []);

  const replace = useCallback((nextIds: string[]) => setIds([...new Set(nextIds)]), []);
  const clear = useCallback(() => setIds([]), []);

  return { ids, toggle, replace, clear, saveFailed };
}
