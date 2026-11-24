import {
  defaultShouldDehydrateQuery,
  QueryClient,
} from "@tanstack/react-query";

/**
 * Fábrica do QueryClient, compartilhada entre servidor e cliente.
 *
 * Por que uma fábrica e não uma instância exportada? No servidor, uma instância
 * global seria compartilhada entre requisições de usuários diferentes — ou seja,
 * vazamento de cache entre pessoas. Cada render no servidor cria o seu próprio.
 */
export function criarQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        /**
         * 30s de `staleTime`: sem isso, o React Query consideraria os dados
         * vindos do SSR imediatamente "velhos" e dispararia um refetch logo
         * após a hidratação — jogando no lixo o trabalho feito no servidor.
         */
        staleTime: 30 * 1000,
        retry: 1,
      },
      dehydrate: {
        /**
         * Por padrão o React Query só desidrata queries com status `success`.
         * Incluindo as `pending` conseguimos fazer streaming: a página começa a
         * ser enviada e a query ainda em voo é "retomada" no cliente.
         */
        shouldDehydrateQuery: (query) =>
          defaultShouldDehydrateQuery(query) || query.state.status === "pending",
      },
    },
  });
}
