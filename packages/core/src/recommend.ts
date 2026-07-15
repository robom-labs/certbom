// 사용자의 답변을 설명 가능한 점수와 이유로 변환하는 추천 규칙을 제공한다.
import { exams } from "./catalog";
import type { RecommendationProfile, RecommendationResult } from "./model";

const RULE_VERSION = "2026.07-v2";

export function recommend(profile: RecommendationProfile): RecommendationResult[] {
  return exams
    .map((exam) => {
      let score = 0;
      const reasons: string[] = [];
      const cautions: string[] = [];

      if (exam.goals.includes(profile.goal)) {
        score += 5;
        reasons.push(`${profile.goal} 목표와 직접 연결돼요.`);
      }
      if (profile.interest === "전체" || exam.category.includes(profile.interest)) {
        score += 4;
        reasons.push(`${exam.category} 관심 분야에 맞아요.`);
      }
      if (exam.duration === profile.duration) {
        score += 3;
        reasons.push("준비 가능한 기간과 잘 맞아요.");
      } else if (profile.duration === "long") {
        score += 1;
      }
      if (!profile.practicalPossible && exam.practical) {
        score -= 4;
        cautions.push("실기 준비가 포함될 수 있어요.");
      } else if (profile.practicalPossible && exam.practical) {
        score += 1;
        reasons.push("실기 준비가 가능한 선택이에요.");
      }
      if (!profile.eligibilityRestrictedAllowed && exam.eligibilityRestricted) {
        score -= 5;
        cautions.push("응시자격을 먼저 확인해야 해요.");
      }
      cautions.push(exam.caution);

      return { exam, score, reasons: reasons.slice(0, 3), cautions: cautions.slice(0, 2), ruleVersion: RULE_VERSION };
    })
    .sort((a, b) => b.score - a.score || a.exam.name.localeCompare(b.exam.name, "ko"));
}
