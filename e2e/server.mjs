// Deterministic upstream adapter only: the browser talks to the real backend and package.
// This runner is not imported by application code or enabled through a production env flag.
import { readFile } from "node:fs/promises";
import { createApp } from "../../expense-tracker-backend/dist/app.js";
import { Workspace } from "../../expense-tracker-backend/dist/workspace.js";
import { HorizonError } from "../../expense-tracker-onchain/dist/index.js";
const fixture = JSON.parse(
  await readFile(
    new URL(
      "../../expense-tracker-onchain/test/fixtures/payments.json",
      import.meta.url,
    ),
  ),
);
const attempts = new Map();
const workspace = new Workspace(":memory:", async (address) => {
  await new Promise((resolve) => setTimeout(resolve, 250));
  const key =
    workspace.wallets().find((w) => w.address === address)?.id ?? address;
  const count = (attempts.get(key) ?? 0) + 1;
  attempts.set(key, count);
  if (address === fixture.payments[0].asset_issuer && count === 1)
    throw new HorizonError(
      "HORIZON_UNAVAILABLE",
      "Stellar history is temporarily unavailable. Please retry.",
    );
  let payments = [];
  if (address === fixture.walletAddress) payments = fixture.payments;
  else if (address === fixture.payments[0].to)
    payments = Array.from({ length: 45 }, (_, i) => {
      const hash = (i + 1000).toString(16).padStart(64, "0");
      return {
        ...fixture.payments[0],
        id: String(i + 1000),
        transaction_hash: hash,
        transaction: { ...fixture.payments[0].transaction, hash },
        amount: String(i + 1),
      };
    });
  return { payments, cursor: "9999", hasMore: false, unsupportedCount: 0 };
});
const server = createApp({
  apiToken: "playwright-workspace-token-32-characters",
  workspace,
});
server.listen(4311, "127.0.0.1");
for (const signal of ["SIGTERM", "SIGINT"])
  process.once(signal, () => server.close(() => process.exit(0)));
