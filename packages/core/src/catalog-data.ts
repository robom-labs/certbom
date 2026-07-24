// 공식 기관에서 확인한 2026 시험 종목과 일정 스냅샷을 구조화한다.
import type { ExamEventType, PreparationItem, ScheduleType, TimePrecision, TrustLevel } from "./model";

export const CATALOG_UPDATED_AT = "2026-07-16T15:00:00+09:00";
export const CATALOG_DATA_VERSION = "2026.07.20-v4";

export type CatalogSource = {
  id: string;
  name: string;
  officialUrl: string;
  applicationUrl: string;
  trustLevel: TrustLevel;
};

export type EventSeed = {
  id: string;
  type: ExamEventType;
  title: string;
  startAt: string;
  endAt?: string;
  timePrecision: TimePrecision;
  officialSourceUrl?: string;
  regionCode?: string;
  groupKey?: string;
};

type PreparationSeed = Pick<PreparationItem, "category" | "label" | "detail" | "required"> & Partial<Omit<PreparationItem, "id" | "officialSourceUrl" | "category" | "label" | "detail" | "required">> & {
  id: string;
  officialSourceUrl?: string;
  preserveId?: boolean;
};

export type ExamSeed = {
  id: string;
  name: string;
  shortName?: string;
  aliases: string[];
  source: CatalogSource;
  organizer: string;
  category: string;
  goals: string[];
  description: string;
  scheduleType: ScheduleType;
  timePrecision: TimePrecision;
  practical: boolean;
  eligibilityRestricted: boolean;
  duration: "short" | "medium" | "long";
  feeLabel?: string;
  caution: string;
  events: EventSeed[];
  preparation?: PreparationSeed[];
  preparationVersion?: string;
};

const QNET_APPLICATION_URL = "https://www.q-net.or.kr/man001.do?gSite=Q";

export const catalogSources = {
  qnetTechnical: {
    id: "qnet-technical-plan-2026",
    name: "Q-Net 국가기술자격",
    officialUrl: "https://www.q-net.or.kr/man004.do?ARTL_SEQ=5249930&BOARD_ID=Q001&gSite=Q&id=man00402&notiType=10",
    applicationUrl: QNET_APPLICATION_URL,
    trustLevel: "official-notice",
  },
  qnetProfessional: {
    id: "qnet-professional-calendar-2026",
    name: "Q-Net 국가전문자격",
    officialUrl: "https://mo.q-net.or.kr/qnet_app/examCalendar.pdf",
    applicationUrl: QNET_APPLICATION_URL,
    trustLevel: "official-notice",
  },
  history: {
    id: "historyexam-schedule-2026",
    name: "국사편찬위원회",
    officialUrl: "https://www.historyexam.go.kr/pageLink.do?link=examSchedule",
    applicationUrl: "https://www.historyexam.go.kr/",
    trustLevel: "official-notice",
  },
  korcham: {
    id: "korcham-calendar-2026",
    name: "대한상공회의소 자격평가사업단",
    officialUrl: "https://license.korcham.net/customer/noticeview.do?num=252526&pg=1&search=&word=",
    applicationUrl: "https://license.korcham.net/",
    trustLevel: "official-notice",
  },
  kdata: {
    id: "kdata-calendar-2026",
    name: "한국데이터산업진흥원",
    officialUrl: "https://www.dataq.or.kr/www/accept/schedule.do",
    applicationUrl: "https://www.dataq.or.kr/www/accept/schedule.do",
    trustLevel: "official-notice",
  },
  kpc: {
    id: "kpc-current-registration-2026",
    name: "한국생산성본부 자격",
    officialUrl: "https://license.kpc.or.kr/nasec/rceptexmncnfirm/orgrcept/selectItemfx.do",
    applicationUrl: "https://license.kpc.or.kr/index.do?gubun=main30",
    trustLevel: "official-notice",
  },
  at: {
    id: "at-calendar-2026",
    name: "한국공인회계사회 AT자격시험",
    officialUrl: "https://at.kicpa.or.kr/home/main_2026.jsp",
    applicationUrl: "https://at.kicpa.or.kr/",
    trustLevel: "official-notice",
  },
  gosi: {
    id: "gosi-announcement-2026",
    name: "인사혁신처 사이버국가고시센터",
    officialUrl: "https://gongmuwon.gosi.kr/",
    applicationUrl: "https://gongmuwon.gosi.kr/",
    trustLevel: "official-notice",
  },
} satisfies Record<string, CatalogSource>;

const atKst = (date: string, time = "00:00") => `${date}T${time.length === 5 ? `${time}:00` : time}+09:00`;

const dateEvent = (
  id: string,
  type: ExamEventType,
  title: string,
  startDate: string,
  endDate?: string,
  groupKey?: string,
): EventSeed => ({
  id,
  type,
  title,
  startAt: atKst(startDate),
  endAt: endDate ? atKst(endDate) : undefined,
  timePrecision: "date-only",
  groupKey,
});

const exactEvent = (
  id: string,
  type: ExamEventType,
  title: string,
  startDate: string,
  startTime: string,
  endDate?: string,
  endTime?: string,
  groupKey?: string,
): EventSeed => ({
  id,
  type,
  title,
  startAt: atKst(startDate, startTime),
  endAt: endDate && endTime ? atKst(endDate, endTime) : undefined,
  timePrecision: "exact",
  groupKey,
});

type SeedOptions = Partial<Omit<ExamSeed, "id" | "name" | "category" | "source">>;

function seed(id: string, name: string, category: string, source: CatalogSource, options: SeedOptions = {}): ExamSeed {
  return {
    organizer: source.name,
    goals: ["취업", "이직", "자기계발"],
    description: `${name}의 접수와 시험 일정을 공식 시행기관 자료 기준으로 확인합니다.`,
    scheduleType: "round",
    timePrecision: "date-only",
    practical: false,
    eligibilityRestricted: false,
    duration: "medium",
    caution: "접수 전 응시자격, 시험장, 세부 시각을 공식 공고에서 다시 확인하세요.",
    events: [],
    ...options,
    id,
    name,
    category,
    source,
    aliases: options.aliases ?? [],
  };
}

