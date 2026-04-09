import { expect, test } from "@playwright/test";
import { createProduct, expectNotice, hasE2ECredentials, login, uniqueValue } from "./support/helpers";
import { e2eSeedData } from "./support/seed-data";

test.describe("sales financial workflow", () => {
  test.skip(!hasE2ECredentials, "E2E admin credentials are not configured.");

  test("creates a sales bill, records partial payment, then settles it fully", async ({
    page,
  }, testInfo) => {
    const productName = uniqueValue("Auto Product", testInfo);
    const customerName = uniqueValue("Auto Customer", testInfo);
    const invoiceNumber = uniqueValue("INV", testInfo).toUpperCase();

    await login(page);
    await createProduct(page, productName, e2eSeedData.sales.productRate);

    await page.goto("/sales/create");
    await page.getByLabel("Bill Number").fill(invoiceNumber);
    await page.getByLabel("Customer Name").fill(customerName);
    await page.getByLabel("Product Item").selectOption({ label: productName });
    await page.getByLabel("Item Name").fill(productName);
    await page.getByLabel("Quantity").fill(String(e2eSeedData.sales.quantity));
    await page.getByLabel("Rate").fill(String(e2eSeedData.sales.productRate));
    await page.getByLabel("Payment Status").selectOption("PARTIAL");
    await page.getByLabel("Amount Received Now").fill(String(e2eSeedData.sales.partialReceipt));
    await page.getByRole("button", { name: /save sales|update sales/i }).click();

    await expectNotice(page, "Sale created");
    await page.goto(`/sales?q=${encodeURIComponent(customerName)}`);
    await expect(page.getByText(invoiceNumber, { exact: false })).toBeVisible();
    await expect(page.getByText(customerName, { exact: false })).toBeVisible();
    await expect(page.getByText("Rs. 1,500.00", { exact: false })).toBeVisible();
    await expect(page.getByText("PARTIAL", { exact: false })).toBeVisible();

    await page.getByTitle(`Open sales invoice ${invoiceNumber}`).click();
    await page.getByLabel("Payment Status").selectOption("PAID");
    await page.getByLabel("Amount Received Now").fill("1500");
    await page.getByRole("button", { name: /update sales/i }).click();

    await expectNotice(page, "Sale updated");
    await page.goto(`/sales?q=${encodeURIComponent(customerName)}`);
    await expect(page.getByText("Rs. 0.00", { exact: false })).toBeVisible();
    await expect(page.getByText("PAID", { exact: false })).toBeVisible();
  });
});
