import { criarRouter } from "@/server/trpc/init";
import { tarefasRouter } from "@/server/trpc/routers/tarefas";

/**
 * Router raiz. Tudo fica sob namespaces (`tarefas.listar`, `tarefas.criar`, ...),
 * então adicionar um novo domínio no futuro é só acrescentar uma chave aqui.
 */
export const appRouter = criarRouter({
  tarefas: tarefasRouter,
});

/**
 * ESTE tipo é o coração do tRPC: é ele (e só ele) que atravessa a fronteira
 * cliente/servidor. Nenhum código do backend é enviado ao browser — apenas os
 * tipos, que desaparecem na compilação. É daqui que vem o autocomplete
 * end-to-end sem geração de código.
 */
export type AppRouter = typeof appRouter;
