// 검색·추천·관심 저장·상세 준비물과 접근성의 핵심 사용자 흐름을 검증한다.
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("첫 화면에서 추천과 다음 행동이 짧은 스크롤 안에 보인다", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /지금 접수할 시험부터/ })).toBeVisible();
  await expect(page.getByRole("button", { name: "104개 시험 검색하기" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "곧 해야 할 일" })).toBeVisible();
});

test("홈 세 요약 버튼이 URL 상태와 바로 아래 실제 목록을 바꾼다", async ({ page }) => {
  await page.goto("/#home?filter=all");
  const summary = page.getByRole("group", { name: "홈 시험 목록 필터" });
  await expect(summary.getByRole("button")).toHaveCount(3);
  await expect(summary.getByRole("button", { name: /전체 시험 104개/ })).toHaveAttribute("aria-pressed", "true");

  await summary.getByRole("button", { name: /현재 접수/ }).click();
  await expect(page).toHaveURL(/#home\?filter=open$/);
  await expect(page.locator("#home-summary-results")).toBeFocused();
  const openCount = Number((await summary.getByRole("button", { name: /현재 접수/ }).innerText()).match(/\d+/)?.[0] ?? "0");
  // HomeScreen은 요약 목록을 최대 8개까지만 보여준다(slice(0, 8) + "N개 모두 보기"). 접수 종목이 8개를 넘으면
  // 목록은 8개로 캡되므로 카운트도 8로 상한을 둔다(데이터·날짜에 따라 접수 수가 8을 넘을 수 있음).
  await expect(page.locator(".summary-exam-list > button")).toHaveCount(Math.min(openCount, 8));

  await summary.getByRole("button", { name: /곧 시험/ }).click();
  await expect(page).toHaveURL(/#home\?filter=upcoming$/);
  await expect(page.getByRole("heading", { name: "14일 안에 시험이 있는 종목" })).toBeVisible();
  await page.reload();
  await expect(summary.getByRole("button", { name: /곧 시험/ })).toHaveAttribute("aria-pressed", "true");
});

test("공통 회차 그룹을 펼쳐 두 번째 시험을 고르고 홈 상태로 돌아온다", async ({ page }) => {
  await page.goto("/#home?filter=open");
  // 회차(세션) 이름·건수는 실제 시험 일정에 따라 매일 바뀌므로 하드코딩하지 않고
  // "외 N개 시험" 그룹 버튼을 동적으로 찾아 펼침 동작 자체를 검증한다.
  const groupButton = page.getByRole("button", { name: /외 \d+개 시험 · 눌러서 목록 보기/ }).first();
  const groupName = (await groupButton.getByText(/외 \d+개 시험 · 눌러서 목록 보기/).innerText()).trim();
  const groupedCount = Number(groupName.match(/외 (\d+)개 시험/)?.[1] ?? "0") + 1;
  expect(groupedCount).toBeGreaterThanOrEqual(2);
  await groupButton.click();
  await expect(groupButton).toHaveAttribute("aria-expanded", "true");
  const group = page.locator(".grouped-exams");
  await expect(group.getByRole("button")).toHaveCount(groupedCount);
  const secondName = (await group.getByRole("button").nth(1).locator("strong").innerText()).trim();
  await group.getByRole("button").nth(1).click();
  await expect(page.getByRole("heading", { name: secondName })).toBeVisible();
  await page.getByRole("button", { name: "← 시험 목록" }).click();
  await expect(page).toHaveURL(/#home\?filter=open$/);
  await expect(page.getByRole("button", { name: /현재 접수/ })).toHaveAttribute("aria-pressed", "true");
});

test("시험 검색 후 상세와 관심 저장을 완료한다", async ({ page }) => {
  await page.goto("/#find");
  await page.getByPlaceholder("시험명·별칭·기관·분야 검색").fill("한국사");
  await page.getByRole("button", { name: /한국사능력검정시험/ }).first().click();
  await expect(page.getByRole("heading", { name: "한국사능력검정시험" })).toBeVisible();
  await page.getByRole("button", { name: "☆ 관심 시험 저장하기" }).click();
  await expect(page.getByRole("button", { name: /관심 시험으로 저장됨/ })).toBeVisible();
  await page.getByRole("checkbox", { name: /^수험표/ }).check();
});

test("준비물 전체·진행률·기존 체크 migration과 새로고침 복원을 제공한다", async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("certbom-preparation-v1", JSON.stringify(["history-ticket"]));
  });
  await page.goto("/#exam/history-advanced?from=home&filter=open");
  await expect(page.getByLabel("준비물 4개 중 1개 완료")).toBeVisible();
  await expect(page.locator(".preparation-group")).toHaveCount(3);
  await expect(page.getByRole("checkbox", { name: /^수험표/ })).toBeChecked();
  for (const checkbox of await page.locator(".checklist input[type=checkbox]").all()) {
    if (!(await checkbox.isChecked())) await checkbox.check();
  }
  await expect(page.getByText("완료 4개 · 필수 미완료 0개")).toBeVisible();
  await page.reload();
  await expect(page.locator(".checklist input[type=checkbox]:checked")).toHaveCount(4);
  const stored = await page.evaluate(() => JSON.parse(window.localStorage.getItem("certbom-preparation-v2") ?? "[]"));
  expect(stored).toContain("history-advanced:history-v1:history-ticket");
});

