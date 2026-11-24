"use client";

import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import { createTRPCClient, httpBatchLink } from "@trpc/client";
import { createTRPCContext } from "@trpc/tanstack-react-query";
import { useState } from "react";
import type { AppRouter } from "@/server/trpc/routers/_app";
import { criarQueryClient } from "@/trpc/query-client";

/**
 * `createTRPCContext` gera o par Provider/hook já tipado pelo `AppRouter`.
 * `useTRPC()` devolve um "options proxy": `trpc.tarefas.listar.queryOptions({...})`
 * produz as options que vão direto para `useQuery`/`useInfiniteQuery`.
 *
 * Decisão: essa é a integração atual recomendada do tRPC v11 com o TanStack
 * Query v5. A alternativa antiga (`createTRPCReact` + `trpc.x.useQuery()`)
 * esconde o React Query atrás de hooks próprios; com o options proxy usamos os
 * hooks oficiais do React Query — o que mantém acesso a tudo que ele oferece.
 */
export const { TRPCProvider, useTRPC } = createTRPCContext<AppRouter>();

let clienteDoBrowser: QueryClient | undefined;

function obterQueryClient() {
  if (typeof window === "undefined") {
    // Servidor: sempre um novo, para não compartilhar cache entre requisições.
    return criarQueryClient();
  }
  // Browser: um singleton. Se recriássemos a cada render, o Suspense poderia
  // descartar o cache no meio da hidratação inicial.
  clienteDoBrowser ??= criarQueryClient();
  return clienteDoBrowser;
}

function obterUrlBase() {
  // No browser, caminho relativo basta (mesma origem).
  if (typeof window !== "undefined") return "";
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return `http://localhost:${process.env.PORT ?? 3000}`;
}

export function ProvedorTRPC({ children }: { children: React.ReactNode }) {
  const queryClient = obterQueryClient();

  // `useState` com inicializador: o cliente tRPC é criado uma única vez por
  // montagem, e não a cada re-render do provider.
  const [trpcClient] = useState(() =>
    createTRPCClient<AppRouter>({
      links: [
        /**
         * `httpBatchLink` junta chamadas feitas no mesmo tick em UMA requisição
         * HTTP. Na prática: abrir a listagem e pedir outra query ao mesmo tempo
         * custa 1 round-trip em vez de 2.
         */
        httpBatchLink({ url: `${obterUrlBase()}/api/trpc` }),
      ],
    }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <TRPCProvider trpcClient={trpcClient} queryClient={queryClient}>
        {children}
      </TRPCProvider>
    </QueryClientProvider>
  );
}