const qnetTechnicalRound3: EventSeed[] = [
  exactEvent("r3-application", "application-open", "기사·산업기사 3회 원서접수", "2026-07-20", "10:00", "2026-07-23", "18:00", "qnet-tech-r3-application"),
  exactEvent("r3-vacancy", "application-open", "기사·산업기사 3회 빈자리접수", "2026-08-01", "10:00", "2026-08-02", "18:00", "qnet-tech-r3-vacancy"),
  dateEvent("r3-written", "exam", "기사·산업기사 3회 필기시험 기간", "2026-08-07", "2026-09-01", "qnet-tech-r3-written"),
  dateEvent("r3-written-result", "result", "기사·산업기사 3회 필기 합격자 발표", "2026-09-09", undefined, "qnet-tech-r3-written-result"),
  exactEvent("r3-practical-application-a", "application-open", "기사·산업기사 3회 실기 원서접수", "2026-09-21", "10:00", "2026-09-23", "18:00", "qnet-tech-r3-practical-application-a"),
  exactEvent("r3-practical-application-b", "application-open", "기사·산업기사 3회 실기 추가 접수일", "2026-09-28", "10:00", "2026-09-28", "18:00", "qnet-tech-r3-practical-application-b"),
  dateEvent("r3-practical", "exam", "기사·산업기사 3회 실기시험 기간", "2026-10-24", "2026-11-13", "qnet-tech-r3-practical"),
];

const qnetTechnicalSpecs = [
  ["information-engineer", "정보처리기사", "IT·데이터", ["정처기"], "소프트웨어 설계·개발과 데이터베이스 역량을 평가합니다."],
  ["industrial-safety-engineer", "산업안전기사", "안전·기술", ["산안기"], "산업 현장의 안전관리와 위험 예방 전문성을 평가합니다."],
  ["electric-engineer", "전기기사", "전기·기술", ["전기 기사"], "전기 설비의 설계·운용·안전관리 능력을 평가합니다."],
  ["construction-safety-engineer", "건설안전기사", "건설·안전", ["건안기"], "건설 현장의 재해 예방과 안전관리 역량을 평가합니다."],
  ["fire-electric-engineer", "소방설비기사(전기분야)", "소방·안전", ["소방전기기사", "소방설비기사 전기"], "소방 전기설비의 설계와 점검 역량을 평가합니다."],
  ["fire-mechanical-engineer", "소방설비기사(기계분야)", "소방·안전", ["소방기계기사", "소방설비기사 기계"], "소방 기계설비의 설계와 점검 역량을 평가합니다."],
  ["architecture-engineer", "건축기사", "건설·기술", ["건축 기사"], "건축 계획·시공·구조 관련 전문 역량을 평가합니다."],
  ["civil-engineer", "토목기사", "건설·기술", ["토목 기사"], "토목 시설의 계획·설계·시공 역량을 평가합니다."],
  ["general-machinery-engineer", "일반기계기사", "기계·기술", ["일반 기계 기사"], "기계 설계와 재료·제작 관련 전문 역량을 평가합니다."],
  ["electrical-construction-engineer", "전기공사기사", "전기·기술", ["전기 공사 기사"], "전기공사 시공과 관리 능력을 평가합니다."],
  ["electric-industrial-engineer", "전기산업기사", "전기·기술", ["전기 산업 기사"], "전기 설비 운용과 안전관리 실무 역량을 평가합니다."],
  ["hazardous-material-industrial", "위험물산업기사", "안전·화학", ["위험물 산업기사"], "위험물 취급과 저장·안전관리 역량을 평가합니다."],
  ["industrial-safety-industrial", "산업안전산업기사", "안전·기술", ["산안산기"], "산업 현장의 안전관리 실무 역량을 평가합니다."],
  ["information-industrial", "정보처리산업기사", "IT·데이터", ["정보처리 산업기사", "정처산기"], "정보시스템 개발과 운영 실무 역량을 평가합니다."],
  ["vocational-counselor-2", "직업상담사 2급", "상담·복지", ["직상사 2급"], "직업정보 제공과 진로·취업 상담 역량을 평가합니다."],
  ["social-survey-analyst-2", "사회조사분석사 2급", "조사·데이터", ["사조사 2급"], "사회조사 설계와 통계 분석 역량을 평가합니다."],
  ["air-environment-engineer", "대기환경기사", "환경·기술", ["대기 기사"], "대기오염 측정·관리와 방지기술 역량을 평가합니다."],
  ["water-environment-engineer", "수질환경기사", "환경·기술", ["수질 기사"], "수질오염 측정·관리와 방지기술 역량을 평가합니다."],
  ["forest-engineer", "산림기사", "환경·기술", ["산림 기사"], "산림자원 조성과 경영·보호 역량을 평가합니다."],
  ["energy-management-engineer", "에너지관리기사", "에너지·기술", ["에너지 기사"], "열에너지 설비의 효율적 운용과 관리 역량을 평가합니다."],
  ["gas-engineer", "가스기사", "안전·기술", ["가스 기사"], "가스 설비의 설계·운용과 안전관리 역량을 평가합니다."],
] as const;

const qnetTechnicalExams = qnetTechnicalSpecs.map(([id, name, category, aliases, description]) => seed(
  id,
  name,
  category,
  catalogSources.qnetTechnical,
  {
    aliases: [...aliases],
    description,
    goals: ["취업", "이직", "경력활용"],
    practical: true,
    eligibilityRestricted: true,
    duration: "long",
    timePrecision: "exact",
    events: qnetTechnicalRound3,
    caution: "종목별 응시자격과 시험일 배정은 Q-Net 종목 상세와 수험표가 최종 기준입니다.",
  },
));

