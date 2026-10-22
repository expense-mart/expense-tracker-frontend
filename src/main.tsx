import React from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App";
import { ApiError } from "./api";
import "./styles.css";
const client = new QueryClient({
  defaultOptions: {
    mutations: { networkMode: "always" },
    queries: {
      networkMode: "always",
      retry: (count, error) =>
        !(error instanceof ApiError && error.status === 401) && count < 1,
      staleTime: 10000,
    },
  },
});
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={client}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>,
);
