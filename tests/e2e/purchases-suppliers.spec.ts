import { expect, test } from "@playwright/test";
import { createSupplier, expectNotice, hasE2ECredentials, login, uniqueValue } from "./support/helpers";
import { e2eSeedData } from "./support/seed-data";

test.describe("purchase and supplier payment workflow", () => {
  test.skip(!hasE2ECredentials, "E2E admin credentials are not configured.");

  test("creates supplier bills, records bill payment, then auto-allocates a supplier payment", async ({
    page,
  }, testInfo) => {
    const supplierName = uniqueValue("Auto Supplier", testInfo);
    const supplierCode = uniqueValue("VND", testInfo).toUpperCase();
    const billOne = uniqueValue("PUR", testInfo).toUpperCase();
    const billTwo = `${billOne}-B`;

    await login(page);
    await createSupplier(page, supplierCode, supplierName);

    await page.goto("/purchases/create");
    await page.getByLabel("Purchase Number").fill(billOne);
    await page.getByLabel("Saved Supplier").selectOption({ label: supplierName });
    await page.getByLabel("Raw Material Name").fill("Iron Rod");
    await page.getByLabel("Quantity").fill(String(e2eSeedData.purchases.firstBillAmount.quantity));
    await page.getByLabel("Rate").fill(String(e2eSeedData.purchases.firstBillAmount.rate));
    await page.getByLabel("Payment Status").selectOption("PARTIAL");
    await page
      .getByLabel("Amount Paid Now")
      .fill(String(e2eSeedData.purchases.firstBillAmount.paidNow));
    await page.getByRole("button", { name: /save purchase|update purchase/i }).click();
    await expectNotice(page, "Purchase created");

    await page.goto("/purchases/create");
    await page.getByLabel("Purchase Number").fill(billTwo);
    await page.getByLabel("Saved Supplier").selectOption({ label: supplierName });
    await page.getByLabel("Raw Material Name").fill("Copper Wire");
    await page.getByLabel("Quantity").fill(String(e2eSeedData.purchases.secondBillAmount.quantity));
    await page.getByLabel("Rate").fill(String(e2eSeedData.purchases.secondBillAmount.rate));
    await page.getByLabel("Payment Status").selectOption("PENDING");
    await page.getByRole("button", { name: /save purchase|update purchase/i }).click();
    await expectNotice(page, "Purchase created");

    await page.goto("/vendors");
    await page.getByRole("link", { name: supplierName }).click();
    await expect(page.getByText("Rs. 32,000.00", { exact: false })).toBeVisible();

    await page.getByRole("button", { name: "Add Supplier Payment" }).click();
    await page
      .getByLabel("Payment Amount")
      .fill(String(e2eSeedData.purchases.supplierLevelPayment));
    await page.getByRole("button", { name: "Save Supplier Payment" }).click();
    await expectNotice(page, "Supplier payment created");

    await expect(page.getByText("Rs. 22,000.00", { exact: false })).toBeVisible();
    await expect(page.getByText("Supplier Payment History", { exact: false })).toBeVisible();
  });
});