const qnetRollingSpecs = [
  ["korean-cook", "한식조리기능사", ["한식 기능사"]],
  ["western-cook", "양식조리기능사", ["양식 기능사"]],
  ["chinese-cook", "중식조리기능사", ["중식 기능사"]],
  ["japanese-cook", "일식조리기능사", ["일식 기능사"]],
  ["confectioner", "제과기능사", ["제과 기능사"]],
  ["baker", "제빵기능사", ["제빵 기능사"]],
  ["forklift-operator", "지게차운전기능사", ["지게차 기능사"]],
  ["excavator-operator", "굴착기운전기능사", ["굴삭기 기능사", "굴착기 기능사"]],
  ["hair-beautician", "미용사(일반)", ["헤어 미용사"]],
  ["skin-beautician", "미용사(피부)", ["피부 미용사"]],
  ["nail-beautician", "미용사(네일)", ["네일 미용사"]],
  ["makeup-beautician", "미용사(메이크업)", ["메이크업 미용사"]],
] as const;

const qnetRollingExams = qnetRollingSpecs.map(([id, name, aliases]) => seed(id, name, "생활·기술", catalogSources.qnetTechnical, {
  aliases: [...aliases],
  goals: ["취업", "재취업", "창업", "자기계발"],
  description: `${name}은 Q-Net 상시검정에서 시험장별 개설 날짜를 선택하는 국가기술자격입니다.`,
  scheduleType: "rolling",
  practical: true,
  duration: "short",
  events: [],
  caution: "상시검정은 지역과 시험장마다 접수 가능한 날짜가 달라 공식 접수 화면에서 직접 선택해야 합니다.",
}));

