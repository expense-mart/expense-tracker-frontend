# Expense Mart frontend

A responsive React/TypeScript frontend for the real Expense Tracker backend. It connects public Stellar wallets, follows sync status, browses/filter transactions, edits private context, shows exact asset summaries, and downloads filtered CSV reports. There is no demo-data fallback and no direct browser-to-Horizon call.

## Run the complete local application

Requires Node.js **>=22.13** (verified with 22.21), npm 10, and the three repositories as siblings:

```sh
# From the parent expense-mart directory:
npm --prefix expense-tracker-onchain ci --ignore-scripts
npm --prefix expense-tracker-onchain run verify
npm --prefix expense-tracker-backend ci --ignore-scripts
npm --prefix expense-tracker-backend run verify
npm --prefix expense-tracker-frontend ci --ignore-scripts
npm --prefix expense-tracker-frontend run build
```

In `expense-tracker-backend`, copy `.env.example` to `.env` and replace the placeholder `API_TOKEN` with a random value of at least 32 characters. For example, generate a token with `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`. Never commit `.env`.

```sh
cd expense-tracker-backend
npm start
```

Open **http://127.0.0.1:3001/**. The backend serves the built frontend and `/api` endpoints on the same origin. Enter the workspace token in the connection screen. Tokens are not bundled into the frontend or put in URLs. A token is kept in the current tab's `sessionStorage` until disconnect; everyone with the token shares the same workspace. It is not a Stellar secret key, and separate user accounts are not implemented.

For frontend development, keep the backend running and run `npm run dev` here, then open **http://127.0.0.1:5173/**. Vite proxies `/api` to port 3001; override the server-only `API_PROXY_TARGET` environment variable if needed. The UI uses relative `/api` URLs and sends the token only in the Authorization header. CORS configuration is unnecessary for these same-origin paths.

## Working workflows

- Connect with a workspace access token; invalid/revoked tokens and an unavailable backend have clear recovery states.
- Add a labeled G-address with explicit public-activity consent and select **Testnet** or **Mainnet**. The backend checks address validity and starts a real Horizon sync. Synthetic test addresses are not live-wallet examples.
- See queued/syncing/up-to-date/partial/failed status. Retry failures, load another bounded history batch, or remove a wallet and its local records/notes.
- Browse paginated history, search hash/category/asset/note, and filter wallet, UTC date bounds, asset code, type, direction and category. No results and empty history have different guidance.
- Inspect full hash, counterparty, issuer, public memo and network-correct explorer link; copy the hash. Add private notes, categories, classification corrections or an exclusion, then see refreshed summaries without reloading.
- View income/expense/transfer/fee/unknown amounts by **wallet, network, asset code and issuer**. Amount strings remain exact; there is no fake fiat total. Ordinary payments stay Unknown until classified; directions alone do not prove income/expense.
- Export CSV using the report filters; excluded records are omitted. Add custom category labels and select them in transaction details.
- Use desktop/mobile navigation, native modal focus trapping/Escape, labeled controls, keyboard interactions and reduced-motion support. Settings and the contributor guide are reachable on mobile too.

Dates are displayed in the browser's timezone. Date-filter boundaries apply to **UTC calendar days** in the API. Summaries deliberately do not merge wallet perspectives or network runtimes. `transactionCount`/record counts include separate fee records, not just unique ledger transaction hashes.

## Verification

```sh
npm run build
npm run format:check
npm run test:e2e
```

The browser command builds the current sibling backend/package before starting both local servers. Playwright runs desktop and iPhone-size **Chromium emulation** using an installed Google Chrome by default. If Chrome is unavailable, install Playwright's browser with `npx playwright install chromium`, then run `PLAYWRIGHT_CHANNEL=chromium npm run test:e2e`.

The E2E runner uses the **real frontend, real HTTP backend, real SQLite API and real onchain processor**. Only the Horizon loader is replaced in the test runner with deterministic public/synthetic records. No frontend API response is mocked. Tests cover the complete wallet-to-report flow, notes/classification, persistence within the running API, retry, duplicate/invalid inputs, pagination/filter reset, offline recovery, removal, disconnect, responsive overflow/focus and automated WCAG checks. Browser traces/screenshots and the HTML report are generated under ignored `test-results/` and `playwright-report/`.

This is not Safari/iOS certification or a full manual accessibility audit. A separate live Horizon smoke check is documented in the implementation report; normal CI/browser tests never rely on a live network.

## Structure and scope

`src/api.ts` owns typed API access and error mapping; `src/App.tsx` contains the workspace screens; `src/main.tsx` configures React Query and startup; `src/styles.css` defines responsive visual styles. React Query caches are invalidated after mutation and sync completion; disconnect clears credentials and cached user context.

This completes the requested **local single-workspace frontend workflow**, not the entire multi-user production PRD. Backend storage is local SQLite and sync is an in-process bounded dispatcher, rather than the planned PostgreSQL/Redis infrastructure. Registration/JWT/reset/deletion of separate accounts, category rename/delete, automatic scheduled sync, fiat conversion, tax features, unsupported Stellar operation types and production deployment remain outside this implementation. No telemetry is sent. The app never requests spending permissions or signs transactions.

Related issue groups: frontend FE-001 through FE-007, FE-009 settings and FE-010 contributor guidance. GitHub FE-008 describes auth/onboarding, but only workspace-token onboarding is implemented. PRD FE-008 privacy/FE-009 responsiveness have different meanings from those issue IDs. The final implementation report maps precise working behavior and partial coverage; no issue is asserted complete or closed.

Implementation evidence and issue mapping: [cross-repository report](https://github.com/expense-mart/expense-tracker-backend/blob/main/docs/IMPLEMENTATION_REPORT.md).
