import { expect, test } from "@playwright/test";
import {
  createProduct,
  createStaffProfile,
  createSupplier,
  expectNotice,
  hasE2ECredentials,
  login,
  uniqueValue,
} from "./support/helpers";

test.describe("dashboard financial summaries", () => {
  test.skip(!hasE2ECredentials, "E2E admin credentials are not configured.");

  test("reflects new sales, supplier dues, and staff salary pending", async ({
    page,
  }, testInfo) => {
    const productName = uniqueValue("Dash Product", testInfo);
    const customerName = uniqueValue("Dash Customer", testInfo);
    const invoiceNumber = uniqueValue("DINV", testInfo).toUpperCase();
    const supplierName = uniqueValue("Dash Supplier", testInfo);
    const supplierCode = uniqueValue("VND", testInfo).toUpperCase();
    const staffName = uniqueValue("Dash Staff", testInfo);
    const staffCode = uniqueValue("DS-S", testInfo).toUpperCase();

    await login(page);
    await createProduct(page, productName, 4000);
    await createSupplier(page, supplierCode, supplierName);
    await createStaffProfile(page, staffCode, staffName, 30000);

    await page.goto("/sales/create");
    await page.getByLabel("Bill Number").fill(invoiceNumber);
    await page.getByLabel("Customer Name").fill(customerName);
    await page.getByLabel("Product Item").selectOption({ label: productName });
    await page.getByLabel("Item Name").fill(productName);
    await page.getByLabel("Quantity").fill("1");
    await page.getByLabel("Rate").fill("4000");
    await page.getByRole("button", { name: /save sales/i }).click();
    await expectNotice(page, "Sale created");

    await page.goto("/purchases/create");
    await page.getByLabel("Purchase Number").fill(uniqueValue("DPUR", testInfo).toUpperCase());
    await page.getByLabel("Saved Supplier").selectOption({ label: supplierName });
    await page.getByLabel("Raw Material Name").fill("Dashboard Raw Material");
    await page.getByLabel("Quantity").fill("1");
    await page.getByLabel("Rate").fill("12000");
    await page.getByLabel("Payment Status").selectOption("PENDING");
    await page.getByRole("button", { name: /save purchase/i }).click();
    await expectNotice(page, "Purchase created");

    await page.goto("/staff");
    await page.getByRole("link", { name: staffName }).click();
    await page.getByRole("link", { name: /add advance/i }).click();
    await page.getByLabel("Amount").fill("5000");
    await page.getByRole("button", { name: /add salary transaction|update salary transaction/i }).click();
    await expectNotice(page, "Staff salary transaction created");

    await page.goto("/");
    await expect(page.getByText("Total Sales", { exact: false })).toBeVisible();
    await expect(page.getByText("Rs. 4,000.00", { exact: false }).first()).toBeVisible();
    await expect(page.getByText("Supplier Dues", { exact: false })).toBeVisible();
    await expect(page.getByText("Rs. 12,000.00", { exact: false })).toBeVisible();
    await expect(page.getByText("Salary Pending", { exact: false })).toBeVisible();
    await expect(page.getByText("Rs. 25,000.00", { exact: false })).toBeVisible();
  });
});
