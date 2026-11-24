import Link from "next/link";
import { notFound } from "next/navigation";
import { TRPCError } from "@trpc/server";
import { FormularioDeTarefa } from "@/components/formulario-de-tarefa";
import { criarContexto } from "@/server/trpc/init";
import { appRouter } from "@/server/trpc/routers/_app";

export const dynamic = "force-dynamic";

/**
 * Página de edição.
 *
 * Aqui o dado é buscado com `await` no servidor (não com `prefetch`): o
 * formulário precisa dos valores iniciais JÁ no primeiro HTML, senão os inputs
 * apareceriam vazios e "pulariam" ao hidratar.
 *
 * Usamos um caller direto do router (`appRouter.createCaller`) em vez de HTTP —
 * é a mesma ideia do options proxy: chamada de função no mesmo processo.
 *
 * Em Next 15 `params` é uma Promise (mudança de API em relação ao 14), por isso
 * o `await params`.
 */
export default async function PaginaEditarTarefa({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const caller = appRouter.createCaller(await criarContexto());

  try {
    const tarefa = await caller.tarefas.porId({ id });

    return (
      <main>
        <header className="cabecalho">
          <div>
            <h1>Editar tarefa</h1>
            <p>Alterações são salvas no backend em memória via tRPC.</p>
          </div>
          <Link href="/" className="botao">
            Voltar
          </Link>
        </header>

        <FormularioDeTarefa
          tarefa={{
            id: tarefa.id,
            titulo: tarefa.titulo,
            descricao: tarefa.descricao,
            concluida: tarefa.concluida,
          }}
        />
      </main>
    );
  } catch (erro) {
    // Traduzimos o NOT_FOUND do tRPC para o 404 nativo do Next, que renderiza
    // a página de "não encontrado" com o status HTTP correto.
    if (erro instanceof TRPCError && erro.code === "NOT_FOUND") {
      notFound();
    }
    throw erro;
  }
}