const professionalEvents: Record<string, EventSeed[]> = {
  "logistics-manager": [
    dateEvent("vacancy", "application-open", "물류관리사 빈자리접수", "2026-07-16", "2026-07-17"),
    dateEvent("exam", "exam", "물류관리사 시험", "2026-07-25"),
  ],
  "loss-adjuster": [
    dateEvent("second-application", "application-open", "손해평가사 2차 원서접수", "2026-07-20", "2026-07-24"),
    dateEvent("second-vacancy", "application-open", "손해평가사 2차 빈자리접수", "2026-08-20", "2026-08-21"),
    dateEvent("second-exam", "exam", "손해평가사 2차 시험", "2026-08-29"),
  ],
  "youth-counselor": [
    dateEvent("first-application", "application-open", "청소년상담사 1차 원서접수", "2026-07-20", "2026-07-24"),
    dateEvent("first-vacancy", "application-open", "청소년상담사 1차 빈자리접수", "2026-09-03", "2026-09-04"),
    dateEvent("first-exam", "exam", "청소년상담사 1차 시험", "2026-09-12"),
    dateEvent("second-application", "application-open", "청소년상담사 2차 원서접수", "2026-11-02", "2026-11-06"),
    dateEvent("second-exam", "exam", "청소년상담사 2차 시험 기간", "2026-11-30", "2026-12-05"),
  ],
  "fire-facility-manager": [
    dateEvent("second-application", "application-open", "소방시설관리사 2차 원서접수", "2026-07-27", "2026-07-31"),
    dateEvent("second-vacancy", "application-open", "소방시설관리사 2차 빈자리접수", "2026-08-27", "2026-08-28"),
    dateEvent("second-exam", "exam", "소방시설관리사 2차 시험", "2026-09-05"),
  ],
  "administrative-agent": [
    dateEvent("second-application", "application-open", "행정사 2차 원서접수", "2026-07-27", "2026-07-31"),
    dateEvent("second-exam", "exam", "행정사 2차 시험", "2026-10-03"),
  ],
  "korean-teaching": [
    dateEvent("first-vacancy", "application-open", "한국어교육능력검정 1차 빈자리접수", "2026-07-30", "2026-07-31"),
    dateEvent("second-application", "application-open", "한국어교육능력검정 2차 원서접수", "2026-10-19", "2026-10-23"),
    dateEvent("second-exam", "exam", "한국어교육능력검정 2차 시험", "2026-11-07"),
  ],
  "seafood-quality-manager": [
    dateEvent("second-application", "application-open", "수산물품질관리사 2차 원서접수", "2026-08-10", "2026-08-14", "qnet-pro-seafood-home-application"),
    dateEvent("second-vacancy", "application-open", "수산물품질관리사 2차 빈자리접수", "2026-09-10", "2026-09-11", "qnet-pro-seafood-home-vacancy"),
    dateEvent("second-exam", "exam", "수산물품질관리사 2차 시험", "2026-09-19", undefined, "qnet-pro-seafood-home-exam"),
  ],
  "housing-manager": [
    dateEvent("second-application", "application-open", "주택관리사보 2차 원서접수", "2026-08-10", "2026-08-14", "qnet-pro-seafood-home-application"),
    dateEvent("second-vacancy", "application-open", "주택관리사보 2차 빈자리접수", "2026-09-10", "2026-09-11", "qnet-pro-seafood-home-vacancy"),
    dateEvent("second-exam", "exam", "주택관리사보 2차 시험", "2026-09-19", undefined, "qnet-pro-seafood-home-exam"),
  ],
  "industrial-safety-instructor": [dateEvent("third-exam", "exam", "산업안전지도사 3차 시험 기간", "2026-08-12", "2026-08-15", "qnet-pro-safety-instructor-third")],
  "industrial-health-instructor": [dateEvent("third-exam", "exam", "산업보건지도사 3차 시험 기간", "2026-08-12", "2026-08-15", "qnet-pro-safety-instructor-third")],
  "tally-clerk": [dateEvent("second-exam", "exam", "검수사 2차 시험", "2026-08-22", undefined, "qnet-pro-port-second")],
  surveyor: [dateEvent("second-exam", "exam", "검량사 2차 시험", "2026-08-22", undefined, "qnet-pro-port-second")],
  appraiser: [dateEvent("second-exam", "exam", "감정사 2차 시험", "2026-08-22", undefined, "qnet-pro-port-second")],
  "youth-instructor": [
    dateEvent("first-vacancy", "application-open", "청소년지도사 1차 빈자리접수", "2026-08-13", "2026-08-14"),
    dateEvent("first-exam", "exam", "청소년지도사 1차 시험", "2026-08-22"),
    dateEvent("second-application", "application-open", "청소년지도사 2차 원서접수", "2026-11-16", "2026-11-20"),
    dateEvent("second-exam", "exam", "청소년지도사 2차 시험 기간", "2026-12-07", "2026-12-12"),
  ],
  "tour-interpreter": [
    dateEvent("first-exam", "exam", "관광통역안내사 1차 시험", "2026-09-05"),
    dateEvent("second-exam", "exam", "관광통역안내사 2차 시험 기간", "2026-11-14", "2026-11-15"),
  ],
  "labor-attorney": [
    dateEvent("second-exam", "exam", "공인노무사 2차 시험 기간", "2026-08-29", "2026-08-30"),
    dateEvent("third-exam", "exam", "공인노무사 3차 시험", "2026-11-27"),
  ],
  "security-instructor": [
    dateEvent("application", "application-open", "경비지도사 원서접수", "2026-09-14", "2026-09-18", "qnet-pro-travel-security-application"),
    dateEvent("vacancy", "application-open", "경비지도사 빈자리접수", "2026-11-12", "2026-11-13"),
    dateEvent("exam", "exam", "경비지도사 시험", "2026-11-21"),
  ],
  "domestic-tour-guide": [
    dateEvent("application", "application-open", "국내여행안내사 원서접수", "2026-09-14", "2026-09-18", "qnet-pro-travel-security-application"),
    dateEvent("vacancy", "application-open", "국내여행안내사 빈자리접수", "2026-10-29", "2026-10-30", "qnet-pro-travel-hotel-vacancy"),
    dateEvent("exam", "exam", "국내여행안내사 시험", "2026-11-07", undefined, "qnet-pro-travel-hotel-exam"),
  ],
  "hotel-manager": [
    dateEvent("application", "application-open", "호텔관리사 원서접수", "2026-09-14", "2026-09-18", "qnet-pro-travel-security-application"),
    dateEvent("vacancy", "application-open", "호텔관리사 빈자리접수", "2026-10-29", "2026-10-30", "qnet-pro-travel-hotel-vacancy"),
    dateEvent("exam", "exam", "호텔관리사 시험", "2026-11-07", undefined, "qnet-pro-travel-hotel-exam"),
  ],
  "hotel-service": [
    dateEvent("application", "application-open", "호텔서비스사 원서접수", "2026-09-14", "2026-09-18", "qnet-pro-travel-security-application"),
    dateEvent("vacancy", "application-open", "호텔서비스사 빈자리접수", "2026-10-29", "2026-10-30", "qnet-pro-travel-hotel-vacancy"),
    dateEvent("exam", "exam", "호텔서비스사 시험", "2026-11-07", undefined, "qnet-pro-travel-hotel-exam"),
  ],
  "hotel-operator": [
    dateEvent("application", "application-open", "호텔경영사 원서접수", "2026-09-14", "2026-09-18", "qnet-pro-travel-security-application"),
    dateEvent("vacancy", "application-open", "호텔경영사 빈자리접수", "2026-10-29", "2026-10-30", "qnet-pro-travel-hotel-vacancy"),
    dateEvent("exam", "exam", "호텔경영사 시험", "2026-11-07", undefined, "qnet-pro-travel-hotel-exam"),
  ],
  curator: [
    dateEvent("application", "application-open", "박물관 및 미술관 준학예사 원서접수", "2026-10-12", "2026-10-16"),
    dateEvent("exam", "exam", "박물관 및 미술관 준학예사 시험", "2026-11-14"),
  ],
  "tax-accountant": [dateEvent("second-exam", "exam", "세무사 2차 시험", "2026-07-18")],
  "patent-attorney": [dateEvent("second-exam", "exam", "변리사 2차 시험 기간", "2026-07-31", "2026-08-01")],
  "real-estate-agent": [
    dateEvent("application", "application-open", "공인중개사 원서접수", "2026-08-03", "2026-08-07"),
    dateEvent("vacancy", "application-open", "공인중개사 빈자리접수", "2026-10-01", "2026-10-02"),
    dateEvent("exam", "exam", "공인중개사 시험", "2026-10-31"),
  ],
};

const professionalSpecs = [
  ["logistics-manager", "물류관리사", "유통·물류", ["물류 관리사"]],
  ["loss-adjuster", "손해평가사", "보험·농업", ["손해 평가사"]],
  ["youth-counselor", "청소년상담사", "상담·복지", ["청상사"]],
  ["fire-facility-manager", "소방시설관리사", "소방·안전", ["소방 관리사"]],
  ["administrative-agent", "행정사", "법률·행정", ["일반행정사"]],
  ["korean-teaching", "한국어교육능력검정시험", "교육·언어", ["한국어교원 시험", "한국어 교육 능력 검정"]],
  ["seafood-quality-manager", "수산물품질관리사", "식품·품질", ["수산물 품질 관리사"]],
  ["housing-manager", "주택관리사보", "부동산·관리", ["주택 관리사"]],
  ["industrial-safety-instructor", "산업안전지도사", "안전·기술", ["안전 지도사"]],
  ["industrial-health-instructor", "산업보건지도사", "안전·보건", ["보건 지도사"]],
  ["tally-clerk", "검수사", "항만·물류", ["항만 검수사"]],
  ["surveyor", "검량사", "항만·물류", ["항만 검량사"]],
  ["appraiser", "감정사", "항만·물류", ["항만 감정사"]],
  ["youth-instructor", "청소년지도사", "교육·복지", ["청지사"]],
  ["tour-interpreter", "관광통역안내사", "관광·언어", ["관광 통역 안내사"]],
  ["labor-attorney", "공인노무사", "노무·법률", ["노무사"]],
  ["security-instructor", "경비지도사", "보안·안전", ["일반경비지도사"]],
  ["domestic-tour-guide", "국내여행안내사", "관광·서비스", ["국내 여행 안내사"]],
  ["hotel-manager", "호텔관리사", "관광·서비스", ["호텔 관리사"]],
  ["hotel-service", "호텔서비스사", "관광·서비스", ["호텔 서비스사"]],
  ["hotel-operator", "호텔경영사", "관광·경영", ["호텔 경영사"]],
  ["curator", "박물관 및 미술관 준학예사", "문화·예술", ["준학예사", "학예사"]],
  ["tax-accountant", "세무사", "회계·세무", ["CTA"]],
  ["patent-attorney", "변리사", "법률·기술", ["특허 변리사"]],
  ["real-estate-agent", "공인중개사", "부동산·법률", ["공인 중개사"]],
  ["social-worker-1", "사회복지사 1급", "상담·복지", ["사회 복지사 1급"]],
] as const;

