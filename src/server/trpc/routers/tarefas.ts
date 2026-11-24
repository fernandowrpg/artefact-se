import { TRPCError } from "@trpc/server";
import {
  atualizarTarefaSchema,
  criarTarefaSchema,
  idSchema,
  listarTarefasSchema,
} from "@/lib/schemas";
import { criarRouter, procedimentoPublico } from "@/server/trpc/init";

/**
 * Router de tarefas: CRUD completo exposto via tRPC.
 *
 * Convenção: `query` para leitura (cacheável, vai como GET) e `mutation` para
 * escrita (vai como POST). Essa distinção é o que permite ao React Query cachear
 * as listagens e invalidar o cache só depois de uma escrita.
 */
export const tarefasRouter = criarRouter({
  /** Listagem paginada por cursor — consumida com `useInfiniteQuery`. */
  listar: procedimentoPublico
    .input(listarTarefasSchema)
    .query(({ ctx, input }) => {
      return ctx.tarefas.listar({ limite: input.limite, cursor: input.cursor });
    }),

  /** Busca pontual, usada para pré-carregar o formulário de edição no servidor. */
  porId: procedimentoPublico.input(idSchema).query(({ ctx, input }) => {
    const tarefa = ctx.tarefas.buscarPorId(input.id);
    if (!tarefa) {
      // NOT_FOUND vira HTTP 404 automaticamente no adapter do tRPC.
      throw new TRPCError({
        code: "NOT_FOUND",
        message: `Tarefa ${input.id} não encontrada.`,
      });
    }
    return tarefa;
  }),

  /**
   * Criação. A regra "não criar sem título" é garantida pelo schema no `.input()`:
   * se o título vier vazio, o tRPC rejeita com BAD_REQUEST antes de executar o
   * corpo do procedure — a validação não depende de o frontend se comportar bem.
   */
  criar: procedimentoPublico
    .input(criarTarefaSchema)
    .mutation(({ ctx, input }) => {
      return ctx.tarefas.criar(input);
    }),

  atualizar: procedimentoPublico
    .input(atualizarTarefaSchema)
    .mutation(({ ctx, input }) => {
      const { id, ...dados } = input;
      const atualizada = ctx.tarefas.atualizar(id, dados);
      if (!atualizada) {
        // Cenário pedido explicitamente no desafio: atualizar tarefa inexistente.
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Não foi possível atualizar: a tarefa não existe (ou já foi removida).",
        });
      }
      return atualizada;
    }),

  deletar: procedimentoPublico.input(idSchema).mutation(({ ctx, input }) => {
    const removida = ctx.tarefas.remover(input.id);
    if (!removida) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Não foi possível excluir: a tarefa não existe (ou já foi removida).",
      });
    }
    return { id: input.id };
  }),
});
