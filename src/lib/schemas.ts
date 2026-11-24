import { z } from "zod";

/**
 * Schemas compartilhados entre backend e frontend.
 *
 * Decisão de projeto: o Zod é a ÚNICA fonte de verdade das regras de validação.
 * O backend usa estes schemas no `.input()` dos procedures do tRPC e o frontend
 * usa os MESMOS schemas no formulário. Assim é impossível as duas validações
 * divergirem — e o tipo TypeScript é inferido do schema (`z.infer`), não escrito à mão.
 */

/** Título é obrigatório: `trim` + `min(1)` rejeita também strings só com espaços. */
const tituloSchema = z
  .string()
  .trim()
  .min(1, "O título é obrigatório.")
  .max(120, "O título deve ter no máximo 120 caracteres.");

/**
 * Descrição é opcional. Normalizamos string vazia -> `undefined` para que
 * `""` e "não informado" sejam representados de uma única forma no store.
 */
const descricaoSchema = z
  .string()
  .trim()
  .max(500, "A descrição deve ter no máximo 500 caracteres.")
  .optional()
  .transform((valor) => (valor === "" ? undefined : valor));

/** Entrada do formulário (criar e editar usam o mesmo shape). */
export const tarefaInputSchema = z.object({
  titulo: tituloSchema,
  descricao: descricaoSchema,
  concluida: z.boolean().optional(),
});

export const criarTarefaSchema = tarefaInputSchema;

/** Na atualização o `id` é obrigatório; os demais campos são parciais (PATCH). */
export const atualizarTarefaSchema = z.object({
  id: z.string().min(1, "O id da tarefa é obrigatório."),
  titulo: tituloSchema.optional(),
  descricao: descricaoSchema,
  concluida: z.boolean().optional(),
});

export const idSchema = z.object({
  id: z.string().min(1, "O id da tarefa é obrigatório."),
});

/**
 * Paginação por cursor (keyset) para o infinite scroll.
 * `cursor` é o id da última tarefa recebida; `limite` controla o tamanho da página.
 */
export const listarTarefasSchema = z.object({
  limite: z.number().int().min(1).max(50).default(10),
  cursor: z.string().nullish(),
});

export type TarefaInput = z.infer<typeof tarefaInputSchema>;
export type CriarTarefaInput = z.infer<typeof criarTarefaSchema>;
export type AtualizarTarefaInput = z.infer<typeof atualizarTarefaSchema>;
export type ListarTarefasInput = z.infer<typeof listarTarefasSchema>;
