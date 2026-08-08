// Q-Net 시험에서 사용자 판단을 돕는 공식 보조 도구 링크만 선별한다.
import type { Exam } from "./model";

export type OfficialExamAction = {
  id: "eligibility" | "cbt" | "results" | "practical-items";
  label: string;
  description: string;
  url: string;
};

const QNET_ACTIONS = {
  eligibility: {
    id: "eligibility",
    label: "응시자격 자가진단",
    description: "학력·경력 조건을 Q-Net 공식 도구에서 확인해요.",
    url: "https://www.q-net.or.kr/myp015.do?gId=66&gSite=Q&id=myp01501",
  },
  cbt: {
    id: "cbt",
    label: "CBT 체험하기",
    description: "컴퓨터 시험 화면과 답안 입력 방식을 미리 익혀요.",
    url: "https://www.q-net.or.kr/man001.do?gId=21&gSite=Q&id=man00801&step=1",
  },
  results: {
    id: "results",
    label: "합격자 발표 조회",
    description: "Q-Net 공식 합격자 발표 화면에서 결과를 확인해요.",
    url: "https://www.q-net.or.kr/anc001.do?gId=03&gSite=Q&id=anc001011",
  },
  practicalItems: {
    id: "practical-items",
    label: "실기 준비물 조회",
    description: "종목별 수험자 지참 준비물을 공식 목록에서 확인해요.",
    url: "https://www.q-net.or.kr/rcv013.do?id=rcv01312&gSite=Q&gId=",
  },
} as const satisfies Record<string, OfficialExamAction>;

export function getOfficialExamActions(exam: Exam): OfficialExamAction[] {
  if (!exam.sourceId.startsWith("qnet-")) return [];

  return [
    ...(exam.eligibilityRestricted ? [QNET_ACTIONS.eligibility] : []),
    ...(exam.sourceId === "qnet-technical-plan-2026" ? [QNET_ACTIONS.cbt] : []),
    QNET_ACTIONS.results,
    ...(exam.practical ? [QNET_ACTIONS.practicalItems] : []),
  ];
}
