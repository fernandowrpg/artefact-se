# Parte 1 — Questões Teóricas

## 1. ReactJS e NextJS: renderização e estratégias

### a) Diferenças entre CSR, SSR e SSG

As três estratégias respondem à mesma pergunta — **onde e quando o HTML é gerado** —
com respostas diferentes.

#### Client-Side Rendering (CSR)

O servidor devolve um HTML praticamente vazio (um `<div id="root">`) mais um bundle
JavaScript. O browser baixa o bundle, executa o React e só então monta a tela. Os dados
vêm de requisições feitas depois que o JS já está rodando.

- **Quando o HTML existe:** no browser, depois do download e da execução do JS.
- **Quem trabalha:** a máquina do usuário.
- **Consequência:** a primeira pintura mostra esqueleto/spinner; a navegação seguinte é
  instantânea, pois nada mais precisa vir do servidor além dos dados.

#### Server-Side Rendering (SSR)

A cada requisição o servidor executa o componente, busca os dados e devolve o HTML já
preenchido. O browser pinta esse HTML imediatamente e, em paralelo, carrega o JS que
"religa" os event handlers ao markup existente — processo chamado de **hidratação**.

- **Quando o HTML existe:** no servidor, a cada requisição.
- **Quem trabalha:** o servidor (custo por requisição).
- **Consequência:** conteúdo visível rápido e completo para crawlers, mas o *Time To
  First Byte* é maior, porque o usuário espera o servidor terminar de buscar os dados.

#### Static Site Generation (SSG)

O HTML é gerado uma única vez, no momento do **build**, e servido como arquivo estático
(normalmente por uma CDN). Toda requisição recebe exatamente o mesmo arquivo.

- **Quando o HTML existe:** no build, antes de qualquer usuário acessar.
- **Quem trabalha:** o pipeline de deploy; em runtime, só a CDN.
- **Consequência:** é a opção mais rápida e mais barata que existe — e também a mais
  rígida, porque o conteúdo "congela" até o próximo build.

#### Resumo comparativo

| | CSR | SSR | SSG |
|---|---|---|---|
| HTML gerado | no browser | no servidor, por requisição | no build |
| 1ª pintura | lenta (spinner) | rápida (conteúdo real) | instantânea |
| TTFB | baixo | mais alto | mínimo |
| SEO | frágil | ótimo | ótimo |
| Dados por usuário | sim | sim | não (sem rebuild) |
| Custo em escala | do cliente | por requisição | ~zero (CDN) |

> **Nota sobre o Next 15:** no App Router essas três palavras deixaram de ser "modos de
> página" e viraram **características de componentes**. Server Components executam no
> servidor por padrão; `"use client"` marca a fronteira do que também roda no browser.
> O `ISR` (*Incremental Static Regeneration*) é um quarto ponto na escala: HTML estático
> que se revalida sozinho a cada N segundos — SSG com data de validade.

---

### b) Cenários vantajosos e problemáticos

#### CSR

**Vantajoso em:** painéis administrativos, apps atrás de login, editores e ferramentas
interativas (um Figma, um Trello). Nesses casos o SEO é irrelevante, cada tela depende do
usuário logado e o app é usado por longos períodos — o custo do carregamento inicial é
pago uma vez e amortizado em dezenas de interações rápidas.

**Problemático em:** páginas públicas que dependem de busca orgânica; usuários em redes
lentas ou aparelhos modestos (todo o custo de renderizar recai sobre eles); telas cujo
conteúdo principal é o produto em si — uma página de produto que mostra spinner por 2s
perde conversão.

#### SSR

**Vantajoso em:** e-commerce (preço e estoque mudam a toda hora e precisam ser
indexados), feeds personalizados, dashboards que mostram dados do usuário logado já na
primeira pintura, páginas que dependem de cookies/headers da requisição.
**É exatamente o caso da listagem deste desafio:** a lista muda a cada operação, então
não há como pré-gerá-la no build.

**Problemático em:** picos de tráfego — cada visita consome CPU e uma consulta ao banco,
então um pico vira custo e latência; páginas cujos dados vêm de uma API lenta (o usuário
fica olhando para o nada enquanto o servidor espera); conteúdo igual para todo mundo, em
que o servidor refaz o mesmo trabalho milhares de vezes por minuto sem necessidade.

#### SSG

