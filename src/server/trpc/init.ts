import { initTRPC } from "@trpc/server";
import { ZodError } from "zod";
import { tarefasStore } from "@/server/data/tarefas-store";

/**
 * Contexto do tRPC: tudo que os procedures recebem "de graça".
 *
 * Aqui injetamos o store. Parece exagero para um array em memória, mas é o que
 * torna a troca por um banco real uma mudança de UMA linha — os routers nunca
 * importam o store diretamente, eles usam `ctx.tarefas`.
 */
export async function criarContexto() {
  return { tarefas: tarefasStore };
}

export type Contexto = Awaited<ReturnType<typeof criarContexto>>;

const t = initTRPC.context<Contexto>().create({
  /**
   * `errorFormatter` enriquece o erro antes de ele ir para o cliente.
   *
   * Decisão: quando a falha vem de uma validação Zod, anexamos os erros por campo
   * em `data.zod`. Assim o formulário no frontend pode destacar exatamente o input
   * problemático em vez de mostrar só uma mensagem genérica.
   */
  errorFormatter({ shape, error }) {
    const causa = error.cause;
    return {
      ...shape,
      data: {
        ...shape.data,
        zod:
          causa instanceof ZodError
            ? z4FieldErrors(causa)
            : null,
      },
    };
  },
});

/** Normaliza um ZodError em `{ campo: ["mensagem"] }`. */
function z4FieldErrors(erro: ZodError): Record<string, string[]> {
  const resultado: Record<string, string[]> = {};
  for (const problema of erro.issues) {
    const campo = problema.path.join(".") || "_root";
    (resultado[campo] ??= []).push(problema.message);
  }
  return resultado;
}

export const criarRouter = t.router;
export const criarCaller = t.createCallerFactory;

/**
 * Procedure público. Em uma aplicação real existiria também um
 * `procedimentoProtegido = procedimentoPublico.use(middlewareDeAuth)`;
 * o desafio não pede autenticação, então ficou apenas o público.
 */
export const procedimentoPublico = t.procedure;