test("출처 규정을 확인하지 못한 시험은 구체적인 일반 준비 체크리스트를 표시한다", async ({ page }) => {
  // 사이버국가고시센터(국가공무원 9급)는 출처 규정을 웹에서 확인하지 않아 일반 체크리스트로 안내한다.
  await page.goto("/#exam/national-civil-service-9?from=find");
  await expect(page.getByText("공식 세부 준비물은 확인 중이지만, 빈손으로 돌려보내지 않아요.")).toBeVisible();
  await expect(page.locator(".checklist label")).toHaveCount(6);
  await expect(page.getByText("일반 준비", { exact: true })).toHaveCount(6);
  await expect(page.getByRole("checkbox", { name: /^사진이 있는 신분증/ })).toBeVisible();
  await expect(page.getByRole("checkbox", { name: /^시험장·입실 마감/ })).toBeVisible();
});

test("Q-Net 시험은 웹에서 확인한 공식 준비물을 출처와 함께 표시한다", async ({ page }) => {
  await page.goto("/#exam/information-engineer?from=find");
  await expect(page.getByText("공식 세부 준비물은 확인 중이지만, 빈손으로 돌려보내지 않아요.")).toHaveCount(0);
  await expect(page.getByText("필수 준비물을 빠짐없이 확인하고 이 기기에 체크해 두세요.")).toBeVisible();
  await expect(page.getByRole("checkbox", { name: /^공단 인정 신분증/ })).toBeVisible();
  await expect(page.getByRole("checkbox", { name: /전자·통신기기 반입 금지/ })).toBeVisible();
  await expect(page.getByText("Q-Net 원서접수 유의사항", { exact: false }).first()).toBeVisible();
  // 공식 검증 항목(필수) + 입실·최종확인 일반 안내가 함께 있다.
  await expect(page.getByText("필수", { exact: true }).first()).toBeVisible();
  await expect(page.getByRole("checkbox", { name: /입실 마감/ })).toBeVisible();
});

test("독립 시험 달력에서 날짜별 공식 일정을 보고 상세 뒤 상태를 복원한다", async ({ page }) => {
  await page.goto("/#calendar?month=2026-07&date=2026-07-20&scope=all&event=all");
  await expect(page.getByRole("heading", { name: "시험 달력" })).toBeVisible();
  await expect(page.getByRole("group", { name: "2026년 7월 시험 일정" })).toBeVisible();
  await expect(page.getByRole("heading", { name: /7월 20일/ })).toBeVisible();
  const grouped = page.locator(".calendar-agenda-group").first();
  await expect(grouped).toContainText("21개 시험");
  await grouped.locator("summary").click();
  const firstExam = (await grouped.locator("button strong").first().innerText()).trim();
  await grouped.locator("button").first().click();
  await expect(page.getByRole("heading", { name: firstExam })).toBeVisible();
  await page.getByRole("button", { name: "← 시험 목록" }).click();
  await expect(page).toHaveURL(/#calendar\?month=2026-07&date=2026-07-20&scope=all&event=all$/);
});

test("태블릿 시험 달력은 달력과 날짜별 일정을 나란히 사용한다", async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto("/#calendar?month=2026-07&date=2026-07-20&scope=all&event=all");
  const calendar = await page.locator(".exam-calendar").boundingBox();
  const agenda = await page.locator(".calendar-agenda").boundingBox();
  expect(calendar).not.toBeNull();
  expect(agenda).not.toBeNull();
  expect(agenda?.x ?? 0).toBeGreaterThan((calendar?.x ?? 0) + (calendar?.width ?? 0) - 2);
});

test("ICS 파일은 일정 범위를 포함한 파일명으로 다운로드한다", async ({ page }) => {
  await page.goto("/#exam/history-advanced?from=find");
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "ICS 저장" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("history-advanced.ics");
});

