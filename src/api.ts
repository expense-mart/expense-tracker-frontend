export type Wallet = {
  id: string;
  label: string;
  address: string;
  network: "testnet" | "public";
  syncStatus: "pending" | "syncing" | "synced" | "partial" | "failed";
  lastSyncedAt: string | null;
  error: string | null;
  warnings: string[];
};
export type Transaction = {
  id: string;
  walletId: string;
  runtime: "testnet" | "public";
  walletAddress: string;
  transactionHash: string;
  operationId: string;
  type: "income" | "expense" | "transfer" | "fee" | "unknown";
  direction: "incoming" | "outgoing" | "internal" | "unknown";
  assetCode: string;
  assetIssuer?: string;
  amount: string;
  memo?: string;
  counterparty?: string;
  occurredAt: string;
  category: string;
  note: string;
  excluded: boolean;
};
export type AssetSummary = {
  assetCode: string;
  assetIssuer?: string;
  byType: Record<Transaction["type"], string>;
  byDirection: Record<Transaction["direction"], string>;
};
export type Summary = {
  wallets: {
    wallet: Wallet;
    summary: { transactionCount: number; assets: AssetSummary[] };
  }[];
  recordCount: number;
  reviewCount: number;
};
export type Page = {
  items: Transaction[];
  total: number;
  page: number;
  pageSize: number;
};
export type Filters = {
  walletId: string;
  asset: string;
  type: string;
  direction: string;
  from: string;
  to: string;
  q: string;
  category: string;
};
export const emptyFilters: Filters = {
  walletId: "",
  asset: "",
  type: "",
  direction: "",
  from: "",
  to: "",
  q: "",
  category: "",
};
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}
export async function request<T>(
  token: string,
  path: string,
  options: RequestInit = {},
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      ...options,
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${token}`,
        ...options.headers,
      },
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError")
      throw error;
    throw new ApiError(
      0,
      "NETWORK_ERROR",
      "The backend is unavailable. Check that it is running and try again.",
    );
  }
  let result;
  try {
    result = await response.json();
  } catch {
    throw new ApiError(
      response.status,
      "INVALID_RESPONSE",
      "The backend returned an unexpected response. Please retry.",
    );
  }
  if (!response.ok || result.success !== true) {
    if (response.status === 401)
      window.dispatchEvent(new Event("workspace-unauthorized"));
    throw new ApiError(
      response.status,
      result.error?.code ?? "REQUEST_FAILED",
      result.error?.message ?? "Request failed. Please retry.",
    );
  }
  return result.data as T;
}
export function query(filters: Filters, page?: number) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(filters)) if (v) params.set(k, v);
  if (page) params.set("page", String(page));
  return params.toString();
}
export const short = (text: string) =>
  text.length > 16 ? `${text.slice(0, 7)}…${text.slice(-6)}` : text;
export const networkName = (network: string) =>
  network === "public" ? "Mainnet" : "Testnet";
export const date = (text: string) =>
  new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(text));
export function decimal(text: string) {
  const [whole, fraction] = text.split(".");
  return (
    whole!.replace(/\B(?=(\d{3})+(?!\d))/g, ",") +
    (fraction ? "." + fraction : "")
  );
}