**Vantajoso em:** blogs, documentação, landing pages, páginas institucionais, changelogs
— conteúdo que muda quando alguém publica algo, não quando alguém acessa. Entrega
instantânea, escala infinita pela CDN e custo próximo de zero.

**Problemático em:** conteúdo personalizado (o HTML é o mesmo para todos, por definição);
catálogos gigantes, em que gerar 500 mil páginas faz o build durar horas; dados que mudam
a cada minuto, que ficariam desatualizados até o próximo deploy. O ISR resolve boa parte
desses casos, ao custo de aceitar uma janela de dados antigos.

#### Como eu decido, na prática

1. O conteúdo é igual para todos e muda com pouca frequência? → **SSG** (com ISR se
   precisar de frescor).
2. Precisa ser indexado ou aparecer na primeira pintura, mas varia por requisição? →
   **SSR**.
3. É uma tela interna, atrás de login e altamente interativa? → **CSR**.

Na vida real a resposta costuma ser **híbrida**, e é essa a força do App Router: nesta
aplicação, a *casca* da listagem e a primeira página de dados vêm do servidor (SSR), e a
partir daí o infinite scroll e as exclusões acontecem no cliente (CSR), sem recarregar
a página.

---

## 2. Backend: conceitos e abordagens

### a) Principais maneiras de implementar um backend para uma aplicação web

**1. REST (HTTP + recursos)**
O padrão de fato há duas décadas: recursos com URLs (`/tarefas`, `/tarefas/:id`) e verbos
HTTP com semântica definida. É universal, cacheável por qualquer proxy ou CDN, fácil de
depurar com `curl` e entendido por qualquer cliente. Em troca, sofre de *over-fetching*
(vem mais campo do que a tela usa) e *under-fetching* (a tela precisa de 3 chamadas), e o
contrato não é tipado — é preciso OpenAPI/Swagger + geração de código para ter tipos.

**2. GraphQL**
O cliente descreve exatamente os dados que quer em uma única requisição contra um schema
fortemente tipado. Excelente quando há muitos clientes diferentes (web, iOS, Android,
parceiros) consumindo o mesmo backend com necessidades distintas. O preço é
infraestrutura: resolvers, problema do N+1, cache HTTP que deixa de funcionar
naturalmente (tudo é POST em `/graphql`), e análise de complexidade de query para evitar
abuso.

**3. RPC tipado (tRPC, gRPC)**
Em vez de modelar recursos, chama-se funções remotas. O gRPC usa Protobuf e é padrão em
comunicação entre microsserviços. O tRPC é específico de TypeScript: o cliente importa
apenas o *tipo* do router do servidor e ganha autocomplete e checagem de tipo end-to-end,
sem geração de código nem schema intermediário.

**4. Backend acoplado ao framework full-stack**
Next.js (Route Handlers, Server Actions), Remix, SvelteKit, Nuxt. O backend vive no mesmo
repositório e no mesmo deploy do frontend. Menos cerimônia, um deploy só, tipos
compartilhados de graça. É a abordagem usada neste desafio.

**5. BaaS / serviços gerenciados**
Supabase, Firebase, Appwrite. O backend já vem pronto (auth, banco, storage, realtime) e
o trabalho vira configuração e regras de segurança. Ótimo para validar produto rápido;
o custo é acoplamento ao fornecedor.

**6. Monólito tradicional vs. microsserviços vs. serverless**
Essa é uma decisão ortogonal às anteriores, sobre *topologia de deploy*. Minha
recomendação padrão é começar monolito (simples de operar, fácil de refatorar) e extrair
serviços só quando houver um motivo concreto — escala desigual entre domínios ou times
que estão travando uns aos outros.

> **Resumo honesto:** REST continua sendo o default seguro; GraphQL compensa com muitos
> consumidores heterogêneos; RPC tipado compensa quando cliente e servidor são do mesmo
> time e da mesma linguagem — exatamente o cenário deste projeto.

---

### b) tRPC: vantagens e desvantagens

Sim, conheço e usei no desafio. A ideia central é simples: **o cliente importa somente o
tipo TypeScript do router do servidor**. Nenhum código do backend é enviado ao browser —
tipos somem na compilação. O resultado é um contrato que o compilador verifica, sem
schema intermediário e sem etapa de codegen.

#### Tipagem

**Vantagens**
- Tipagem end-to-end *real*: renomear um campo no router quebra o build do frontend na
  hora, não em produção. É a maior vantagem prática.
