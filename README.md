# Gerenciador de Tarefas — Next.js 15 + tRPC

Sistema simples de gerenciamento de tarefas (CRUD) com backend **em memória** exposto via
**tRPC**, listagem renderizada no servidor (**SSR**) e **infinite scroll** no cliente.

Resposta ao case prático de Software/Produtividade.
As respostas da **Parte 1 (questões teóricas)** estão em
[`docs/parte-1-questoes-teoricas.md`](docs/parte-1-questoes-teoricas.md).

---

## Como executar

Requer **Node.js 20+**.

```bash
npm install
```

```bash
npm run dev
```

Abra <http://localhost:3000>.

Para rodar a versão de produção:

```bash
npm run build && npm start
```

Outros scripts:

```bash
npm run typecheck
```

```bash
npm run lint
```

> Não há variáveis de ambiente, banco de dados nem segredos: o estado vive em memória e a
> aplicação sobe com um `npm install` + `npm run dev`. Todos os dados são fictícios.

---

## Como o sistema funciona

A aplicação já inicia com **23 tarefas de exemplo**, o suficiente para o infinite scroll
paginar três vezes (páginas de 10 itens) sem precisar cadastrar nada à mão.

### Telas

| Rota | O que faz |
|---|---|
| `/` | Lista as tarefas. Primeira página vem pronta do servidor (SSR); as próximas carregam conforme o scroll. Exclusão inline com feedback. |
| `/tarefas/nova` | Formulário de criação, com validação. |
| `/tarefas/[id]` | Formulário de edição, com os dados pré-carregados no servidor. 404 se a tarefa não existir. |
| `/api/trpc/[trpc]` | Único endpoint HTTP: por aqui trafega todo o tRPC. |

### Fluxo de uma requisição

```
Server Component (/)               Client Component (lista)
        │                                   │
        │ 1. prefetch (chamada direta,      │
        │    sem HTTP, mesmo processo)      │
        ▼                                   │
   procedure tRPC ──► store em memória      │
        │                                   │
        │ 2. HTML já com as tarefas         │
        │    + cache desidratado            │
        └──────────────────────────────────►│
                                            │ 3. hidrata: dados já no cache
                                            │
                                            │ 4. scroll / excluir / criar
                                            ▼
                                     POST /api/trpc ──► procedure ──► store
```

### Backend (tRPC)

**Modelo**

```ts
type Tarefa = {
  id: string;            // UUID gerado no servidor
  titulo: string;        // obrigatório
  descricao?: string;    // opcional
  dataCriacao: Date;     // timestamp
  concluida: boolean;    // extra simples
};
```

**Procedures** (`src/server/trpc/routers/tarefas.ts`)

| Procedure | Tipo | Descrição |
|---|---|---|
| `tarefas.listar` | query | Lista paginada por cursor (`{ limite, cursor }`) |
| `tarefas.porId` | query | Busca uma tarefa; `NOT_FOUND` se não existir |
| `tarefas.criar` | mutation | Cria; rejeita título vazio |
| `tarefas.atualizar` | mutation | Edita; `NOT_FOUND` se a tarefa não existir |
| `tarefas.deletar` | mutation | Remove; `NOT_FOUND` se a tarefa não existir |

**Validação e erros**

- Os schemas Zod em `src/lib/schemas.ts` são a única fonte de verdade e são usados
  **tanto no `.input()` do backend quanto no formulário do frontend** — as duas validações
  não têm como divergir.
- Título vazio (ou só com espaços) é rejeitado no servidor com **HTTP 400 / `BAD_REQUEST`**,
  independentemente do que o frontend faça.
- Operar sobre id inexistente devolve **HTTP 404 / `NOT_FOUND`** com mensagem explicativa.
- O `errorFormatter` anexa os erros do Zod por campo em `data.zod`, o que permite ao
  formulário destacar exatamente o input problemático.

Dá para verificar o backend sem abrir o browser:

```bash
curl -s -X POST http://localhost:3000/api/trpc/tarefas.criar -H 'content-type: application/json' -d '{"titulo":"   "}'
```

```bash
curl -s -G http://localhost:3000/api/trpc/tarefas.listar --data-urlencode 'input={"limite":3}'
```

### Frontend

- **SSR real na listagem:** o HTML entregue pelo servidor já contém as 10 primeiras
  tarefas renderizadas — verificável com "ver código-fonte" da página.
- **Infinite scroll** com `IntersectionObserver` + `useInfiniteQuery`, paginação por
  cursor. Há também um botão "Carregar mais" como fallback acessível.
- **Exclusão otimista:** o item some da tela imediatamente; se o servidor recusar, o
  estado anterior é restaurado e um toast de erro explica o motivo.
