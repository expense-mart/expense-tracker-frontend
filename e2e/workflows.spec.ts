import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFileSync } from "node:fs";
const fixture = JSON.parse(
  readFileSync(
    new URL(
      "../../expense-tracker-onchain/test/fixtures/payments.json",
      import.meta.url,
    ),
    "utf8",
  ),
);
const token = "playwright-workspace-token-32-characters";
const headers = { authorization: `Bearer ${token}` };
async function connect(page: Page) {
  await page.goto("/");
  await page.getByLabel("Workspace access token").fill(token);
  await page.getByRole("button", { name: "Open workspace" }).click();
  await expect(
    page.getByRole("heading", { name: "Your Stellar overview" }),
  ).toBeVisible();
}
async function addWallet(
  page: Page,
  label = "Everyday",
  address = fixture.walletAddress,
) {
  await page
    .getByRole("button", { name: "Connect wallet", exact: true })
    .first()
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Wallet label").fill(label);
  await dialog.getByLabel("Public wallet address").fill(address);
  await dialog.getByRole("checkbox").check();
  await dialog
    .getByRole("button", { name: "Connect wallet", exact: true })
    .click();
  await expect(dialog).not.toBeVisible();
}

test.beforeEach(async ({ request }) => {
  const response = await request.get("http://127.0.0.1:4311/api/wallets", {
    headers,
  });
  for (const wallet of (await response.json()).data)
    await request.delete(`http://127.0.0.1:4311/api/wallets/${wallet.id}`, {
      headers,
    });
});
test("connect, onboard, sync, review, classify, export, reload, and remove a wallet", async ({
  page,
}, testInfo) => {
  await connect(page);
  await expect(page.getByText("Make your first connection.")).toBeVisible();
  await addWallet(page);
  await expect(page.getByText("Up to date", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Transactions", exact: true }).click();
  await expect(
    page.getByText("6 records", { exact: true }).first(),
  ).toBeVisible();
  await expect(page.getByRole("table")).toContainText(
    "900,719,925.4740993 USDC",
  );
  await page
    .getByRole("button", { name: "Open unknown 10.5000000 USDC" })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(
    dialog.getByRole("heading", { name: "Transaction details" }),
  ).toBeVisible();
  await dialog
    .getByRole("combobox", { name: "Category", exact: true })
    .selectOption("Food & drink");
  await dialog
    .getByRole("combobox", { name: "Classification", exact: true })
    .selectOption("expense");
  await dialog
    .getByLabel("Private note")
    .fill("Team lunch, privately recorded");
  await dialog.getByRole("button", { name: "Save changes" }).click();
  await expect(dialog).not.toBeVisible();
  await page.getByRole("link", { name: "Overview", exact: true }).click();
  await expect(page.getByText("10.5 USDC", { exact: true })).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath("dashboard.png"),
    fullPage: true,
  });
  await page.getByRole("link", { name: "Reports", exact: true }).click();
  await page
    .getByRole("combobox", { name: "Type", exact: true })
    .selectOption("expense");
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download CSV" }).click();
  const download = await downloadPromise;
  const path = await download.path();
  const csv = readFileSync(path!, "utf8");
  expect(csv).toContain("Team lunch, privately recorded");
  expect(csv).toContain("10.5000000");
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Reports & exports" }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Wallets", exact: false })
    .first()
    .click();
  await page.getByRole("button", { name: "Sync wallet" }).click();
  await expect(page.getByText("Up to date", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "Remove wallet", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Remove wallet", exact: true })
    .click();
  await expect(page.getByText("A little clarity starts here.")).toBeVisible();
});
test("invalid token, invalid wallet, duplicate wallet and retryable sync failure", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByLabel("Workspace access token").fill("wrong-token");
  await page.getByRole("button", { name: "Open workspace" }).click();
  await expect(page.getByRole("alert")).toContainText("valid preview token");
  await page.getByLabel("Workspace access token").fill(token);
  await page.getByRole("button", { name: "Open workspace" }).click();
  await page
    .getByRole("button", { name: "Connect wallet", exact: true })
    .first()
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Wallet label").fill("Invalid");
  await dialog.getByLabel("Public wallet address").fill("G-invalid");
  await dialog.getByRole("checkbox").check();
  await dialog
    .getByRole("button", { name: "Connect wallet", exact: true })
    .click();
  await expect(dialog.getByRole("alert")).toContainText("valid Stellar");
  await dialog.getByRole("button", { name: "Close dialog" }).click();
  await addWallet(page, "Retry wallet", fixture.payments[0].asset_issuer);
  // A fresh testnet address uses an upstream adapter failure on its first attempt.
  await expect(page.getByText("Sync failed", { exact: true })).toBeVisible();
  let releaseRetry!: () => void;
  const retryPending = new Promise<void>((resolve) => (releaseRetry = resolve));
  let retryRequests = 0;
  await page.route(
    "**/api/wallets/*/sync",
    async (route) => {
      retryRequests++;
      await retryPending;
      await route.fulfill({
        status: 503,
        json: {
          success: false,
          error: {
            code: "SERVICE_UNAVAILABLE",
            message: "Sync is temporarily unavailable. Please retry.",
            details: {},
          },
        },
      });
    },
    { times: 1 },
  );
  await page.getByRole("button", { name: "Retry sync" }).click();
  const pendingRetry = page.getByRole("button", { name: "Requesting sync…" });
  await expect(pendingRetry).toBeDisabled();
  await expect.poll(() => retryRequests).toBe(1);
  await pendingRetry.evaluate((button: HTMLButtonElement) => button.click());
  expect(retryRequests).toBe(1);
  releaseRetry();
  await expect(
    page.getByRole("alert").filter({ hasText: "We couldn’t finish" }),
  ).toContainText("Sync is temporarily unavailable. Please retry.");
  await page.getByRole("button", { name: "Retry sync" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Sync requested." }),
  ).toContainText("Wallet status will update automatically.");
  await expect(page.getByText("We couldn’t finish that.")).not.toBeVisible();
  await expect(page.getByText("Up to date", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "Connect wallet", exact: true })
    .first()
    .click();
  await dialog.getByLabel("Wallet label").fill("Duplicate");
  await dialog
    .getByLabel("Public wallet address")
    .fill(fixture.payments[0].asset_issuer);
  await dialog.getByRole("checkbox").check();
  await dialog
    .getByRole("button", { name: "Connect wallet", exact: true })
    .click();
  await expect(dialog.getByRole("alert")).toContainText("already connected");
});
test("filters, pagination, empty state, custom categories and responsive keyboard navigation", async ({
  page,
}) => {
  await connect(page);
  await addWallet(page, "Paged wallet", fixture.payments[0].to);
  await expect(page.getByText("Up to date", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Transactions", exact: true }).click();
  await expect(
    page.getByText("45 records", { exact: true }).first(),
  ).toBeVisible();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.getByText("Page 2 · 45 records")).toBeVisible();
  await page.getByLabel("Search", { exact: true }).fill("not-a-real-record");
  await expect(page.getByText("No matching activity.")).toBeVisible();
  await page
    .getByRole("button", { name: "Clear filters", exact: true })
    .first()
    .click();
  await expect(page.getByText("Page 1 · 45 records")).toBeVisible();
  await page.getByRole("link", { name: "Categories", exact: true }).click();
  await page.getByLabel("New category").fill("Client work");
  await page.getByRole("button", { name: "Add category" }).click();
  await expect(page.getByText("Client work", { exact: true })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await expect(
    page.getByRole("button", { name: "Add category" }),
  ).toBeEnabled();
  await page.getByLabel("New category").focus();
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("button", { name: "Add category" }),
  ).toBeFocused();
  await page
    .getByRole("button", { name: "Connect wallet", exact: true })
    .first()
    .click();
  await expect(page.getByLabel("Wallet label")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
});
test("backend-unavailable state recovers and disconnect clears credentials", async ({
  page,
  context,
}) => {
  await connect(page);
  await context.setOffline(true);
  await page.getByRole("link", { name: "Transactions", exact: true }).click();
  // Force an uncached real API request while the browser is offline.
  await page.getByLabel("Search", { exact: true }).fill("offline-query");
  await expect(page.getByRole("alert").first()).toContainText(
    "backend is unavailable",
  );
  await context.setOffline(false);
  await page.getByRole("button", { name: "Try again" }).first().click();
  await expect(page.getByText("No matching activity.")).toBeVisible();
  await page.getByRole("link", { name: /settings/i }).click();
  await page.getByRole("button", { name: "Disconnect workspace" }).click();
  await expect(
    page.getByRole("heading", { name: "Let’s get connected." }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => sessionStorage.getItem("expense-mart-token")),
  ).toBeNull();
});

test("key screens meet automated WCAG accessibility checks", async ({
  page,
}) => {
  await connect(page);
  let audit = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(
    audit.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => n.target),
    })),
  ).toEqual([]);
  await addWallet(page);
  await expect(page.getByText("Up to date", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Transactions", exact: true }).click();
  await expect(page.getByRole("table")).toBeVisible();
  audit = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(
    audit.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => n.target),
    })),
  ).toEqual([]);
  await page
    .getByRole("button", { name: "Open unknown 10.5000000 USDC" })
    .click();
  await expect(
    page.getByRole("combobox", { name: "Classification", exact: true }),
  ).toBeVisible();
  audit = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(
    audit.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => n.target),
    })),
  ).toEqual([]);
});
