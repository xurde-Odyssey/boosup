import { expect, test } from "@playwright/test";
import { createStaffProfile, expectNotice, hasE2ECredentials, login, uniqueValue } from "./support/helpers";
import { e2eSeedData } from "./support/seed-data";

test.describe("staff salary workflow", () => {
  test.skip(!hasE2ECredentials, "E2E admin credentials are not configured.");

  test("creates staff profile, records advance and salary payment, and shows transactions", async ({
    page,
  }, testInfo) => {
    const staffName = uniqueValue("Auto Staff", testInfo);
    const staffCode = uniqueValue("DS-S", testInfo).toUpperCase();

    await login(page);
    await createStaffProfile(page, staffCode, staffName, e2eSeedData.staff.baseSalary);

    await page.goto("/staff");
    await page.getByRole("link", { name: staffName }).click();
    await expect(page.getByText("Monthly Salary", { exact: false })).toBeVisible();

    await page.getByRole("link", { name: /add advance/i }).click();
    await page.getByLabel("Amount").fill(String(e2eSeedData.staff.advanceAmount));
    await page.getByRole("button", { name: /add salary transaction|update salary transaction/i }).click();
    await expectNotice(page, "Staff salary transaction created");

    await page.goto("/staff");
    await page.getByRole("link", { name: staffName }).click();
    await page.getByRole("link", { name: /add salary payment/i }).click();
    await page.getByLabel("Transaction Type").selectOption("SALARY");
    await page.getByLabel("Amount").fill(String(e2eSeedData.staff.salaryPayment));
    await page.getByRole("button", { name: /add salary transaction|update salary transaction/i }).click();
    await expectNotice(page, "Staff salary transaction created");

    await page.goto("/staff/view?q=" + encodeURIComponent(staffName));
    await expect(page.getByText(staffName, { exact: false })).toBeVisible();
    await expect(page.getByText("ADVANCE", { exact: false })).toBeVisible();
    await expect(page.getByText("SALARY", { exact: false })).toBeVisible();
  });
});