- **Formulário** com componentes funcionais e hooks (`useState`), validação com o mesmo
  schema Zod do backend, botão desabilitado enquanto o título estiver vazio e erros
  exibidos por campo.
- **Feedback:** toasts de sucesso/erro, estados de carregamento (esqueleto, "Salvando…",
  "Carregando mais tarefas…"), página 404 e *error boundary* de rota.

---

## Estrutura de pastas

```
src/
├── app/
│   ├── api/trpc/[trpc]/route.ts   # endpoint HTTP do tRPC (adapter fetch)
│   ├── tarefas/nova/page.tsx      # criação
│   ├── tarefas/[id]/page.tsx      # edição (busca a tarefa no servidor)
│   ├── page.tsx                   # listagem com SSR (prefetch + hidratação)
│   ├── layout.tsx                 # providers globais
│   ├── error.tsx                  # error boundary de rota
│   └── not-found.tsx              # 404
├── components/
│   ├── lista-de-tarefas.tsx       # infinite scroll + exclusão otimista
│   ├── formulario-de-tarefa.tsx   # criar e editar (mesmo componente)
│   └── toaster.tsx                # notificações de sucesso/erro
├── lib/
│   ├── schemas.ts                 # validação Zod compartilhada
│   ├── erros.ts                   # erro técnico -> mensagem ao usuário
│   ├── formatar.ts                # datas em pt-BR (estável no SSR)
│   └── constantes.ts              # config compartilhada da paginação
├── server/
│   ├── data/tarefas-store.ts      # persistência em memória
│   └── trpc/
│       ├── init.ts                # contexto, errorFormatter, procedures
│       └── routers/               # router de tarefas + router raiz
└── trpc/
    ├── client.tsx                 # provider do cliente (browser)
    ├── server.tsx                 # prefetch/hidratação (Server Components)
    └── query-client.ts            # config compartilhada do React Query
```

---

## Decisões técnicas

As decisões estão comentadas em detalhe no próprio código. Em resumo:

| Decisão | Por quê |
|---|---|
| Store em `globalThis` | Sobrevive ao hot reload do Next em desenvolvimento; um `const` de módulo seria recriado a cada save e os dados sumiriam. |
| Paginação por **cursor**, não offset | Com offset, criar ou excluir uma tarefa desloca os índices e o infinite scroll passa a repetir ou pular itens. |
| Schemas Zod compartilhados | Uma única fonte de verdade: frontend e backend não podem divergir, e o tipo TS é inferido do schema. |
| `prefetch` com `await` | Garante SSR de verdade (HTML com conteúdo) em vez de streaming com esqueleto — o desafio pede SSR da listagem. |
| tRPC chamado direto no servidor | Server Components executam o procedure como função, no mesmo processo: sem HTTP da aplicação para ela mesma. |
| Exclusão otimista | A UI responde na hora; em caso de erro, faz rollback e avisa. |
| `IntersectionObserver` | Nativo e assíncrono: não roda a cada pixel rolado, dispensa debounce e não causa layout thrashing. |
| CSS puro com variáveis | O desafio pede layout simples; Tailwind ou um UI kit seriam peso sem ganho em quatro telas. |
| Toasts próprios (~60 linhas) | Evita uma dependência inteira para exibir mensagem de sucesso/erro. |
| `Intl.DateTimeFormat` com fuso fixo | Servidor (UTC) e browser produzem a mesma string — sem erro de hidratação. |

---

## Stack

| Pacote | Versão | Papel |
|---|---|---|
| Next.js | 15.5.x | App Router, SSR, Route Handlers |
| React | 19.x | Server e Client Components |
| tRPC | 11.x | Camada de API tipada ponta a ponta |
| TanStack Query | 5.x | Cache, infinite query, mutations |
| Zod | 4.x | Validação compartilhada |
| TypeScript | 5.9 | Modo `strict` |

---

## Limitações conhecidas

São conscientes, dado o escopo do desafio:

- **Sem persistência:** reiniciar o servidor restaura as tarefas de exemplo. O estado
  também é por processo — múltiplas instâncias teriam listas diferentes. É exatamente
  aqui que entraria um banco de dados real.
- **Sem autenticação:** todos veem a mesma lista. A estrutura já prevê o ponto de
  extensão (um `protectedProcedure` com middleware em `src/server/trpc/init.ts`).
- **Sem testes automatizados:** o projeto foi validado manualmente e com um roteiro de
  testes de ponta a ponta durante o desenvolvimento. Em um projeto real, `tarefas-store`
  e os procedures seriam os primeiros candidatos a testes unitários.
