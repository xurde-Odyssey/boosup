import { expect, test } from "@playwright/test";
import { createProduct, createSupplier, expectNotice, hasE2ECredentials, login, uniqueValue } from "./support/helpers";

test.describe("financial validation safeguards", () => {
  test.skip(!hasE2ECredentials, "E2E admin credentials are not configured.");

  test("rejects collecting more than the remaining sales amount", async ({ page }, testInfo) => {
    const productName = uniqueValue("Valid Product", testInfo);
    const customerName = uniqueValue("Valid Customer", testInfo);
    const invoiceNumber = uniqueValue("VINV", testInfo).toUpperCase();

    await login(page);
    await createProduct(page, productName, 1000);

    await page.goto("/sales/create");
    await page.getByLabel("Bill Number").fill(invoiceNumber);
    await page.getByLabel("Customer Name").fill(customerName);
    await page.getByLabel("Product Item").selectOption({ label: productName });
    await page.getByLabel("Item Name").fill(productName);
    await page.getByLabel("Quantity").fill("1");
    await page.getByLabel("Rate").fill("1000");
    await page.getByLabel("Payment Status").selectOption("PARTIAL");
    await page.getByLabel("Amount Received Now").fill("1500");
    await page.getByRole("button", { name: /save sales/i }).click();

    await expectNotice(page, "Amount received now cannot exceed the remaining amount");
  });

  test("rejects supplier payment above total pending balance", async ({ page }, testInfo) => {
    const supplierName = uniqueValue("Valid Supplier", testInfo);
    const supplierCode = uniqueValue("VND", testInfo).toUpperCase();
    const purchaseNumber = uniqueValue("VPUR", testInfo).toUpperCase();

    await login(page);
    await createSupplier(page, supplierCode, supplierName);

    await page.goto("/purchases/create");
    await page.getByLabel("Purchase Number").fill(purchaseNumber);
    await page.getByLabel("Saved Supplier").selectOption({ label: supplierName });
    await page.getByLabel("Raw Material Name").fill("Validation Material");
    await page.getByLabel("Quantity").fill("1");
    await page.getByLabel("Rate").fill("5000");
    await page.getByLabel("Payment Status").selectOption("PENDING");
    await page.getByRole("button", { name: /save purchase/i }).click();
    await expectNotice(page, "Purchase created");

    await page.goto("/vendors");
    await page.getByRole("link", { name: supplierName }).click();
    await page.getByRole("button", { name: "Add Supplier Payment" }).click();
    await page.getByLabel("Payment Amount").fill("6000");
    await page.getByRole("button", { name: "Save Supplier Payment" }).click();

    await expectNotice(page, "Payment exceeds supplier pending balance");
  });

  test("requires selecting staff before saving a salary transaction", async ({ page }) => {
    await login(page);
    await page.goto("/staff/payment/create");
    await page.getByLabel("Amount").fill("1000");
    await page.getByRole("button", { name: /add salary transaction|update salary transaction/i }).click();

    await expectNotice(page, "Select staff member");
  });

  test("prevents negative supplier payment input at the form level", async ({ page }, testInfo) => {
    const supplierName = uniqueValue("Min Supplier", testInfo);
    const supplierCode = uniqueValue("VND", testInfo).toUpperCase();

    await login(page);
    await createSupplier(page, supplierCode, supplierName);
    await page.goto(`/vendors?q=${encodeURIComponent(supplierName)}`);
    await page.getByRole("link", { name: supplierName }).click();
    await page.getByRole("button", { name: "Add Supplier Payment" }).click();

    await expect(page.getByLabel("Payment Amount")).toHaveAttribute("min", "0.01");
  });
});
