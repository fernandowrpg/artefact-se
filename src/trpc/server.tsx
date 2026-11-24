import "server-only";

import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { createTRPCOptionsProxy } from "@trpc/tanstack-react-query";
import { cache } from "react";
import { criarContexto } from "@/server/trpc/init";
import { appRouter } from "@/server/trpc/routers/_app";
import { criarQueryClient } from "@/trpc/query-client";

/**
 * Ponte entre os Server Components e o tRPC.
 *
 * Ponto central do SSR aqui: no servidor NÃO fazemos requisição HTTP para a
 * própria aplicação. O `createTRPCOptionsProxy` recebe `router` + `ctx` e chama
 * o procedure como função JavaScript comum, no mesmo processo. Zero latência de
 * rede, zero porta aberta para si mesmo.
 */

/**
 * `cache()` do React: garante UM QueryClient por requisição. Se dois Server
 * Components da mesma página pré-carregarem dados, ambos escrevem no mesmo
 * cache — e tudo é desidratado junto.
 */
export const obterQueryClientDoServidor = cache(criarQueryClient);

export const trpcServidor = createTRPCOptionsProxy({
  router: appRouter,
  ctx: criarContexto,
  queryClient: obterQueryClientDoServidor,
});

/**
 * Executa a query no servidor e guarda o resultado no QueryClient da requisição.
 *
 * Decisão importante: a função é `async` e o chamador dá `await` nela.
 *
 * Existe a alternativa de NÃO esperar (disparar e seguir), que habilita
 * streaming: o HTML sai mais rápido e a query "em voo" é desidratada no estado
 * `pending`. O custo é que o primeiro HTML traz o esqueleto de carregamento, e
 * não a lista. Como o desafio pede explicitamente SSR da listagem, esperamos o
 * dado — assim o HTML entregue ao browser já contém as tarefas renderizadas
 * (verificável em "ver código-fonte" ou com o JavaScript desligado).
 *
 * A assinatura é intencionalmente frouxa (`queryKey: readonly unknown[]`):
 * as options do tRPC para query normal e para query infinita têm tipos
 * diferentes, e a função precisa aceitar as duas. A tipagem forte continua
 * garantida no ponto de uso — quem monta as options é o proxy tipado.
 */
type OpcoesDePrefetch = { queryKey: readonly unknown[] };

export async function prefetch(queryOptions: OpcoesDePrefetch) {
  const queryClient = obterQueryClientDoServidor();

  // Queries infinitas têm shape de cache diferente das normais. O tRPC marca
  // isso na própria queryKey (`[["tarefas","listar"], { type: "infinite" }]`),
  // então inspecionamos a chave para escolher o método correto.
  const marcador = queryOptions.queryKey[1] as { type?: string } | undefined;

  if (marcador?.type === "infinite") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await queryClient.prefetchInfiniteQuery(queryOptions as any);
  } else {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await queryClient.prefetchQuery(queryOptions as any);
  }
}

/**
 * Embrulha a árvore de Client Components com o cache já populado no servidor.
 * O cliente monta a UI com os dados prontos — sem spinner na primeira pintura.
 */
export function HidratarCliente({ children }: { children: React.ReactNode }) {
  const queryClient = obterQueryClientDoServidor();
  return <HydrationBoundary state={dehydrate(queryClient)}>{children}</HydrationBoundary>;
}