const qnetProfessionalExams = professionalSpecs.map(([id, name, category, aliases]) => seed(id, name, category, catalogSources.qnetProfessional, {
  aliases: [...aliases],
  goals: ["취업", "이직", "재취업", "경력활용"],
  duration: ["tax-accountant", "patent-attorney", "labor-attorney"].includes(id) ? "long" : "medium",
  eligibilityRestricted: ["youth-counselor", "industrial-safety-instructor", "industrial-health-instructor", "labor-attorney", "social-worker-1"].includes(id),
  practical: ["loss-adjuster", "fire-facility-manager", "administrative-agent", "korean-teaching", "industrial-safety-instructor", "industrial-health-instructor", "youth-instructor", "tour-interpreter", "labor-attorney"].includes(id),
  events: professionalEvents[id] ?? [],
}));

const historyEvents: EventSeed[] = [
  exactEvent("79-cancel", "application-open", "제79회 취소좌석 접수", "2026-07-21", "10:00", "2026-07-24", "17:00"),
  exactEvent("79-ticket", "ticket", "제79회 수험표 출력", "2026-08-04", "10:00"),
  exactEvent("79-exam", "exam", "제79회 시험", "2026-08-09", "10:00", "2026-08-09", "11:50"),
  exactEvent("79-result", "result", "제79회 결과 발표", "2026-08-21", "10:00"),
  exactEvent("80-application", "application-open", "제80회 정기접수", "2026-09-15", "10:00", "2026-09-22", "17:00"),
  exactEvent("80-cancel", "application-open", "제80회 취소좌석 접수", "2026-09-29", "10:00", "2026-10-02", "17:00"),
  exactEvent("80-ticket", "ticket", "제80회 수험표 출력", "2026-10-13", "10:00"),
  exactEvent("80-exam", "exam", "제80회 시험", "2026-10-17", "10:00"),
  exactEvent("80-result", "result", "제80회 결과 발표", "2026-10-30", "10:00"),
  exactEvent("81-application", "application-open", "제81회 정기접수", "2026-11-03", "10:00", "2026-11-10", "17:00"),
  exactEvent("81-cancel", "application-open", "제81회 취소좌석 접수", "2026-11-11", "13:00", "2026-11-13", "17:00"),
  exactEvent("81-ticket", "ticket", "제81회 수험표 출력", "2026-11-24", "10:00"),
  exactEvent("81-exam", "exam", "제81회 시험", "2026-11-28", "10:00"),
  exactEvent("81-result", "result", "제81회 결과 발표", "2026-12-11", "10:00"),
];

const historyExam = seed("history-advanced", "한국사능력검정시험", "한국사·공공", catalogSources.history, {
  shortName: "한능검",
  aliases: ["한능검 심화", "한능검 기본", "한국사 시험", "한국사능력검정시험 심화"],
  goals: ["취업", "공무원", "자기계발"],
  description: "공공기관·채용·진학 활용 범위가 넓은 국사편찬위원회 인증시험입니다.",
  duration: "short",
  timePrecision: "exact",
  feeLabel: "심화 27,000원 · 기본 22,000원",
  caution: "회차별 시행 등급과 지역별 접수 시작 시각을 공식 공고에서 확인하세요.",
  events: historyEvents,
  preparationVersion: "history-v1",
  preparation: [
    { id: "history-ticket", preserveId: true, category: "ticket", label: "수험표", detail: "본인 식별이 가능한 사진이 인쇄된 수험표", required: true },
    { id: "history-id", preserveId: true, category: "identity", label: "신분증", detail: "공식 응시요강에서 인정하는 신분증", required: true },
    { id: "history-marker", preserveId: true, category: "writing", label: "컴퓨터용 수성사인펜", detail: "답안 작성용 필기구", required: true },
    { id: "history-tape", preserveId: true, category: "writing", label: "수정테이프", detail: "답안 수정이 필요할 때 사용", required: false },
  ],
});

