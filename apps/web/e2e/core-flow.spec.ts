// 검색·추천·관심 저장·상세 준비물과 접근성의 핵심 사용자 흐름을 검증한다.
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("첫 화면에서 추천과 다음 행동이 짧은 스크롤 안에 보인다", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /어떤 시험을/ })).toBeVisible();
  await expect(page.getByRole("button", { name: "나에게 맞는 시험 찾기" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "곧 해야 할 일" })).toBeVisible();
});

test("시험 검색 후 상세와 관심 저장을 완료한다", async ({ page }) => {
  await page.goto("/#find");
  await page.getByPlaceholder("시험명·기관·분야 검색").fill("한국사");
  await page.getByRole("button", { name: /한국사능력검정시험 심화/ }).first().click();
  await expect(page.getByRole("heading", { name: "한국사능력검정시험 심화" })).toBeVisible();
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
