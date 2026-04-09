import { expect, type Page, type TestInfo } from "@playwright/test";

export const hasE2ECredentials = Boolean(
  process.env.E2E_ADMIN_EMAIL && process.env.E2E_ADMIN_PASSWORD,
);

export const uniqueValue = (prefix: string, testInfo: TestInfo) =>
  `${prefix}-${testInfo.project.name}-${testInfo.parallelIndex}-${Date.now()}`;

export async function login(page: Page) {
  const email = process.env.E2E_ADMIN_EMAIL;
  const password = process.env.E2E_ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error("E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD are required for Playwright tests.");
  }

  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Login To Admin Panel" }).click();
  await expect(page).not.toHaveURL(/\/login/);
}

export async function expectNotice(page: Page, text: string) {
  await expect(page.getByText(text, { exact: false }).first()).toBeVisible();
}

export async function createProduct(page: Page, productName: string, salesRate: number) {
  await page.goto("/products");
  await page.getByLabel("Product Name").fill(productName);
  await page.getByLabel("Sales Rate").fill(String(salesRate));
  await page.getByRole("button", { name: /create product|update product/i }).click();
  await expectNotice(page, "Product created");
}

export async function createSupplier(page: Page, supplierCode: string, supplierName: string) {
  await page.goto("/vendors/create");
  await page.getByLabel("Supplier Code").fill(supplierCode);
  await page.getByLabel("Supplier Name").fill(supplierName);
  await page.getByRole("button", { name: /save supplier profile|update supplier/i }).click();
  await expectNotice(page, "Supplier created");
}

export async function createStaffProfile(page: Page, staffCode: string, staffName: string, salary: number) {
  await page.goto("/staff/create");
  await page.getByLabel("Staff Code").fill(staffCode);
  await page.getByLabel("Staff Name").fill(staffName);
  await page.getByLabel("Base Monthly Salary").fill(String(salary));
  await page.getByRole("button", { name: /save staff profile|update staff profile/i }).click();
  await expectNotice(page, "Staff profile created");
}