const kdataEvents: Record<string, EventSeed[]> = {
  "bigdata-analyst": [
    exactEvent("13-written-application", "application-open", "제13회 필기 원서접수", "2026-08-03", "10:00", "2026-08-07", "17:59:59"),
    exactEvent("13-ticket", "ticket", "제13회 필기 수험표 발급", "2026-08-21", "10:00"),
    exactEvent("13-written", "exam", "제13회 필기시험", "2026-09-05", "10:00"),
    exactEvent("13-written-result", "result", "제13회 필기 결과 발표", "2026-09-23", "10:00"),
    exactEvent("13-practical-application", "application-open", "제13회 실기 원서접수", "2026-10-26", "10:00", "2026-10-30", "17:59:59"),
    exactEvent("13-practical", "exam", "제13회 실기시험", "2026-11-28", "10:00"),
    exactEvent("13-final-result", "result", "제13회 최종 결과 발표", "2026-12-18", "10:00"),
  ],
  adp: [
    exactEvent("37-practical-application", "application-open", "제37회 실기 원서접수", "2026-09-14", "10:00", "2026-09-18", "17:59:59"),
    exactEvent("37-practical", "exam", "제37회 실기시험", "2026-10-17", "10:00"),
    exactEvent("37-result", "result", "제37회 실기 결과 발표", "2026-11-13", "10:00"),
  ],
  adsp: [
    exactEvent("50-exam", "exam", "제50회 시험", "2026-08-08", "10:00"),
    exactEvent("50-result", "result", "제50회 결과 발표", "2026-08-28", "10:00"),
    exactEvent("51-application", "application-open", "제51회 원서접수", "2026-09-28", "10:00", "2026-10-02", "17:59:59"),
    exactEvent("51-exam", "exam", "제51회 시험", "2026-10-31", "10:00"),
    exactEvent("51-result", "result", "제51회 결과 발표", "2026-11-20", "10:00"),
  ],
  sqlp: [
    exactEvent("55-application", "application-open", "제55회 원서접수", "2026-07-20", "10:00", "2026-07-24", "17:59:59", "kdata-sql-application"),
    exactEvent("55-exam", "exam", "제55회 시험", "2026-08-22", "10:00", undefined, undefined, "kdata-sql-exam"),
    exactEvent("55-result", "result", "제55회 결과 발표", "2026-09-18", "10:00"),
  ],
  sqld: [
    exactEvent("62-application", "application-open", "제62회 원서접수", "2026-07-20", "10:00", "2026-07-24", "17:59:59", "kdata-sql-application"),
    exactEvent("62-exam", "exam", "제62회 시험", "2026-08-22", "10:00", undefined, undefined, "kdata-sql-exam"),
    exactEvent("62-result", "result", "제62회 결과 발표", "2026-09-11", "10:00"),
    exactEvent("63-application", "application-open", "제63회 원서접수", "2026-10-12", "10:00", "2026-10-16", "17:59:59"),
    exactEvent("63-exam", "exam", "제63회 시험", "2026-11-14", "10:00"),
    exactEvent("63-result", "result", "제63회 결과 발표", "2026-12-04", "10:00"),
  ],
  dap: [
    exactEvent("66-application", "application-open", "제66회 원서접수", "2026-08-14", "10:00", "2026-08-21", "17:59:59", "kdata-architecture-application"),
    exactEvent("66-exam", "exam", "제66회 시험", "2026-09-19", "10:00", undefined, undefined, "kdata-architecture-exam"),
    exactEvent("66-result", "result", "제66회 결과 발표", "2026-10-16", "10:00"),
  ],
  dasp: [
    exactEvent("61-application", "application-open", "제61회 원서접수", "2026-08-14", "10:00", "2026-08-21", "17:59:59", "kdata-architecture-application"),
    exactEvent("61-exam", "exam", "제61회 시험", "2026-09-19", "10:00", undefined, undefined, "kdata-architecture-exam"),
    exactEvent("61-result", "result", "제61회 결과 발표", "2026-10-08", "10:00"),
  ],
};

const kdataSpecs = [
  ["bigdata-analyst", "빅데이터분석기사", ["빅분기"]],
  ["adp", "데이터분석전문가(ADP)", ["ADP", "데이터 분석 전문가"]],
  ["adsp", "데이터분석준전문가(ADsP)", ["ADsP", "데이터 분석 준전문가"]],
  ["sqlp", "SQL전문가(SQLP)", ["SQLP", "SQL 전문가"]],
  ["sqld", "SQL개발자(SQLD)", ["SQLD", "SQL 개발자"]],
  ["dap", "데이터아키텍처전문가(DAP)", ["DAP", "데이터 아키텍처 전문가"]],
  ["dasp", "데이터아키텍처준전문가(DAsP)", ["DAsP", "데이터 아키텍처 준전문가"]],
] as const;

const kdataExams = kdataSpecs.map(([id, name, aliases]) => seed(id, name, "IT·데이터", catalogSources.kdata, {
  aliases: [...aliases],
  goals: ["취업", "이직", "경력활용"],
  duration: id === "adp" || id === "dap" ? "long" : "short",
  practical: id === "bigdata-analyst" || id === "adp",
  eligibilityRestricted: id === "bigdata-analyst",
  timePrecision: "exact",
  events: kdataEvents[id] ?? [],
}));

const kpcShared = {
  gtq: [
    dateEvent("application", "application-open", "GTQ 정기시험 원서접수", "2026-07-22", "2026-07-29", "kpc-gtq-application"),
    dateEvent("exam", "exam", "GTQ 정기시험", "2026-08-22", undefined, "kpc-gtq-exam"),
  ],
  september: [
    dateEvent("application", "application-open", "9월 정기시험 원서접수", "2026-08-06", "2026-08-12", "kpc-september-application"),
    dateEvent("exam", "exam", "9월 정기시험", "2026-09-12", undefined, "kpc-september-exam"),
  ],
};

