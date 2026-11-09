import { expect, test } from "@playwright/test";

test("register, manage a deck, and sign in again", async ({ page }) => {
  const email = `e2e-${Date.now()}@example.com`;
  const password = "e2e-test-password";

  await page.goto("/signup");
  await page.getByLabel("顯示名稱").fill("E2E 學習者");
  await page.getByLabel("電子郵件").fill(email);
  await page.getByLabel("密碼（至少 8 個字元）").fill(password);
  await page.getByRole("button", { name: "使用電子郵件建立帳號" }).click();

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("heading", { name: "我的牌組" })).toBeVisible();
  await expect(page.getByText("E2E 學習者")).toBeVisible();

  await page.getByLabel("牌組名稱").fill("E2E 英文單字");
  await page.getByLabel("描述（選填）").fill("端對端測試建立");
  await page.getByRole("button", { name: "建立牌組" }).click();
  const deck = page.locator(".deck-row").filter({ hasText: "E2E 英文單字" });
  await expect(deck).toBeVisible();

  await deck.getByRole("button", { name: "編輯" }).click();
  await page.getByLabel("牌組名稱").fill("E2E 更新後牌組");
  await page.getByRole("button", { name: "儲存變更" }).click();
  await expect(page.getByRole("heading", { name: "E2E 更新後牌組" })).toBeVisible();

  page.once("dialog", (dialog) => dialog.accept());
  await page.locator(".deck-row")
    .filter({ hasText: "E2E 更新後牌組" })
    .getByRole("button", { name: "刪除" })
    .click();
  await expect(page.getByText("還沒有牌組，建立第一個牌組開始整理學習內容。")).toBeVisible();

  await page.getByRole("button", { name: "登出" }).click();
  await expect(page).toHaveURL(/\/login$/);

  await page.getByLabel("電子郵件").fill(email);
  await page.getByLabel("密碼").fill(password);
  await page.getByRole("button", { name: "使用電子郵件登入" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("heading", { name: "我的牌組" })).toBeVisible();
});

test("shows an error for invalid credentials", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("電子郵件").fill(`missing-${Date.now()}@example.com`);
  await page.getByLabel("密碼").fill("wrong-password");
  await page.getByRole("button", { name: "使用電子郵件登入" }).click();

  await expect(page.locator("p.notice[role=alert]")).toHaveText("電子郵件或密碼不正確。");
  await expect(page).toHaveURL(/\/login$/);
});