test("추천 결과가 3개와 추가 7개로 나뉜다", async ({ page }) => {
  await page.goto("/#recommend");
  await page.getByRole("button", { name: "추천 결과 보기" }).click();
  await expect(page.getByRole("heading", { name: "먼저 볼 시험 3개" })).toBeVisible();
  await expect(page.locator(".recommend-card")).toHaveCount(3);
  await page.getByText("추가 후보 7개 보기").click();
  await expect(page.locator(".more-results button")).toHaveCount(7);
});

test("별칭 검색과 더 보기로 확장된 카탈로그를 탐색한다", async ({ page }) => {
  await page.goto("/#find");
  await expect(page.getByText("전체 시험").locator("..").getByText("104")).toBeVisible();
  await page.getByPlaceholder("시험명·별칭·기관·분야 검색").fill("정처기");
  await expect(page.getByRole("button", { name: /정보처리기사/ }).first()).toBeVisible();
  await page.getByPlaceholder("시험명·별칭·기관·분야 검색").fill("");
  await expect(page.locator(".exam-card")).toHaveCount(12);
  await page.getByRole("button", { name: /시험 12개 더 보기/ }).click();
  await expect(page.locator(".exam-card")).toHaveCount(24);
});

test("카드에 API 미연결 문구가 없고 현재 접수를 우선 표시한다", async ({ page }) => {
  await page.goto("/#find");
  await expect(page.locator("body")).not.toContainText("공식 API 연결 전");
  await expect(page.locator(".exam-card").first()).toContainText("지금 접수 중");
});

test("홈 화면에 중대한 자동 접근성 위반이 없다", async ({ page }) => {
  await page.goto("/");
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.filter((violation) => violation.impact === "critical" || violation.impact === "serious")).toEqual([]);
});

test("가로 스크롤이 생기지 않는다", async ({ page }) => {
  await page.goto("/");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(overflow).toBe(false);
});

test("패밀리 wordmark와 선형 SVG 하단 메뉴가 모바일 터치 크기를 지킨다", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".family-wordmark img")).toBeVisible();
  await expect(page.locator(".bottom-nav svg.family-icon")).toHaveCount(5);
  const touchHeights = await page.locator(".bottom-nav button").evaluateAll((buttons) => buttons.map((button) => button.getBoundingClientRect().height));
  expect(touchHeights.every((height) => height >= 48)).toBe(true);
});

test("설정에서 세 패밀리 앱과 게스트·지원·개인정보·현재 메타를 확인한다", async ({ page }) => {
  await page.goto("/#settings");
  await expect(page.locator("[data-family-app]")).toHaveCount(3);
  await expect(page.getByRole("link", { name: /문의와 지원/ })).toHaveAttribute("href", "https://robom.kr/support");
  await expect(page.getByRole("link", { name: /자격증봄 개인정보 처리방침/ })).toHaveAttribute("href", "https://robom.kr/privacy/certbom");
  await expect(page.getByText("0.8.3", { exact: true })).toBeVisible();
  await expect(page.getByRole("checkbox", { name: /익명 사용성 분석 허용/ })).not.toBeChecked();

  await page.getByRole("button", { name: /카카오 연결 준비 상태/ }).click();
  await expect(page.getByText(/카카오 로그인은 아직 연결되지 않았어요/)).toBeVisible();
});

test("스토어 출시 전이라 설치 유도 CTA는 노출하지 않는다", async ({ page }) => {
  await page.goto("/");
  // beforeinstallprompt는 계속 가로채지만(플러밍 유지) 사용자에게 설치 버튼을 띄우지 않는다.
  await page.evaluate(() => {
    const event = new Event("beforeinstallprompt", { cancelable: true });
    Object.assign(event, {
      prompt: () => Promise.resolve(),
      userChoice: Promise.resolve({ outcome: "accepted", platform: "web" }),
    });
    window.dispatchEvent(event);
  });
  await page.getByRole("button", { name: "설정" }).click();
  await expect(page.getByRole("button", { name: "이 기기에 자격증봄 설치" })).toHaveCount(0);
  await expect(page.getByText("최신 앱 셸 사용 중")).toBeVisible();
});

test("홈과 설정 패밀리 셸에서 브라우저 오류가 없다", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));

  await page.goto("/");
  await page.goto("/#settings");

  expect(errors).toEqual([]);
});

test("320px에서 글자를 200%로 키워도 가로 넘침이 없다", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("/");
  const overflow = await page.evaluate(async () => {
    document.documentElement.style.fontSize = "32px";
    await new Promise((resolve) => requestAnimationFrame(resolve));
    return document.documentElement.scrollWidth > document.documentElement.clientWidth;
  });
  expect(overflow).toBe(false);
});
