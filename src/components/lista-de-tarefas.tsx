"use client";

import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { useToasts } from "@/components/toaster";
import { proximoCursorDaPagina, TAMANHO_DA_PAGINA } from "@/lib/constantes";
import { mensagemDeErro } from "@/lib/erros";
import { formatarDataHora } from "@/lib/formatar";
import { useTRPC } from "@/trpc/client";

/**
 * Listagem com infinite scroll + exclusão inline.
 *
 * É um Client Component porque precisa de interação (clique, scroll), mas os
 * DADOS da primeira página vêm do servidor: a mesma queryKey foi pré-carregada
 * em `src/app/page.tsx`, então na primeira pintura o React Query já tem cache.
 */
export function ListaDeTarefas() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { mostrarSucesso, mostrarErro } = useToasts();

  const opcoesDaLista = trpc.tarefas.listar.infiniteQueryOptions(
    { limite: TAMANHO_DA_PAGINA },
    {
      /**
       * Contrato do cursor (compartilhado com o prefetch do servidor em
       * `src/app/page.tsx`): recebe a última página e diz qual cursor pedir em
       * seguida. `undefined` significa "acabou" — é o que zera `hasNextPage`.
       */
      getNextPageParam: proximoCursorDaPagina,
    },
  );

  const {
    data,
    error,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isPending,
  } = useInfiniteQuery(opcoesDaLista);

  // Achata as páginas em uma única lista para renderizar.
  const tarefas = data?.pages.flatMap((pagina) => pagina.itens) ?? [];
  const total = data?.pages[0]?.total ?? 0;

  /**
   * Sentinela do infinite scroll.
   *
   * Decisão: `IntersectionObserver` em vez de escutar o evento `scroll`.
   * O observer é assíncrono e nativo — não roda a cada pixel rolado, não precisa
   * de debounce e não causa layout thrashing. Quando a div invisível no fim da
   * lista entra na viewport, buscamos a próxima página.
   */
  const sentinelaRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const elemento = sentinelaRef.current;
    if (!elemento || !hasNextPage) return;

    const observer = new IntersectionObserver(
      (entradas) => {
        const [entrada] = entradas;
        // A dupla checagem de `isFetchingNextPage` evita disparar várias
        // requisições se o usuário rolar rápido pela sentinela.
        if (entrada?.isIntersecting && !isFetchingNextPage) {
          void fetchNextPage();
        }
      },
      // `rootMargin` antecipa o carregamento em 240px: a próxima página chega
      // antes de o usuário bater no fim, o que elimina a sensação de travada.
      { rootMargin: "240px" },
    );

    observer.observe(elemento);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  /**
   * Exclusão com atualização otimista.
   *
   * `onMutate` remove a tarefa da tela na hora (a UI não espera o servidor);
   * `onError` restaura o snapshot anterior e avisa o usuário;
   * `onSettled` invalida a query para reconciliar com a verdade do servidor
   * (e corrigir o `total` exibido).
   */
  const exclusao = useMutation(
    trpc.tarefas.deletar.mutationOptions({
      onMutate: async ({ id }) => {
        await queryClient.cancelQueries({ queryKey: opcoesDaLista.queryKey });
        const anterior = queryClient.getQueryData(opcoesDaLista.queryKey);

        queryClient.setQueryData(opcoesDaLista.queryKey, (atual) => {
          if (!atual) return atual;
          return {
            ...atual,
            pages: atual.pages.map((pagina) => ({
              ...pagina,
              itens: pagina.itens.filter((tarefa) => tarefa.id !== id),
              total: Math.max(0, pagina.total - 1),
            })),
          };
        });

        return { anterior };
      },
      onError: (erro, _variaveis, contexto) => {
        if (contexto?.anterior) {
          queryClient.setQueryData(opcoesDaLista.queryKey, contexto.anterior);
        }
        mostrarErro(mensagemDeErro(erro));
      },
      onSuccess: () => mostrarSucesso("Tarefa excluída com sucesso."),
      onSettled: () => {
        void queryClient.invalidateQueries({ queryKey: opcoesDaLista.queryKey });
      },
    }),
  );

  // Esqueleto: na prática só aparece se o SSR não tiver rodado (ex.: navegação
  // client-side vinda de outra rota com cache expirado).
  if (isPending) {
    return (
      <div className="lista" aria-busy="true">
        {Array.from({ length: 3 }, (_, indice) => (
          <div key={indice} className="esqueleto" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="aviso aviso--erro" role="alert">
        Não foi possível carregar as tarefas: {mensagemDeErro(error)}
      </div>
    );
  }

  if (tarefas.length === 0) {
    return (
      <div className="aviso aviso--vazio">
        <p style={{ margin: "0 0 12px" }}>Nenhuma tarefa cadastrada ainda.</p>
        <Link href="/tarefas/nova" className="botao botao--primario">
          Criar a primeira tarefa
        </Link>
      </div>
    );
  }

  return (
    <>
      <p style={{ fontSize: "0.85rem", color: "var(--texto-suave)", margin: "0 0 12px" }}>
        Mostrando {tarefas.length} de {total} tarefa(s).
      </p>

      <ul className="lista">
        {tarefas.map((tarefa) => {
          // Enquanto a mutation desta tarefa específica está em voo, esmaecemos
          // o card e desabilitamos o botão (feedback por item, não global).
          const removendo = exclusao.isPending && exclusao.variables?.id === tarefa.id;

          return (
            <li key={tarefa.id} className="tarefa" data-removendo={removendo}>
              <div>
                <h2
                  className={`tarefa__titulo${tarefa.concluida ? " tarefa__titulo--concluida" : ""}`}
                >
                  {tarefa.titulo}
                </h2>
                {tarefa.descricao ? <p className="tarefa__descricao">{tarefa.descricao}</p> : null}
                <div className="tarefa__meta">
                  <span>Criada em {formatarDataHora(tarefa.dataCriacao)}</span>
                  {tarefa.concluida ? <span className="etiqueta">Concluída</span> : null}
                </div>
              </div>

              <div className="tarefa__acoes">
                <Link href={`/tarefas/${tarefa.id}`} className="botao">
                  Editar
                </Link>
                <button
                  type="button"
                  className="botao botao--perigo"
                  disabled={removendo}
                  onClick={() => exclusao.mutate({ id: tarefa.id })}
                  aria-label={`Excluir a tarefa ${tarefa.titulo}`}
                >
                  {removendo ? "Excluindo…" : "Excluir"}
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      {/* Alvo observado pelo IntersectionObserver. */}
      <div ref={sentinelaRef} className="sentinela" aria-hidden="true" />

      {isFetchingNextPage ? (
        <p className="carregando" role="status">
          Carregando mais tarefas…
        </p>
      ) : null}

      {!hasNextPage && tarefas.length > 0 ? (
        <p className="carregando">Você chegou ao fim da lista.</p>
      ) : null}

      {/* Fallback acessível: quem navega por teclado ou tem o observer
          indisponível ainda consegue paginar com um clique. */}
      {hasNextPage && !isFetchingNextPage ? (
        <div style={{ textAlign: "center", marginTop: 12 }}>
          <button type="button" className="botao" onClick={() => void fetchNextPage()}>
            Carregar mais
          </button>
        </div>
      ) : null}
    </>
  );
}
