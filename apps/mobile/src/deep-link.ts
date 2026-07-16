// certbom 스킴으로 들어온 시험 식별자를 안전하게 해석한다.
export function parseExamDeepLink(url: string) {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "certbom:") return undefined;

    const segments = [parsed.hostname, ...parsed.pathname.split("/")].filter(Boolean);
    if (segments[0] !== "exam" || !segments[1]) return undefined;

    return decodeURIComponent(segments[1]);
  } catch {
    return undefined;
  }
}
