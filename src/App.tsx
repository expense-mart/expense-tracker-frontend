import React, {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  request,
  ApiError,
  emptyFilters,
  query,
  short,
  networkName,
  date,
  decimal,
  type Wallet,
  type Transaction,
  type Summary,
  type Page,
  type Filters,
} from "./api";

const nav = [
  ["dashboard", "Overview", "M3 3v18h18M7 14l4-4 4 3 5-8"],
  ["wallets", "Wallets", "M3 5h16v4H3zM3 9h18v11H3zM16 13h5v4h-5z"],
  [
    "transactions",
    "Transactions",
    "M4 7h16M16 3l4 4-4 4M20 17H4M8 13l-4 4 4 4",
  ],
  ["reports", "Reports", "M5 3h14v18H5zM8 8h8M8 12h8M8 16h5"],
  [
    "categories",
    "Categories",
    "M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z",
  ],
] as const;
function Icon({ path, size = 20 }: { path: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={path} />
    </svg>
  );
}
function Button({
  children,
  onClick,
  secondary = false,
  disabled = false,
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  secondary?: boolean;
  disabled?: boolean;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      className={secondary ? "button secondary" : "button"}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
function ErrorBox({ error, retry }: { error: unknown; retry?: () => void }) {
  return (
    <div role="alert" className="error-box">
      <strong>We couldn’t finish that.</strong>
      <p>
        {error instanceof Error
          ? error.message
          : "Something went wrong. Please try again."}
      </p>
      {retry && (
        <Button secondary onClick={retry}>
          Try again
        </Button>
      )}
    </div>
  );
}
function Empty({
  title,
  children,
  action,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <span className="empty-icon">
        <Icon path="M3 5h18v15H3zM3 9h18M8 14h3" size={28} />
      </span>
      <h2>{title}</h2>
      <p>{children}</p>
      {action}
    </div>
  );
}
function Loading() {
  return (
    <div role="status" aria-label="Loading" className="skeletons">
      {[1, 2, 3].map((i) => (
        <div key={i} />
      ))}
      <span className="sr-only">Loading workspace data…</span>
    </div>
  );
}
function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
    ref.current?.querySelector<HTMLElement>("[data-initial-focus]")?.focus();
    return () => ref.current?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      aria-label={title}
    >
      <header className="dialog-head">
        <h2>{title}</h2>
        <button
          className="icon-button"
          aria-label="Close dialog"
          onClick={onClose}
        >
          ×
        </button>
      </header>
      {children}
    </dialog>
  );
}
function Status({ wallet }: { wallet: Wallet }) {
  return (
    <span className={`status ${wallet.syncStatus}`}>
      <i />
      {
        {
          pending: "Queued",
          syncing: "Syncing",
          synced: "Up to date",
          partial: "More history available",
          failed: "Sync failed",
        }[wallet.syncStatus]
      }
    </span>
  );
}

function Connect({
  onConnected,
  notice,
}: {
  onConnected: (token: string) => void;
  notice: string;
}) {
  const [token, setToken] = useState("");
  const [error, setError] = useState<unknown>();
  const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(undefined);
    setBusy(true);
    try {
      await request<Wallet[]>(token.trim(), "/wallets");
      onConnected(token.trim());
    } catch (error) {
      setError(error);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="connect">
      <div className="connect-story">
        <a className="brand" href="#">
          <span className="brand-mark">
            e<span>m</span>
          </span>
          expense<span className="brand-light">mart</span>
        </a>
        <div>
          <span className="eyebrow">YOUR MONEY, A LITTLE CLEARER</span>
          <h1>
            Public activity.
            <br />
            Private perspective.
          </h1>
          <p>
            A calm place to make sense of your Stellar payments, assets, and
            network fees.
          </p>
          <div className="read-only">
            <Icon path="M12 3l8 4v6c0 4-8 8-8 8s-8-4-8-8V7zM8 12l3 3 5-6" />
            Read-only by design. Your keys stay yours.
          </div>
        </div>
        <small>STELLAR FIRST · BUILT IN THE OPEN</small>
      </div>
      <div className="connect-form">
        <form onSubmit={submit}>
          <span className="eyebrow">WELCOME TO YOUR WORKSPACE</span>
          <h2>Let’s get connected.</h2>
          <p>
            Enter the access token configured on your local Expense Mart
            backend.
          </p>
          {notice && (
            <p role="status" className="notice">
              {notice}
            </p>
          )}
          {Boolean(error) && <ErrorBox error={error} />}
          <label>
            Workspace access token
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              required
              autoComplete="off"
              placeholder="Your backend API_TOKEN"
            />
          </label>
          <Button type="submit" disabled={busy || !token.trim()}>
            {busy ? "Connecting…" : "Open workspace"}{" "}
            <span aria-hidden="true">→</span>
          </Button>
          <small>
            This is a workspace token, never a Stellar private key. It stays in
            this tab’s session storage and is cleared when you disconnect.
            Separate user accounts are not enabled.
          </small>
        </form>
      </div>
    </main>
  );
}