- Inferência automática de entradas e saídas: nenhum tipo escrito à mão, nenhum `any`.
- Sem pipeline de codegen: não há arquivo gerado para versionar, nem "esqueci de rodar o
  generate" em code review.
- Com Zod no `.input()`, a validação em runtime e os tipos em tempo de compilação nascem
  da mesma declaração — é impossível divergirem.

**Desvantagens**
- É *TypeScript-only*. Um app mobile em Kotlin ou um parceiro externo em Python não têm
  como consumir o router com essas garantias.
- Em routers muito grandes, a inferência pesa no `tsc` e no editor (autocomplete lento).
  Mitiga-se dividindo em sub-routers e ligando `incremental`/project references.
- Os tipos só protegem se cliente e servidor estiverem **na mesma versão**. Em deploy
  desacoplado (app móvel publicado na loja, por exemplo), o TypeScript dá uma falsa
  sensação de segurança: ele valida o código, não o binário que está instalado.

#### Segurança

**Vantagens**
- Validação obrigatória na entrada: `.input(schema)` roda antes do procedure. Payload
  inválido nunca chega à lógica de negócio.
- Middlewares componíveis (`publicProcedure` → `protectedProcedure`) deixam a
  autorização explícita e reaproveitável; esquecer de proteger uma rota fica visível.
- `errorFormatter` centraliza o que é exposto ao cliente — dá para enviar erros de
  validação por campo e, ao mesmo tempo, esconder *stack traces* de erros internos.

**Desvantagens e cuidados**
- **O ponto mais importante:** tipagem **não** é segurança. Os tipos são apagados na
  compilação; quem protege em runtime é o Zod. Um procedure sem `.input()` aceita
  qualquer coisa.
- Risco de vazamento acidental de dados: como a saída é inferida, devolver a entidade
  inteira do banco expõe tudo que ela tiver (`senhaHash`, `tokenInterno`). A disciplina
  de declarar `.output()` ou mapear explicitamente o que sai é essencial.
- Importar código do servidor no cliente por engano (em vez de só o `type`) pode
  empacotar segredos no bundle. Mitiga-se com `import type` e `server-only`.
- CSRF: as mutations são POST em um endpoint único; com autenticação por cookie, é
  preciso `SameSite` e as proteções usuais — o tRPC não faz isso por você.
- Rate limiting, auditoria e observabilidade continuam sendo responsabilidade sua, em
  middleware.

#### Escalabilidade

**Vantagens**
- Escala *de código* muito bem: sub-routers por domínio, middlewares compartilhados, e o
  compilador como rede de proteção em refatorações grandes.
- `httpBatchLink` agrupa chamadas do mesmo tick em uma requisição — menos round-trips.
- Integração nativa com TanStack Query: cache, revalidação, infinite queries e
  atualização otimista saem de graça.
- No servidor, procedures são funções comuns: dá para chamá-los direto de Server
  Components, sem HTTP para a própria aplicação (é o que esta app faz no SSR).

**Desvantagens**
- Escalabilidade *organizacional* é o ponto fraco: tudo depende de cliente e servidor
  compartilharem o mesmo monorepo TypeScript. Vários times, várias linguagens e
  consumidores externos empurram naturalmente para REST ou GraphQL.
- Cache HTTP intermediário é limitado — queries vão como GET e são cacheáveis, mas o
  batching mistura várias chamadas numa só resposta, o que atrapalha CDN e proxies.
- Versionamento de API pública é desconfortável: não existe `/v1` natural; manter dois
  contratos simultâneos exige convenção manual.
- Acoplamento ao ecossistema: fugir do tRPC depois significa reescrever a camada de
  transporte inteira.

#### Conclusão — quando eu usaria

**Usaria** em produto full-stack TypeScript, monorepo, time único, frontend como
principal consumidor — ganho enorme de velocidade e segurança em refatoração. É
precisamente o caso deste desafio.

**Não usaria** para API pública, com consumidores de terceiros, múltiplas linguagens ou
contrato que precise de versionamento formal. Aí REST com OpenAPI (ou GraphQL) entrega
mais.

**Caminho do meio** que costuma funcionar: tRPC para o frontend próprio e, quando for
preciso abrir para fora, expor um REST fino por cima dos mesmos *services* — com o
`trpc-openapi` ou com handlers dedicados. A lógica de negócio fica num lugar só e cada
público recebe o contrato que lhe serve.