const kpcExams = [
  seed("itq", "ITQ 정보기술자격", "사무·IT", catalogSources.kpc, {
    aliases: ["ITQ", "아이티큐", "ITQ 한글", "ITQ 엑셀"], duration: "short", practical: true,
    events: [
      dateEvent("special-application", "application-open", "ITQ 특별시험 원서접수", "2026-07-16", "2026-07-22"),
      dateEvent("special-exam", "exam", "ITQ 특별시험", "2026-08-23"),
      ...kpcShared.september,
    ],
  }),
  seed("gtq", "GTQ 그래픽기술자격", "디자인·IT", catalogSources.kpc, { aliases: ["GTQ", "포토샵 자격증"], duration: "short", practical: true, events: kpcShared.gtq }),
  seed("gtqi", "GTQi 그래픽기술자격", "디자인·IT", catalogSources.kpc, { aliases: ["GTQi", "일러스트 자격증"], duration: "short", practical: true, events: kpcShared.gtq }),
  seed("gtqid", "GTQid 그래픽기술자격", "디자인·IT", catalogSources.kpc, { aliases: ["GTQid", "인디자인 자격증"], duration: "short", practical: true, events: kpcShared.gtq }),
  seed("erp-manager", "ERP정보관리사", "사무·경영", catalogSources.kpc, {
    aliases: ["ERP 정보관리사", "ERP 회계", "ERP 인사"], practical: true,
    events: [dateEvent("application", "application-open", "ERP 정기시험 원서접수", "2026-08-19", "2026-08-26"), dateEvent("exam", "exam", "ERP 정기시험", "2026-09-19")],
  }),
  seed("aibt", "AIBT 인공지능 비즈니스 활용능력", "AI·업무", catalogSources.kpc, { aliases: ["AIBT"], duration: "short", events: kpcShared.september }),
  seed("cat", "CAT 캐드실무능력평가", "설계·IT", catalogSources.kpc, { aliases: ["CAT", "캐드 자격증"], duration: "short", practical: true, events: kpcShared.september }),
  seed("sw-coding", "SW코딩자격", "IT·코딩", catalogSources.kpc, { aliases: ["SW 코딩 자격", "코딩 자격증"], duration: "short", practical: true, events: kpcShared.september }),
  seed("smat", "SMAT 서비스경영자격", "서비스·경영", catalogSources.kpc, { aliases: ["SMAT"], duration: "short", events: [dateEvent("exam", "exam", "SMAT 정기시험", "2026-08-08")] }),
  seed("ai-pot", "AI-POT 인공지능 활용능력", "AI·업무", catalogSources.kpc, { aliases: ["AI-POT", "에이아이팟"], duration: "short", events: [dateEvent("exam", "exam", "AI-POT 정기시험", "2026-08-08")] }),
];

const atEvents: EventSeed[] = [
  dateEvent("91-exam", "exam", "제91회 시험", "2026-07-18", undefined, "at-91-exam"),
  dateEvent("91-result", "result", "제91회 합격자 발표", "2026-07-24", undefined, "at-91-result"),
  dateEvent("92-application", "application-open", "제92회 원서접수", "2026-08-06", "2026-08-13", "at-92-application"),
  dateEvent("92-exam", "exam", "제92회 시험", "2026-08-22", undefined, "at-92-exam"),
  dateEvent("92-result", "result", "제92회 합격자 발표", "2026-08-28", undefined, "at-92-result"),
  dateEvent("93-application", "application-open", "제93회 원서접수", "2026-10-01", "2026-10-08", "at-93-application"),
  dateEvent("93-exam", "exam", "제93회 시험", "2026-10-17", undefined, "at-93-exam"),
  dateEvent("93-result", "result", "제93회 합격자 발표", "2026-10-23", undefined, "at-93-result"),
  dateEvent("94-application", "application-open", "제94회 원서접수", "2026-11-05", "2026-11-12", "at-94-application"),
  dateEvent("94-exam", "exam", "제94회 시험", "2026-11-21", undefined, "at-94-exam"),
  dateEvent("94-result", "result", "제94회 합격자 발표", "2026-11-27", undefined, "at-94-result"),
  dateEvent("95-application", "application-open", "제95회 원서접수", "2026-12-03", "2026-12-10", "at-95-application"),
  dateEvent("95-exam", "exam", "제95회 시험", "2026-12-19", undefined, "at-95-exam"),
  dateEvent("95-result", "result", "제95회 합격자 발표", "2026-12-25", undefined, "at-95-result"),
];

const atExams = [
  ["fat-1", "FAT 1급", ["FAT1급", "회계실무 1급"]],
  ["fat-2", "FAT 2급", ["FAT2급", "회계실무 2급"]],
  ["tat-1", "TAT 1급", ["TAT1급", "세무실무 1급"]],
  ["tat-2", "TAT 2급", ["TAT2급", "세무실무 2급"]],
].map(([id, name, aliases]) => seed(id as string, name as string, "회계·세무", catalogSources.at, {
  aliases: aliases as string[],
  goals: ["취업", "이직", "재취업"],
  duration: "short",
  practical: true,
  events: atEvents,
}));

const businessVisualizationEvents = [
  dateEvent("2026-practical-2", "exam", "비즈니스정보시각화 실기시험", "2026-08-01"),
  dateEvent("2026-written-3", "exam", "비즈니스정보시각화 필기시험", "2026-10-03"),
  dateEvent("2026-practical-3", "exam", "비즈니스정보시각화 실기시험", "2026-11-07"),
];

const korchamRollingSpecs = [
  ["computer-specialist-1", "컴퓨터활용능력 1급", ["컴활 1급", "컴활1급"], "사무·IT"],
  ["computer-specialist-2", "컴퓨터활용능력 2급", ["컴활 2급", "컴활2급"], "사무·IT"],
  ["word-processor", "워드프로세서", ["워드 자격증"], "사무·IT"],
  ["computer-accounting-2", "전산회계운용사 2급", ["전산회계 운용사 2급"], "회계·사무"],
  ["computer-accounting-3", "전산회계운용사 3급", ["전산회계 운용사 3급"], "회계·사무"],
  ["trade-english-1", "무역영어 1급", ["무역 영어 1급"], "무역·언어"],
  ["trade-english-2", "무역영어 2급", ["무역 영어 2급"], "무역·언어"],
  ["trade-english-3", "무역영어 3급", ["무역 영어 3급"], "무역·언어"],
] as const;

const korchamRollingExams = korchamRollingSpecs.map(([id, name, aliases, category]) => seed(id, name, category, catalogSources.korcham, {
  aliases: [...aliases],
  scheduleType: "rolling",
  duration: "short",
  practical: id.startsWith("computer-") || id === "word-processor",
  events: [],
  caution: "상시검정은 시험장별 개설 날짜와 잔여 좌석을 공식 접수 화면에서 선택하세요.",
}));

