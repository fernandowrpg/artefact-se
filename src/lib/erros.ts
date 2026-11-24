import { TRPCClientError } from "@trpc/client";
import type { AppRouter } from "@/server/trpc/routers/_app";

/**
 * Tradução de erro técnico -> mensagem que o usuário entende.
 *
 * Por que centralizar: sem isso, cada componente mostraria o erro de um jeito
 * diferente (ou exibiria "Internal Server Error" cru). Aqui o tratamento é um só.
 */
export function mensagemDeErro(erro: unknown): string {
  if (erro instanceof TRPCClientError) {
    const dados = (erro as TRPCClientError<AppRouter>).data;

    // 1) Erro de validação do Zod: mostramos a primeira mensagem de campo,
    //    que é muito mais útil que o texto padrão "Input validation failed".
    const zod = dados?.zod as Record<string, string[]> | null | undefined;
    if (zod) {
      const primeira = Object.values(zod).flat()[0];
      if (primeira) return primeira;
    }

    // 2) Códigos conhecidos ganham texto amigável.
    if (dados?.code === "NOT_FOUND") {
      return erro.message || "O registro não foi encontrado.";
    }
    if (dados?.code === "INTERNAL_SERVER_ERROR") {
      // Nunca expomos detalhes internos de um 500 para o usuário final.
      return "Ocorreu um erro inesperado no servidor. Tente novamente.";
    }

    return erro.message;
  }

  // 3) Falha de rede / offline: o fetch rejeita antes de haver resposta do tRPC.
  if (erro instanceof Error) {
    if (erro.message.toLowerCase().includes("fetch")) {
      return "Não foi possível falar com o servidor. Verifique sua conexão.";
    }
    return erro.message;
  }

  return "Ocorreu um erro desconhecido.";
}

/** Extrai os erros por campo para destacar inputs no formulário. */
export function errosDeCampo(erro: unknown): Record<string, string[]> | null {
  if (erro instanceof TRPCClientError) {
    const zod = (erro as TRPCClientError<AppRouter>).data?.zod as
      | Record<string, string[]>
      | null
      | undefined;
    return zod ?? null;
  }
  return null;
}
