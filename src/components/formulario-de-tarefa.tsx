"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useToasts } from "@/components/toaster";
import { errosDeCampo, mensagemDeErro } from "@/lib/erros";
import { tarefaInputSchema } from "@/lib/schemas";
import { useTRPC } from "@/trpc/client";

type TarefaExistente = {
  id: string;
  titulo: string;
  descricao?: string;
  concluida: boolean;
};

/**
 * Formulário único para criar E editar.
 *
 * Decisão: um só componente para os dois casos. A diferença entre "nova" e
 * "editar" é apenas a presença de `tarefa` — que define os valores iniciais e
 * qual mutation chamar. Dois formulários separados duplicariam toda a validação
 * e o tratamento de erro.
 */
export function FormularioDeTarefa({ tarefa }: { tarefa?: TarefaExistente }) {
  const modoEdicao = Boolean(tarefa);
  const trpc = useTRPC();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { mostrarSucesso, mostrarErro } = useToasts();

  /**
   * Estado do formulário com `useState` simples (componentes funcionais + hooks,
   * como pede o desafio). Não trouxemos react-hook-form: são três campos, e o
   * Zod já cobre a validação — a lib seria peso sem ganho aqui.
   */
  const [titulo, setTitulo] = useState(tarefa?.titulo ?? "");
  const [descricao, setDescricao] = useState(tarefa?.descricao ?? "");
  const [concluida, setConcluida] = useState(tarefa?.concluida ?? false);

  /** Erros de validação do próprio frontend, por campo. */
  const [erros, setErros] = useState<Record<string, string[]>>({});
  /** Erro geral vindo do backend (ex.: NOT_FOUND ao editar algo já deletado). */
  const [erroGeral, setErroGeral] = useState<string | null>(null);

  /** Depois de escrever, invalidamos as listagens para a lista refletir a mudança. */
  function invalidarListagens() {
    void queryClient.invalidateQueries({
      queryKey: trpc.tarefas.listar.infiniteQueryKey(),
    });
  }

  function tratarErro(erro: unknown) {
    // Se o backend devolveu erros por campo (Zod), destacamos os inputs;
    // caso contrário mostramos um aviso geral no topo do formulário.
    const porCampo = errosDeCampo(erro);
    if (porCampo) setErros(porCampo);
    const mensagem = mensagemDeErro(erro);
    setErroGeral(mensagem);
    mostrarErro(mensagem);
  }

  const criacao = useMutation(
    trpc.tarefas.criar.mutationOptions({
      onSuccess: () => {
        invalidarListagens();
        mostrarSucesso("Tarefa criada com sucesso.");
        router.push("/");
      },
      onError: tratarErro,
    }),
  );

  const atualizacao = useMutation(
    trpc.tarefas.atualizar.mutationOptions({
      onSuccess: (atualizada) => {
        invalidarListagens();
        // Também atualizamos o cache da query pontual desta tarefa.
        queryClient.setQueryData(
          trpc.tarefas.porId.queryKey({ id: atualizada.id }),
          atualizada,
        );
        mostrarSucesso("Tarefa atualizada com sucesso.");
        router.push("/");
      },
      onError: tratarErro,
    }),
  );

  const enviando = criacao.isPending || atualizacao.isPending;

  function enviar(evento: React.FormEvent<HTMLFormElement>) {
    // `preventDefault` porque queremos enviar via tRPC, não um POST de formulário.
    evento.preventDefault();
    setErros({});
    setErroGeral(null);

    /**
     * Validação no cliente com o MESMO schema do backend.
     *
     * Isso dá feedback instantâneo (o usuário não espera o round-trip) sem
     * abrir mão da segurança: o backend revalida tudo de qualquer forma, já que
     * nenhuma validação de frontend é confiável.
     */
    const resultado = tarefaInputSchema.safeParse({ titulo, descricao, concluida });

    if (!resultado.success) {
      const porCampo: Record<string, string[]> = {};
      for (const problema of resultado.error.issues) {
        const campo = problema.path.join(".") || "_root";
        (porCampo[campo] ??= []).push(problema.message);
      }
      setErros(porCampo);
      mostrarErro("Verifique os campos destacados.");
      return;
    }

    if (tarefa) {
      atualizacao.mutate({ id: tarefa.id, ...resultado.data });
    } else {
      criacao.mutate(resultado.data);
    }
  }

  const erroDoTitulo = erros.titulo?.[0];
  const erroDaDescricao = erros.descricao?.[0];

  return (
    <form className="formulario" onSubmit={enviar} noValidate>
      {erroGeral ? (
        <div className="aviso aviso--erro" role="alert">
          {erroGeral}
        </div>
      ) : null}

      <div className={`campo${erroDoTitulo ? " campo--invalido" : ""}`}>
        <label htmlFor="titulo">Título *</label>
        <input
          id="titulo"
          type="text"
          value={titulo}
          onChange={(evento) => setTitulo(evento.target.value)}
          placeholder="Ex.: Revisar proposta comercial"
          maxLength={120}
          /* `aria-invalid` + `aria-describedby` ligam o input à mensagem de erro
             para leitores de tela — não basta pintar a borda de vermelho. */
          aria-invalid={Boolean(erroDoTitulo)}
          aria-describedby={erroDoTitulo ? "erro-titulo" : undefined}
          autoFocus
        />
        {erroDoTitulo ? (
          <span className="campo__erro" id="erro-titulo">
            {erroDoTitulo}
          </span>
        ) : null}
      </div>

      <div className={`campo${erroDaDescricao ? " campo--invalido" : ""}`}>
        <label htmlFor="descricao">Descrição</label>
        <textarea
          id="descricao"
          value={descricao}
          onChange={(evento) => setDescricao(evento.target.value)}
          rows={4}
          maxLength={500}
          placeholder="Opcional"
          aria-invalid={Boolean(erroDaDescricao)}
          aria-describedby={erroDaDescricao ? "erro-descricao" : undefined}
        />
        {erroDaDescricao ? (
          <span className="campo__erro" id="erro-descricao">
            {erroDaDescricao}
          </span>
        ) : (
          <span className="campo__dica">{descricao.trim().length}/500 caracteres</span>
        )}
      </div>

      <div className="campo campo--inline">
        <input
          id="concluida"
          type="checkbox"
          checked={concluida}
          onChange={(evento) => setConcluida(evento.target.checked)}
        />
        <label htmlFor="concluida">Marcar como concluída</label>
      </div>

      <div className="acoes-formulario">
        <button
          type="submit"
          className="botao botao--primario"
          /* Desabilitar por título vazio evita o envio antes mesmo da validação:
             o requisito "impedir envio sem título" fica visível na própria UI. */
          disabled={enviando || titulo.trim().length === 0}
        >
          {enviando ? "Salvando…" : modoEdicao ? "Salvar alterações" : "Criar tarefa"}
        </button>
        <Link href="/" className="botao">
          Cancelar
        </Link>
      </div>
    </form>
  );
}
