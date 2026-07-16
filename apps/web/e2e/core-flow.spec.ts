// 검색·추천·관심 저장·상세 준비물과 접근성의 핵심 사용자 흐름을 검증한다.
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("첫 화면에서 추천과 다음 행동이 짧은 스크롤 안에 보인다", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /지금 접수할 시험부터/ })).toBeVisible();
  await expect(page.getByRole("button", { name: "97개 시험 검색하기" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "곧 해야 할 일" })).toBeVisible();
});

test("시험 검색 후 상세와 관심 저장을 완료한다", async ({ page }) => {
  await page.goto("/#find");
  await page.getByPlaceholder("시험명·별칭·기관·분야 검색").fill("한국사");
  await page.getByRole("button", { name: /한국사능력검정시험/ }).first().click();
  await expect(page.getByRole("heading", { name: "한국사능력검정시험" })).toBeVisible();
  await page.getByRole("button", { name: "☆ 관심 시험 저장하기" }).click();
  await expect(page.getByRole("button", { name: /관심 시험으로 저장됨/ })).toBeVisible();
  await page.getByLabel(/수험표/).check();
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
  await expect(page.getByText("전체 시험").locator("..").getByText("97")).toBeVisible();
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
  await expect(page.locator(".bottom-nav svg.family-icon")).toHaveCount(4);
  const touchHeights = await page.locator(".bottom-nav button").evaluateAll((buttons) => buttons.map((button) => button.getBoundingClientRect().height));
  expect(touchHeights.every((height) => height >= 48)).toBe(true);
});

test("설정에서 다섯 패밀리 앱과 게스트·지원·개인정보·0.6.0 메타를 확인한다", async ({ page }) => {
  await page.goto("/#settings");
  await expect(page.locator("[data-family-app]")).toHaveCount(5);
  await expect(page.getByRole("link", { name: /문의와 지원/ })).toHaveAttribute("href", "https://robom.kr/support");
  await expect(page.getByRole("link", { name: /자격증봄 개인정보 처리방침/ })).toHaveAttribute("href", "https://robom.kr/privacy/certbom");
  await expect(page.getByText("0.6.0", { exact: true })).toBeVisible();
  await expect(page.getByRole("checkbox", { name: /익명 사용성 분석 허용/ })).not.toBeChecked();

  await page.getByRole("button", { name: /카카오 연결 준비 상태/ }).click();
  await expect(page.getByText(/카카오 로그인은 아직 연결되지 않았어요/)).toBeVisible();
});

test("beforeinstallprompt를 사용자 설치 CTA에서만 실행한다", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    const event = new Event("beforeinstallprompt", { cancelable: true });
    Object.assign(event, {
      prompt: () => Promise.resolve(),
      userChoice: Promise.resolve({ outcome: "accepted", platform: "web" }),
    });
    window.dispatchEvent(event);
  });
  await page.getByRole("button", { name: "설정" }).click();
  await page.getByRole("button", { name: "이 기기에 자격증봄 설치" }).click();
  await expect(page.getByText("이 기기에 자격증봄이 설치되어 있어요.")).toBeVisible();
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
