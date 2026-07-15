// Node의 실험적 Web Storage 상태와 무관하게 브라우저 저장 테스트를 격리한다.
const values = new Map<string, string>();

const storage: Storage = {
  get length() {
    return values.size;
  },
  clear() {
    values.clear();
  },
  getItem(key) {
    return values.get(key) ?? null;
  },
  key(index) {
    return [...values.keys()][index] ?? null;
  },
  removeItem(key) {
    values.delete(key);
  },
  setItem(key, value) {
    values.set(key, String(value));
  },
};

Object.defineProperty(window, "localStorage", { configurable: true, value: storage });