const korchamExams = [
  ...korchamRollingExams,
  seed("business-visualization", "비즈니스정보시각화능력", "사무·데이터", catalogSources.korcham, {
    aliases: ["비즈니스 정보 시각화", "BI 자격"], practical: true, events: businessVisualizationEvents,
  }),
  seed("cosmetic-formulation-manager", "맞춤형화장품조제관리사", "뷰티·화학", catalogSources.korcham, {
    aliases: ["맞춤형 화장품 조제 관리사"],
    events: [
      dateEvent("12-application", "application-open", "제12회 원서접수", "2026-08-27", "2026-09-02"),
      dateEvent("12-exam", "exam", "제12회 시험", "2026-09-19"),
      dateEvent("12-result", "result", "제12회 합격자 발표", "2026-10-19"),
    ],
    caution: "시행 공고의 응시지역과 입실 시각을 접수 전에 확인하세요.",
  }),
  seed("distribution-manager-2", "유통관리사 2급", "유통·물류", catalogSources.korcham, { aliases: ["유통 관리사 2급"], events: [] }),
  seed("distribution-manager-3", "유통관리사 3급", "유통·물류", catalogSources.korcham, { aliases: ["유통 관리사 3급"], duration: "short", events: [] }),
  seed("secretary-1", "비서 1급", "사무·경영", catalogSources.korcham, { aliases: ["비서자격 1급"], practical: true, events: [] }),
  seed("secretary-2", "비서 2급", "사무·경영", catalogSources.korcham, { aliases: ["비서자격 2급"], practical: true, duration: "short", events: [] }),
  seed("computer-accounting-1", "전산회계운용사 1급", "회계·사무", catalogSources.korcham, { aliases: ["전산회계 운용사 1급"], practical: true, events: [] }),
];

const civilExam = seed("national-civil-service-9", "국가직 9급 공개경쟁채용", "공무원", catalogSources.gosi, {
  shortName: "국가직 9급",
  aliases: ["9급 공무원", "국가공무원 9급", "국가직 9급"],
  goals: ["공무원", "취업", "재취업"],
  description: "인사혁신처가 시행하는 국가공무원 9급 공개경쟁채용 시험입니다.",
  scheduleType: "announcement",
  duration: "long",
  eligibilityRestricted: true,
  events: [],
  caution: "직렬·지역·가산점·단계별 일정은 해당 연도 채용 공고가 최종 기준입니다.",
});

// 2026-07-20 확충: Q-Net 국가자격 종목별 상세정보(q-net.or.kr/crf005.do?jmCd=…)로 실재를 교차확인하고,
// 기존 카탈로그 100종목과 이름이 겹치지 않는(중복 아님) 인기 국가기술자격만 추가한다.
// 확인한 jmCd — 전기기능사 7780 · 자동차정비기능사 6281 · 용접기능사 6222 · 조경기사 1370 · 품질경영기사 1500,
//   정보처리기능사·컴퓨터그래픽스운용기능사(2026 공개문제)는 Q-Net 종목 등록으로 확인.
// 접수 일정은 종목별로 다르고 공식 공고 확인이 원칙이라 events는 비워 둔다(확인 못 한 일정을 지어내지 않는다).
const verifiedAdditions2026: ExamSeed[] = [
  seed("information-processing-craftsman", "정보처리기능사", "IT·데이터", catalogSources.qnetTechnical, {
    aliases: ["정보처리 기능사", "정처기능사"], practical: true, events: [],
    description: "정보시스템 운영과 자료 처리 기초 실무 역량을 평가하는 국가기술자격(기능사)입니다.",
  }),
  seed("electric-craftsman", "전기기능사", "전기·기술", catalogSources.qnetTechnical, {
    aliases: ["전기 기능사"], practical: true, events: [],
    description: "전기 설비의 시공·점검 기초 실무 역량을 평가하는 국가기술자격(기능사)입니다.",
  }),
  seed("auto-repair-craftsman", "자동차정비기능사", "기계·기술", catalogSources.qnetTechnical, {
    aliases: ["자동차 정비 기능사", "자동차정비"], practical: true, events: [],
    description: "자동차 점검·정비 기초 실무 역량을 평가하는 국가기술자격(기능사)입니다.",
  }),
  seed("welding-craftsman", "용접기능사", "기계·기술", catalogSources.qnetTechnical, {
    aliases: ["용접 기능사"], practical: true, events: [],
    description: "각종 용접 작업의 기초 실무 역량을 평가하는 국가기술자격(기능사)입니다.",
  }),
  seed("computer-graphics-craftsman", "컴퓨터그래픽스운용기능사", "디자인·IT", catalogSources.qnetTechnical, {
    aliases: ["컴퓨터그래픽스 운용 기능사", "컴그운용기능사", "컴그"], practical: true, events: [],
    description: "그래픽 소프트웨어를 활용한 시각 디자인 기초 실무 역량을 평가하는 국가기술자격(기능사)입니다.",
  }),
  seed("landscape-engineer", "조경기사", "환경·기술", catalogSources.qnetTechnical, {
    aliases: ["조경 기사"], events: [],
    description: "조경 계획·설계·시공·관리 역량을 평가하는 국가기술자격(기사)입니다.",
  }),
  seed("quality-management-engineer", "품질경영기사", "품질·경영", catalogSources.qnetTechnical, {
    aliases: ["품질경영 기사", "품경기"], events: [],
    description: "품질 계획·관리·개선과 통계적 품질관리 역량을 평가하는 국가기술자격(기사)입니다.",
  }),
];

export const examSeeds: ExamSeed[] = [
  historyExam,
  ...qnetTechnicalExams,
  ...qnetRollingExams,
  ...qnetProfessionalExams,
  ...kdataExams,
  ...kpcExams,
  ...atExams,
  ...korchamExams,
  ...verifiedAdditions2026,
  civilExam,
];