function AddWallet({
  token,
  onClose,
  onAdded,
}: {
  token: string;
  onClose: () => void;
  onAdded: () => void;
}) {
  const cache = useQueryClient();
  const [label, setLabel] = useState("");
  const [address, setAddress] = useState("");
  const [network, setNetwork] = useState("testnet");
  const [consent, setConsent] = useState(false);
  const add = useMutation({
    mutationFn: () =>
      request<Wallet>(token, "/wallets", {
        method: "POST",
        body: JSON.stringify({
          label,
          address: address.trim(),
          network,
          consent,
        }),
      }),
    onSuccess: async () => {
      await cache.invalidateQueries({ queryKey: ["wallets"] });
      onAdded();
    },
  });
  return (
    <Modal title="Connect a Stellar wallet" onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          add.mutate();
        }}
      >
        <p className="muted">
          Add a public address. We’ll read its successful Stellar payments
          without asking for signing access.
        </p>
        {add.isError && <ErrorBox error={add.error} />}
        <label>
          Wallet label
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            required
            maxLength={60}
            placeholder="e.g. My everyday wallet"
            data-initial-focus
          />
        </label>
        <label>
          Stellar network
          <select value={network} onChange={(e) => setNetwork(e.target.value)}>
            <option value="testnet">Testnet</option>
            <option value="public">Mainnet</option>
          </select>
        </label>
        <label>
          Public wallet address
          <textarea
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            required
            maxLength={56}
            rows={3}
            placeholder="G…"
            spellCheck={false}
          />
        </label>
        <p className="help">
          Use a G-address on the selected network. A Stellar secret key starts
          with S; never enter it here.
        </p>
        <label className="checkbox">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            required
          />
          <span>
            I allow Expense Mart to read this wallet’s public activity. My
            private keys and seed phrase will never be requested.
          </span>
        </label>
        <div className="dialog-actions">
          <Button secondary onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={add.isPending || !consent}>
            {add.isPending ? "Connecting…" : "Connect wallet"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function FilterBar({
  filters,
  setFilters,
  wallets,
  categories,
}: {
  filters: Filters;
  setFilters: (filters: Filters) => void;
  wallets: Wallet[];
  categories: string[];
}) {
  const change = (key: keyof Filters, value: string) =>
    setFilters({ ...filters, [key]: value });
  return (
    <div className="filters">
      <p className="filter-help help">
        Date filters use UTC calendar days. Amounts stay in their original
        asset.
      </p>
      <label className="search-label">
        Search
        <input
          type="search"
          value={filters.q}
          onChange={(e) => change("q", e.target.value)}
          maxLength={100}
          placeholder="Hash, category, asset or note…"
        />
      </label>
      <label>
        Wallet
        <select
          value={filters.walletId}
          onChange={(e) => change("walletId", e.target.value)}
        >
          <option value="">All wallets</option>
          {wallets.map((w) => (
            <option key={w.id} value={w.id}>
              {w.label} · {networkName(w.network)}
            </option>
          ))}
        </select>
      </label>
      <label>
        Type
        <select
          value={filters.type}
          onChange={(e) => change("type", e.target.value)}
        >
          <option value="">All types</option>
          {["income", "expense", "transfer", "fee", "unknown"].map((v) => (
            <option key={v} value={v}>
              {v[0]!.toUpperCase() + v.slice(1)}
            </option>
          ))}
        </select>
      </label>
      <label>
        From
        <input
          type="date"
          value={filters.from}
          onChange={(e) => change("from", e.target.value)}
        />
      </label>
      <label>
        To
        <input
          type="date"
          min={filters.from || undefined}
          value={filters.to}
          onChange={(e) => change("to", e.target.value)}
        />
      </label>
      <details className="more-filters">
        <summary>More filters</summary>
        <div>
          <label>
            Asset code
            <input
              value={filters.asset}
              onChange={(e) => change("asset", e.target.value)}
              placeholder="e.g. XLM"
              maxLength={12}
            />
          </label>
          <label>
            Direction
            <select
              value={filters.direction}
              onChange={(e) => change("direction", e.target.value)}
            >
              <option value="">All directions</option>
              {["incoming", "outgoing", "internal", "unknown"].map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </label>
          <label>
            Category
            <select
              value={filters.category}
              onChange={(e) => change("category", e.target.value)}
            >
              <option value="">All categories</option>
              {categories.map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </label>
        </div>
      </details>
      {Object.values(filters).some(Boolean) && (
        <button
          className="text-button"
          onClick={() => setFilters({ ...emptyFilters })}
        >
          Clear filters
        </button>
      )}
    </div>
  );
}

function TransactionsTable({
  items,
  wallets,
  onSelect,
}: {
  items: Transaction[];
  wallets: Wallet[];
  onSelect: (id: string) => void;
}) {
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>Activity</th>
            <th>Wallet / network</th>
            <th>Category</th>
            <th className="align-right">Amount</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {items.map((tx) => (
            <tr key={tx.id} className={tx.excluded ? "excluded" : ""}>
              <td>
                <button
                  className="transaction-link"
                  onClick={() => onSelect(tx.id)}
                >
                  <span className={`activity-icon ${tx.type}`}>
                    {tx.type === "fee"
                      ? "≈"
                      : tx.direction === "incoming"
                        ? "↙"
                        : tx.direction === "internal"
                          ? "↔"
                          : "↗"}
                  </span>
                  <span>
                    <strong>
                      {tx.type[0]!.toUpperCase() + tx.type.slice(1)}
                      {tx.excluded ? " · Excluded" : ""}
                    </strong>
                    <small>{date(tx.occurredAt)}</small>
                  </span>
                </button>
              </td>
              <td>
                <strong>
                  {wallets.find((w) => w.id === tx.walletId)?.label ?? "Wallet"}
                </strong>
                <small>
                  {networkName(tx.runtime)} · {short(tx.transactionHash)}
                </small>
              </td>
              <td>
                <span className="category-chip">{tx.category}</span>
              </td>
              <td className="align-right amount">
                <strong>
                  {decimal(tx.amount)} {tx.assetCode}
                </strong>
                <small title={tx.assetIssuer}>
                  {tx.assetIssuer
                    ? `Issuer ${short(tx.assetIssuer)}`
                    : "Stellar native asset"}
                </small>
              </td>
              <td>
                <button
                  className="icon-button"
                  onClick={() => onSelect(tx.id)}
                  aria-label={`Open ${tx.type} ${tx.amount} ${tx.assetCode}`}
                >
                  ↗
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Detail({
  token,
  id,
  categories,
  onClose,
}: {
  token: string;
  id: string;
  categories: string[];
  onClose: () => void;
}) {
  const cache = useQueryClient();
  const tx = useQuery({
    queryKey: ["detail", id],
    queryFn: ({ signal }) =>
      request<Transaction>(token, `/transactions/${encodeURIComponent(id)}`, {
        signal,
      }),
  });
  const [note, setNote] = useState(""),
    [category, setCategory] = useState("Uncategorized"),
    [type, setType] = useState("unknown"),
    [excluded, setExcluded] = useState(false),
    [copied, setCopied] = useState(false);
  useEffect(() => {
    if (tx.data) {
      setNote(tx.data.note);
      setCategory(tx.data.category);
      setType(tx.data.type);
      setExcluded(tx.data.excluded);
    }
  }, [tx.data]);
  const save = useMutation({
    mutationFn: async () => {
      for (const [field, body, changed] of [
        ["category", { category }, category !== tx.data?.category],
        ["note", { note }, note !== tx.data?.note],
        ["exclude", { excluded }, excluded !== tx.data?.excluded],
        ["classification", { type }, type !== tx.data?.type],
      ] as const) {
        if (changed)
          await request(
            token,
            `/transactions/${encodeURIComponent(id)}/${field}`,
            { method: "PATCH", body: JSON.stringify(body) },
          );
      }
    },
    onSuccess: async () => {
      await Promise.all(
        ["transactions", "summary", "detail"].map((key) =>
          cache.invalidateQueries({ queryKey: [key] }),
        ),
      );
      onClose();
    },
  });
  const data = tx.data;
  return (
    <Modal title="Transaction details" onClose={onClose}>
      {tx.isPending ? (
        <Loading />
      ) : tx.isError ? (
        <ErrorBox error={tx.error} retry={() => tx.refetch()} />
      ) : (
        data && (
          <>
            <div className="detail-amount">
              {decimal(data.amount)} <span>{data.assetCode}</span>
            </div>
            <p className="muted">
              {date(data.occurredAt)} · {networkName(data.runtime)} ·{" "}
              {data.direction}
            </p>
            <dl className="facts">
              <dt>Transaction hash</dt>
              <dd>
                <code>{data.transactionHash}</code>
                <button
                  className="text-button"
                  onClick={() => {
                    navigator.clipboard
                      .writeText(data.transactionHash)
                      .then(() => setCopied(true))
                      .catch(() => setCopied(false));
                  }}
                >
                  {copied ? "Copied" : "Copy hash"}
                </button>{" "}
                <a
                  href={`https://stellar.expert/explorer/${data.runtime === "public" ? "public" : "testnet"}/tx/${data.transactionHash}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  View on explorer ↗
                </a>
              </dd>
              {data.assetIssuer && (
                <>
                  <dt>Asset issuer</dt>
                  <dd>
                    <code>{data.assetIssuer}</code>
                  </dd>
                </>
              )}
              {data.counterparty && (
                <>
                  <dt>Counterparty</dt>
                  <dd>
                    <code>{data.counterparty}</code>
                  </dd>
                </>
              )}
              {data.memo && (
                <>
                  <dt>Public memo</dt>
                  <dd>{data.memo}</dd>
                </>
              )}
            </dl>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                save.mutate();
              }}
            >
              {save.isError && <ErrorBox error={save.error} />}
              <div className="form-grid">
                <label>
                  Category
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    {categories.map((v) => (
                      <option key={v}>{v}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Classification
                  <select
                    value={type}
                    disabled={data.type === "fee"}
                    onChange={(e) => setType(e.target.value)}
                  >
                    {(data.type === "fee"
                      ? ["fee"]
                      : ["unknown", "income", "expense", "transfer"]
                    ).map((v) => (
                      <option key={v}>{v}</option>
                    ))}
                  </select>
                </label>
              </div>
              <p className="help">
                Unknown means public data doesn’t establish economic intent.
                Your correction stays private and survives re-sync.
              </p>
              <label>
                Private note
                <textarea
                  rows={3}
                  maxLength={2000}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Only in this local workspace…"
                />
              </label>
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={excluded}
                  onChange={(e) => setExcluded(e.target.checked)}
                />
                <span>Exclude this record from summaries and exports</span>
              </label>
              <div className="dialog-actions">
                <Button secondary onClick={onClose}>
                  Close
                </Button>
                <Button type="submit" disabled={save.isPending}>
                  {save.isPending ? "Saving…" : "Save changes"}
                </Button>
              </div>
            </form>
          </>
        )
      )}
    </Modal>
  );
}

function App() {
  const cache = useQueryClient();
  const [token, setToken] = useState(
    () => sessionStorage.getItem("expense-mart-token") ?? "",
  );
  const [notice, setNotice] = useState("");
  const [view, setView] = useState(() => location.hash.slice(1) || "dashboard");
  const [add, setAdd] = useState(false);
  const [detail, setDetail] = useState<string | null>(null);
  const [remove, setRemove] = useState<Wallet | null>(null);
  const [filters, setFilters] = useState<Filters>({ ...emptyFilters });
  const [page, setPage] = useState(1);
  const [actionError, setActionError] = useState<unknown>();
  const [categoryName, setCategoryName] = useState("");
  const [exporting, setExporting] = useState(false);
  useEffect(() => {
    const hash = () => setView(location.hash.slice(1) || "dashboard");
    window.addEventListener("hashchange", hash);
    return () => window.removeEventListener("hashchange", hash);
  }, []);
  function disconnect(message = "Workspace disconnected.") {
    sessionStorage.removeItem("expense-mart-token");
    setToken("");
    setDetail(null);
    setAdd(false);
    setRemove(null);
    setFilters({ ...emptyFilters });
    cache.clear();
    setNotice(message);
  }
  useEffect(() => {
    if (!token) return;
    const unauthorized = () =>
      disconnect("Your workspace token was rejected. Please reconnect.");
    window.addEventListener("workspace-unauthorized", unauthorized);
    return () =>
      window.removeEventListener("workspace-unauthorized", unauthorized);
  }, [token]);
  const wallets = useQuery({
    queryKey: ["wallets"],
    queryFn: ({ signal }) => request<Wallet[]>(token, "/wallets", { signal }),
    enabled: !!token,
    refetchInterval: (query) =>
      query.state.data?.some((w) =>
        ["pending", "syncing"].includes(w.syncStatus),
      )
        ? 700
        : 15000,
  });
  const categories = useQuery({
    queryKey: ["categories"],
    queryFn: ({ signal }) =>
      request<string[]>(token, "/categories", { signal }),
    enabled: !!token,
  });
  const activeFilters = view === "dashboard" ? emptyFilters : filters;
  const activePage = view === "dashboard" ? 1 : page;
  const summary = useQuery({
    queryKey: ["summary", activeFilters],
    queryFn: ({ signal }) =>
      request<Summary>(token, `/reports/summary?${query(activeFilters)}`, {
        signal,
      }),
    enabled: !!token,
  });
  const history = useQuery({
    queryKey: ["transactions", activeFilters, activePage],
    queryFn: ({ signal }) =>
      request<Page>(
        token,
        `/transactions?${query(activeFilters, activePage)}`,
        { signal },
      ),
    enabled: !!token,
  });
  const allWallets = wallets.data ?? [];
  const revision = allWallets
    .map((w) => `${w.id}:${w.lastSyncedAt}:${w.syncStatus}`)
    .join("|");
  useEffect(() => {
    if (token) {
      void cache.invalidateQueries({ queryKey: ["transactions"] });
      void cache.invalidateQueries({ queryKey: ["summary"] });
    }
  }, [revision, token, cache]);
  useEffect(() => {
    if (
      filters.walletId &&
      wallets.isSuccess &&
      !allWallets.some((w) => w.id === filters.walletId)
    ) {
      setFilters((f) => ({ ...f, walletId: "" }));
      setPage(1);
    }
  }, [revision, wallets.isSuccess]);
  const mutation = useMutation({
    mutationFn: async ({
      path,
      method = "POST",
      body,
    }: {
      path: string;
      method?: string;
      body?: unknown;
    }) =>
      request(token, path, {
        method,
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      }),
    onSuccess: async () => {
      setActionError(undefined);
      await Promise.all(
        ["wallets", "transactions", "summary", "categories"].map((key) =>
          cache.invalidateQueries({ queryKey: [key] }),
        ),
      );
    },
    onError: setActionError,
  });
  if (!token)
    return (
      <Connect
        notice={notice}
        onConnected={(value) => {
          cache.clear();
          sessionStorage.setItem("expense-mart-token", value);
          setToken(value);
          setNotice("");
        }}
      />
    );
  const changeFilters = (next: Filters) => {
    setFilters(next);
    setPage(1);
  };
  const go = (next: string) => {
    location.hash = next;
  };
  const title =
    (
      {
        dashboard: "Your Stellar overview",
        wallets: "Your connected wallets",
        transactions: "Transaction history",
        reports: "Reports & exports",
        categories: "Make it your own",
        settings: "Workspace settings",
        "open-source": "Built in the open",
      } as Record<string, string>
    )[view] ?? "Your Stellar overview";
  async function exportCsv() {
    setExporting(true);
    mutation.reset();
    setActionError(undefined);
    try {
      const response = await fetch(
        `/api/reports/export.csv?${query(filters)}`,
        { headers: { authorization: `Bearer ${token}` } },
      );
      if (!response.ok) {
        if (response.status === 401)
          disconnect("Your workspace token was rejected.");
        throw new Error("Export failed. Please retry.");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "expense-tracker.csv";
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      setActionError(error);
    } finally {
      setExporting(false);
    }
  }
  return (
    <div className="app">
      <aside className="sidebar">
        <a className="brand" href="#dashboard">
          <span className="brand-mark">
            e<span>m</span>
          </span>
          expense<span className="brand-light">mart</span>
        </a>
        <div className="workspace-name">
          <span className="workspace-avatar">P</span>
          <div>
            Personal workspace<small>Local · single workspace</small>
          </div>
          <span className="live-dot" />
        </div>
        <span className="nav-label">WORKSPACE</span>
        <nav aria-label="Main navigation">
          {nav.map(([key, label, path]) => (
            <a
              key={key}
              href={`#${key}`}
              className={view === key ? "active" : ""}
              aria-current={view === key ? "page" : undefined}
            >
              <Icon path={path} />
              {label}
              {key === "wallets" && (
                <span className="nav-count">{allWallets.length}</span>
              )}
            </a>
          ))}
          <span className="mobile-extra">
            <a href="#settings">Settings</a>
            <a href="#open-source">Contribute</a>
          </span>
        </nav>
        <div className="sidebar-bottom">
          <a href="#open-source">↗ Contributor guide</a>
          <a
            href="#settings"
            aria-current={view === "settings" ? "page" : undefined}
          >
            ⚙ Workspace settings
          </a>
          <div className="privacy-card">
            <Icon path="M12 3l8 4v6c0 4-8 8-8 8s-8-4-8-8V7z" />
            <strong>Your keys, always yours.</strong>
            <p>We only read public activity. Nothing to sign.</p>
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <span>
            Workspace <span className="slash">/</span>{" "}
            {view === "dashboard" ? "Overview" : view.replace("-", " ")}
          </span>
          <span className="network-pill">
            <i /> Stellar · read only
          </span>
        </header>
        <main id="main-content">
          <div className="page-heading">
            <div>
              <span className="eyebrow">A CLEARER PICTURE</span>
              <h1>{title}</h1>
              <p>
                {view === "wallets"
                  ? "One place for public addresses, sync status, and history."
                  : view === "transactions"
                    ? "Follow the details. Keep the context private."
                    : "Your public wallet activity, with room for your private context."}
              </p>
            </div>
            <Button onClick={() => setAdd(true)}>
              <span aria-hidden="true">＋</span> Connect wallet
            </Button>
          </div>
          {notice && (
            <div role="status" className="notice">
              {notice}
              <button
                className="icon-button"
                onClick={() => setNotice("")}
                aria-label="Dismiss notification"
              >
                ×
              </button>
            </div>
          )}
          {Boolean(actionError) && (
            <ErrorBox
              error={actionError}
              retry={() => {
                if (mutation.isError && mutation.variables)
                  mutation.mutate(mutation.variables);
                else void exportCsv();
              }}
            />
          )}
          {wallets.isError ? (
            <ErrorBox error={wallets.error} retry={() => wallets.refetch()} />
          ) : wallets.isPending ? (
            <Loading />
          ) : (
            <>
              {view === "wallets" ? (
                <>
                  <div className="section-head">
                    <h2>
                      Wallets{" "}
                      <span className="muted">({allWallets.length})</span>
                    </h2>
                    <span className="muted">
                      Mainnet and testnet stay separate
                    </span>
                  </div>
                  {!allWallets.length ? (
                    <Empty
                      title="A little clarity starts here."
                      action={
                        <Button onClick={() => setAdd(true)}>
                          Connect your first wallet
                        </Button>
                      }
                    >
                      Add a public Stellar address to see its payments and fees.
                      No keys, no signing, no custody.
                    </Empty>
                  ) : (
                    <div className="wallet-grid">
                      {allWallets.map((w) => (
                        <article className="panel wallet-card" key={w.id}>
                          <div className="wallet-top">
                            <span className="wallet-symbol">
                              <Icon path="M3 5h18v15H3zM3 9h18M16 12h5v5h-5z" />
                            </span>
                            <span className="network-label">
                              {networkName(w.network)}
                            </span>
                          </div>
                          <h2>{w.label}</h2>
                          <code className="wallet-address" title={w.address}>
                            {short(w.address)}
                          </code>
                          <Status wallet={w} />
                          <p className="help">
                            {w.lastSyncedAt
                              ? `Last sync ${date(w.lastSyncedAt)}`
                              : "Waiting for the first sync"}
                          </p>
                          {w.error && (
                            <p className="wallet-error" role="alert">
                              {w.error}
                            </p>
                          )}
                          {w.syncStatus === "partial" && (
                            <p className="help">
                              This batch is saved. Sync again to load the next
                              history page.
                            </p>
                          )}
                          {w.warnings.map((message) => (
                            <p className="warning" key={message}>
                              {message}
                            </p>
                          ))}
                          <div className="wallet-actions">
                            <Button
                              secondary
                              disabled={
                                mutation.isPending ||
                                ["pending", "syncing"].includes(w.syncStatus)
                              }
                              onClick={() =>
                                mutation.mutate({
                                  path: `/wallets/${w.id}/sync`,
                                })
                              }
                            >
                              {w.syncStatus === "failed"
                                ? "Retry sync"
                                : "Sync wallet"}
                            </Button>
                            <button
                              className="text-button"
                              onClick={() => {
                                changeFilters({
                                  ...emptyFilters,
                                  walletId: w.id,
                                });
                                go("transactions");
                              }}
                            >
                              View history →
                            </button>
                          </div>
                          <button
                            className="text-button danger"
                            onClick={() => setRemove(w)}
                          >
                            Remove wallet
                          </button>
                        </article>
                      ))}
                    </div>
                  )}
                </>
              ) : view === "transactions" ? (
                <>
                  <FilterBar
                    filters={filters}
                    setFilters={changeFilters}
                    wallets={allWallets}
                    categories={categories.data ?? []}
                  />
                  <section className="panel">
                    <div className="section-head inset">
                      <h2>All activity</h2>
                      <span className="muted">
                        {history.data?.total ?? 0} records
                      </span>
                    </div>
                    {history.isPending ? (
                      <Loading />
                    ) : history.isError ? (
                      <ErrorBox
                        error={history.error}
                        retry={() => history.refetch()}
                      />
                    ) : history.data.items.length ? (
                      <>
                        <TransactionsTable
                          items={history.data.items}
                          wallets={allWallets}
                          onSelect={setDetail}
                        />
                        <div className="pagination">
                          <span>
                            Page {page} · {history.data.total} records
                          </span>
                          <div>
                            <Button
                              secondary
                              disabled={page <= 1}
                              onClick={() => setPage((p) => p - 1)}
                            >
                              Previous
                            </Button>
                            <Button
                              secondary
                              disabled={
                                page * history.data.pageSize >=
                                history.data.total
                              }
                              onClick={() => setPage((p) => p + 1)}
                            >
                              Next
                            </Button>
                          </div>
                        </div>
                      </>
                    ) : (
                      <Empty
                        title={
                          Object.values(filters).some(Boolean)
                            ? "No matching activity."
                            : "No transactions yet."
                        }
                        action={
                          <Button
                            secondary
                            onClick={() =>
                              Object.values(filters).some(Boolean)
                                ? changeFilters({ ...emptyFilters })
                                : go("wallets")
                            }
                          >
                            {Object.values(filters).some(Boolean)
                              ? "Clear filters"
                              : "Check your wallets"}
                          </Button>
                        }
                      >
                        {Object.values(filters).some(Boolean)
                          ? "Try a wider date range or clear the filters."
                          : "Connect a wallet and let its first sync finish. Failed syncs can be retried from Wallets."}
                      </Empty>
                    )}
                  </section>
                </>
              ) : view === "reports" ? (
                <>
                  <FilterBar
                    filters={filters}
                    setFilters={changeFilters}
                    wallets={allWallets}
                    categories={categories.data ?? []}
                  />
                  <div className="section-head">
                    <h2>Filtered summaries</h2>
                    <Button
                      secondary
                      onClick={exportCsv}
                      disabled={exporting || !summary.data?.recordCount}
                    >
                      {exporting ? "Exporting…" : "Download CSV"}
                    </Button>
                  </div>
                  <SummaryCards
                    summary={summary.data}
                    loading={summary.isPending}
                    error={summary.error}
                    retry={() => summary.refetch()}
                  />
                  <p className="help">
                    Exports use these same filters, preserve exact amounts and
                    issuer identity, and omit excluded records. Totals remain
                    separate by wallet, network and asset.
                  </p>
                </>
              ) : view === "categories" ? (
                <section className="panel padded">
                  <h2>A place for every payment.</h2>
                  <p className="muted">
                    Categories are private labels in this workspace. Choose one
                    in a transaction’s details.
                  </p>
                  {categories.isError && (
                    <ErrorBox
                      error={categories.error}
                      retry={() => categories.refetch()}
                    />
                  )}
                  <form
                    className="inline-form"
                    onSubmit={(e) => {
                      e.preventDefault();
                      mutation.mutate(
                        { path: "/categories", body: { name: categoryName } },
                        { onSuccess: () => setCategoryName("") },
                      );
                    }}
                  >
                    <label>
                      New category
                      <input
                        value={categoryName}
                        onChange={(e) => setCategoryName(e.target.value)}
                        required
                        maxLength={40}
                        placeholder="e.g. Project expenses"
                      />
                    </label>
                    <Button type="submit" disabled={mutation.isPending}>
                      Add category
                    </Button>
                  </form>
                  <div className="category-list">
                    {categories.data?.map((name) => (
                      <span className="category-chip" key={name}>
                        {name}
                      </span>
                    ))}
                  </div>
                </section>
              ) : view === "settings" ? (
                <section className="panel padded prose">
                  <h2>Your workspace, your context.</h2>
                  <p>
                    This local application uses a shared workspace token.
                    Everyone with that token can access the same wallets, notes
                    and reports. Separate accounts are not enabled.
                  </p>
                  <h3>Privacy & data</h3>
                  <p>
                    Only public Stellar payment activity is fetched. Notes,
                    category choices and corrections are stored in the backend’s
                    local database and are never sent to Stellar. Removing a
                    wallet deletes its local records and notes. The public
                    ledger remains unchanged.
                  </p>
                  <p>
                    Disconnecting clears this tab’s token and cached data; it
                    does not delete wallet records.
                  </p>
                  <Button secondary onClick={() => disconnect()}>
                    Disconnect workspace
                  </Button>
                </section>
              ) : view === "open-source" ? (
                <section className="panel padded prose">
                  <span className="eyebrow">STELLAR FIRST · OPEN SOURCE</span>
                  <h2>Three repositories. One clear view.</h2>
                  <p>
                    The frontend calls only the backend. The backend handles
                    private context and sync orchestration. The reusable onchain
                    library reads and processes public Stellar records.
                  </p>
                  {["frontend", "backend", "onchain"].map((repo) => (
                    <p key={repo}>
                      <a
                        href={`https://github.com/expense-mart/expense-tracker-${repo}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        expense-tracker-{repo} ↗
                      </a>
                    </p>
                  ))}
                  <p>
                    Start with each repository’s README for setup, tests and
                    current limitations. The MVP is read-only: no signing,
                    custody, swaps or smart contracts.
                  </p>
                </section>
              ) : (
                <>
                  <div className="metrics">
                    <div className="metric">
                      <span>Connected wallets</span>
                      <strong>
                        {allWallets.length.toString().padStart(2, "0")}
                      </strong>
                      <small>Public addresses, privately organized</small>
                    </div>
                    <div className="metric">
                      <span>Records in your view</span>
                      <strong>{summary.data?.recordCount ?? "—"}</strong>
                      <small>Payments and separate network fees</small>
                    </div>
                    <div className="metric">
                      <span>Ready for your context</span>
                      <strong>{summary.data?.reviewCount ?? "—"}</strong>
                      <small>Unknown until you classify them</small>
                    </div>
                  </div>
                  {!allWallets.length ? (
                    <Empty
                      title="Make your first connection."
                      action={
                        <Button onClick={() => setAdd(true)}>
                          Connect your first wallet
                        </Button>
                      }
                    >
                      A public Stellar address is all you need. We’ll turn its
                      payment history into a clearer picture.
                    </Empty>
                  ) : (
                    <>
                      <div className="section-head">
                        <h2>Activity by asset</h2>
                        <a href="#reports">Explore reports ↗</a>
                      </div>
                      <SummaryCards
                        summary={summary.data}
                        loading={summary.isPending}
                        error={summary.error}
                        retry={() => summary.refetch()}
                      />
                      {allWallets.some((w) => w.syncStatus === "failed") && (
                        <div className="warning">
                          A wallet sync needs attention.{" "}
                          <a href="#wallets">Review and retry →</a>
                        </div>
                      )}
                      {allWallets.some((w) =>
                        ["pending", "syncing"].includes(w.syncStatus),
                      ) && (
                        <p role="status" className="notice">
                          Reading public history… Your overview will update
                          automatically.
                        </p>
                      )}
                      <section className="panel">
                        <div className="section-head inset">
                          <h2>Recent activity</h2>
                          <a href="#transactions">View all →</a>
                        </div>
                        {history.isPending ? (
                          <Loading />
                        ) : history.isError ? (
                          <ErrorBox
                            error={history.error}
                            retry={() => history.refetch()}
                          />
                        ) : history.data.items.length ? (
                          <TransactionsTable
                            items={history.data.items.slice(0, 5)}
                            wallets={allWallets}
                            onSelect={setDetail}
                          />
                        ) : (
                          <Empty title="Your next chapter starts here.">
                            Your wallet is connected. Transactions appear after
                            a successful sync; an empty wallet will stay empty.
                          </Empty>
                        )}
                      </section>
                    </>
                  )}
                </>
              )}
            </>
          )}
          <footer className="page-footer">
            <span>◌ Read-only. Non-custodial. Stellar first.</span>
            <span>
              Amounts stay in their original asset · Dates shown in your
              timezone
            </span>
          </footer>
        </main>
      </div>
      {add && (
        <AddWallet
          token={token}
          onClose={() => setAdd(false)}
          onAdded={() => {
            setAdd(false);
            setNotice(
              "Wallet connected. Check its status on the Wallets page.",
            );
            go("wallets");
          }}
        />
      )}
      {detail && (
        <Detail
          token={token}
          id={detail}
          categories={categories.data ?? ["Uncategorized"]}
          onClose={() => setDetail(null)}
        />
      )}
      {remove && (
        <Modal title="Remove this wallet?" onClose={() => setRemove(null)}>
          {mutation.isError && <ErrorBox error={mutation.error} />}
          <p>
            Remove <strong>{remove.label}</strong> and its saved activity, notes
            and category choices from this workspace? This will not change the
            Stellar ledger.
          </p>
          <div className="dialog-actions">
            <Button secondary onClick={() => setRemove(null)}>
              Keep wallet
            </Button>
            <Button
              disabled={mutation.isPending}
              onClick={() =>
                mutation.mutate(
                  { path: `/wallets/${remove.id}`, method: "DELETE" },
                  {
                    onSuccess: () => {
                      setRemove(null);
                      setNotice("Wallet and local records removed.");
                    },
                  },
                )
              }
            >
              Remove wallet
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
function SummaryCards({
  summary,
  loading,
  error,
  retry,
}: {
  summary: Summary | undefined;
  loading: boolean;
  error: unknown;
  retry: () => void;
}) {
  if (loading) return <Loading />;
  if (error) return <ErrorBox error={error} retry={retry} />;
  const items =
    summary?.wallets.flatMap(({ wallet, summary }) =>
      summary.assets.map((asset) => ({ wallet, asset })),
    ) ?? [];
  if (!items.length)
    return (
      <div className="panel summary-empty">
        <p className="muted">
          No synced activity in this view. Your asset summaries will appear
          here.
        </p>
      </div>
    );
  return (
    <div className="asset-grid">
      {items.map(({ wallet, asset }) => (
        <article
          className="panel asset-card"
          key={`${wallet.id}:${asset.assetCode}:${asset.assetIssuer}`}
        >
          <div className="section-head">
            <span className="asset-symbol">{asset.assetCode.slice(0, 1)}</span>
            <span className="network-label">{networkName(wallet.network)}</span>
          </div>
          <h3>
            {asset.assetCode} <span>{wallet.label}</span>
          </h3>
          <p className="issuer" title={asset.assetIssuer}>
            {asset.assetIssuer
              ? `Issuer ${short(asset.assetIssuer)}`
              : "Stellar native asset"}
          </p>
          <dl className="asset-totals">
            <div>
              <dt>Income</dt>
              <dd>
                {decimal(asset.byType.income)} <small>{asset.assetCode}</small>
              </dd>
            </div>
            <div>
              <dt>Expense</dt>
              <dd>
                {decimal(asset.byType.expense)} <small>{asset.assetCode}</small>
              </dd>
            </div>
            <div>
              <dt>Transfer</dt>
              <dd>
                {decimal(asset.byType.transfer)}{" "}
                <small>{asset.assetCode}</small>
              </dd>
            </div>
            <div>
              <dt>Network fees</dt>
              <dd>
                {decimal(asset.byType.fee)} <small>{asset.assetCode}</small>
              </dd>
            </div>
            <div className="unknown-total">
              <dt>Unknown · review needed</dt>
              <dd>
                {decimal(asset.byType.unknown)} <small>{asset.assetCode}</small>
              </dd>
            </div>
          </dl>
          <p className="help">
            Incoming {decimal(asset.byDirection.incoming)} · Outgoing{" "}
            {decimal(asset.byDirection.outgoing)} {asset.assetCode}
          </p>
        </article>
      ))}
    </div>
  );
}

export default App;
