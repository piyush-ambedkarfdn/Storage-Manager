"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          // Data stays in memory for 10 minutes after a page is left, so switching tabs and coming back is instant
          // (it is refreshed in the background once it is 30 seconds old).
          queries: { staleTime: 30_000, gcTime: 10 * 60_000, refetchOnWindowFocus: false, refetchOnReconnect: true, retry: 1 },
          mutations: { retry: 0 },
        },
      }),
  );
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
