import { randomUUID } from "node:crypto";

/**
 * Modelo da tarefa (campos exigidos pelo desafio + `concluida` como extra simples).
 * `dataCriacao` é um `Date`; o tRPC + superjson-less setup serializa como ISO string,
 * por isso o frontend sempre normaliza com `new Date(...)` antes de formatar.
 */
export type Tarefa = {
  id: string;
  titulo: string;
  descricao?: string;
  dataCriacao: Date;
  concluida: boolean;
};

export type PaginaDeTarefas = {
  itens: Tarefa[];
  /** id da última tarefa da página; `null` quando não há mais nada para buscar. */
  proximoCursor: string | null;
  total: number;
};

/**
 * Persistência em memória.
 *
 * Decisão de projeto: o array vive em `globalThis`. Em desenvolvimento o Next
 * recarrega os módulos a cada alteração (HMR); se o array fosse um simples
 * `const tarefas = []` no escopo do módulo, ele seria recriado e os dados
 * "desapareceriam" a cada save. Guardar no objeto global sobrevive ao HMR.
 *
 * Limitação consciente (e aceitável para o desafio): o estado é por processo.
 * Em produção com múltiplas instâncias/serverless cada instância teria sua
 * própria lista — é exatamente aqui que entraria um banco de dados real.
 */
type StoreGlobal = { __tarefasStore?: Tarefa[] };
const globalStore = globalThis as unknown as StoreGlobal;

function criarTarefasIniciais(): Tarefa[] {
  const agora = Date.now();
  // 23 tarefas de exemplo: o suficiente para o infinite scroll paginar 3 vezes
  // (páginas de 10) e deixar o comportamento visível sem precisar cadastrar na mão.
  return Array.from({ length: 23 }, (_, indice) => {
    const numero = 23 - indice;
    return {
      id: randomUUID(),
      titulo: `Tarefa de exemplo ${numero}`,
      descricao:
        numero % 3 === 0
          ? undefined // prova que `descricao` é realmente opcional
          : `Descrição fictícia da tarefa de exemplo ${numero}.`,
      // Datas decrescentes para que a ordenação "mais recente primeiro" fique evidente.
      dataCriacao: new Date(agora - indice * 1000 * 60 * 37),
      concluida: numero % 5 === 0,
    };
  });
}

function obterTarefas(): Tarefa[] {
  globalStore.__tarefasStore ??= criarTarefasIniciais();
  return globalStore.__tarefasStore;
}

/** Cópia defensiva: impede que quem consome o store mute o array interno. */
function clonar(tarefa: Tarefa): Tarefa {
  return { ...tarefa, dataCriacao: new Date(tarefa.dataCriacao) };
}

export const tarefasStore = {
  /**
   * Lista paginada por cursor (keyset pagination) em vez de `offset/limit`.
   * Motivo: com offset, inserir/remover uma tarefa no topo desloca os índices e
   * o infinite scroll passa a repetir ou pular itens. O cursor aponta para um
   * item concreto, então a página seguinte é sempre estável.
   */
  listar({ limite, cursor }: { limite: number; cursor?: string | null }): PaginaDeTarefas {
    const tarefas = obterTarefas();
    // Mais recentes primeiro — a ordenação é parte do contrato do cursor.
    const ordenadas = [...tarefas].sort(
      (a, b) => b.dataCriacao.getTime() - a.dataCriacao.getTime(),
    );

    let inicio = 0;
    if (cursor) {
      const indiceDoCursor = ordenadas.findIndex((tarefa) => tarefa.id === cursor);
      // Cursor inválido (ex.: a tarefa foi deletada entre duas páginas):
      // tratamos como "começar do início" em vez de estourar um erro.
      inicio = indiceDoCursor >= 0 ? indiceDoCursor + 1 : 0;
    }

    const itens = ordenadas.slice(inicio, inicio + limite);
    const temMais = inicio + limite < ordenadas.length;

    return {
      itens: itens.map(clonar),
      proximoCursor: temMais && itens.length > 0 ? itens[itens.length - 1]!.id : null,
      total: ordenadas.length,
    };
  },

  buscarPorId(id: string): Tarefa | undefined {
    const tarefa = obterTarefas().find((item) => item.id === id);
    return tarefa ? clonar(tarefa) : undefined;
  },

  criar(dados: { titulo: string; descricao?: string; concluida?: boolean }): Tarefa {
    const tarefa: Tarefa = {
      id: randomUUID(),
      titulo: dados.titulo,
      descricao: dados.descricao,
      dataCriacao: new Date(),
      concluida: dados.concluida ?? false,
    };
    // `unshift` mantém a tarefa nova visível já na primeira página.
    obterTarefas().unshift(tarefa);
    return clonar(tarefa);
  },

  /** Retorna `undefined` quando o id não existe — quem chama decide o erro HTTP/tRPC. */
  atualizar(
    id: string,
    dados: { titulo?: string; descricao?: string; concluida?: boolean },
  ): Tarefa | undefined {
    const tarefas = obterTarefas();
    const indice = tarefas.findIndex((item) => item.id === id);
    if (indice < 0) return undefined;

    const atual = tarefas[indice]!;
    const atualizada: Tarefa = {
      ...atual,
      // `!== undefined` em vez de `??`/truthy: permite limpar a descrição com ""
      // (o schema converte "" -> undefined) e setar `concluida: false`.
      titulo: dados.titulo !== undefined ? dados.titulo : atual.titulo,
      descricao: "descricao" in dados ? dados.descricao : atual.descricao,
      concluida: dados.concluida !== undefined ? dados.concluida : atual.concluida,
    };
    tarefas[indice] = atualizada;
    return clonar(atualizada);
  },

  /** `false` quando não havia nada para remover. */
  remover(id: string): boolean {
    const tarefas = obterTarefas();
    const indice = tarefas.findIndex((item) => item.id === id);
    if (indice < 0) return false;
    tarefas.splice(indice, 1);
    return true;
  },
};
