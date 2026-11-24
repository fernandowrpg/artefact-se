import Link from "next/link";
import { ListaDeTarefas } from "@/components/lista-de-tarefas";
import { proximoCursorDaPagina, TAMANHO_DA_PAGINA } from "@/lib/constantes";
import { HidratarCliente, prefetch, trpcServidor } from "@/trpc/server";

/**
 * Página de listagem — este é o ponto onde o SSR do desafio acontece.
 *
 * Fluxo:
 * 1. Este Server Component chama `prefetch` com as mesmas `queryOptions` que o
 *    componente de cliente vai usar;
 * 2. o tRPC executa o procedure localmente (sem HTTP) e guarda o resultado no
 *    QueryClient do servidor;
 * 3. `HidratarCliente` serializa esse cache junto com o HTML;
 * 4. no browser, `useInfiniteQuery` encontra os dados já no cache e renderiza a
 *    primeira página sem nenhum spinner e sem requisição adicional.
 *
 * O HTML entregue já contém as tarefas — dá para conferir com "ver código-fonte"
 * ou desligando o JavaScript.
 */

// `force-dynamic`: a lista muda a cada requisição (store em memória), então não
// queremos que o Next sirva uma versão estática desta rota.
export const dynamic = "force-dynamic";

export default async function PaginaDeTarefas() {
  await prefetch(
    trpcServidor.tarefas.listar.infiniteQueryOptions(
      { limite: TAMANHO_DA_PAGINA },
      // Mesmas options usadas no cliente: é o que garante que a queryKey
      // pré-carregada aqui seja exatamente a que o componente vai ler.
      { getNextPageParam: proximoCursorDaPagina },
    ),
  );

  return (
    <main>
      <header className="cabecalho">
        <div>
          <h1>Tarefas</h1>
          <p>Lista pré-carregada no servidor (SSR) e paginada conforme você rola a página.</p>
        </div>
        <Link href="/tarefas/nova" className="botao botao--primario">
          Nova tarefa
        </Link>
      </header>

      <HidratarCliente>
        <ListaDeTarefas />
      </HidratarCliente>
    </main>
  );
}
