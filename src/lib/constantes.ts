import type { PaginaDeTarefas } from "@/server/data/tarefas-store";

/**
 * Tamanho da página do infinite scroll.
 *
 * Fica em um módulo próprio porque o valor precisa ser EXATAMENTE o mesmo no
 * servidor (prefetch) e no cliente (`useInfiniteQuery`): a queryKey do React
 * Query inclui o input, então um valor diferente geraria duas chaves distintas
 * e o dado pré-carregado no SSR seria ignorado.
 */
export const TAMANHO_DA_PAGINA = 10;

/**
 * Como descobrir o cursor da página seguinte.
 *
 * Também precisa ser idêntico nos dois lados (servidor e cliente) — por isso
 * mora aqui em vez de ser escrito inline em cada chamada. Retornar `undefined`
 * é o sinal de "não há mais páginas" para o React Query (`hasNextPage: false`).
 *
 * O tipo de entrada usa `dataCriacao: string` porque, ao atravessar o JSON, o
 * `Date` do backend chega como string ISO.
 */
export function proximoCursorDaPagina(
  ultimaPagina: Omit<PaginaDeTarefas, "itens"> & { itens: unknown[] },
): string | undefined {
  return ultimaPagina.proximoCursor ?? undefined;
}
