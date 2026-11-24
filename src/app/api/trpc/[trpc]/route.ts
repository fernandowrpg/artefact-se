import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { criarContexto } from "@/server/trpc/init";
import { appRouter } from "@/server/trpc/routers/_app";

/**
 * Único endpoint HTTP da aplicação: todo o tRPC trafega por /api/trpc/*.
 *
 * Usamos o `fetchRequestHandler` (adapter Web Fetch) porque o App Router do
 * Next 15 trabalha com `Request`/`Response` padrão — o mesmo handler serve para
 * Node e para runtimes edge, sem adapter específico.
 */
function handler(req: Request) {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: criarContexto,
  });
}

export { handler as GET, handler as POST };
