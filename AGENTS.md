<!-- BEGIN:nextjs-agent-rules -->
# Next.js 16

APIs e convenções podem divergir do conhecimento do modelo. Antes de alterar recursos do framework, consulte o guia relevante em `node_modules/next/dist/docs/` e respeite avisos de depreciação.
<!-- END:nextjs-agent-rules -->

# Instruções do tua-vitrine

## Produto e stack

SaaS simples para um pequeno lojista manter uma loja, uma vitrine pública em `/[slug]` e fechar vendas pelo WhatsApp. Implemente a menor solução completa; evite camadas, dependências e infraestrutura especulativas.

Stack fixa: Bun 1.3.14, Next.js 16 App Router, React 19, TypeScript strict, Prisma 7/PostgreSQL, shadcn/ui, Better Auth, Stripe, Resend, Neon, Vercel e Cloudflare R2.

- Use somente Bun; não use npm, pnpm ou Yarn.
- Procure código e componentes existentes antes de criar novos.
- Não altere stack/versões nem arquivos fora do escopo sem necessidade explícita.
- Nunca exponha segredos, tokens, dados pessoais ou conteúdo de e-mails.

## Organização e fluxo

- `app/`: páginas/layouts e Route Handlers, que são controllers HTTP finos.
- `modules/<domínio>/contracts`: Zod e DTOs compartilháveis.
- `modules/<domínio>/server`: regras, consultas Prisma e transações.
- `modules/<domínio>/components`: UI do domínio.
- `components/ui`: primitives shadcn compartilhados.
- `lib/server`: autenticação, contexto, banco, ambiente, HTTP, logger, e-mail e storage.
- `lib/client`: utilitários do navegador.
- `prisma/`: schema/migrações; `tests/`: unitários, integração e Playwright.

Use `@/*`. Código cliente nunca importa Prisma ou `server-only`.

Server Components carregam dados iniciais via services. Client Components cuidam de interação/formulário e enviam mutações com `lib/client/http.ts`; após sucesso usam `router.refresh()` quando necessário. Route Handlers verificam acesso/origem, resolvem `StoreContext`, validam HTTP e chamam services. Services validam regras/permissões e coordenam transações. Não adicione Redux, Zustand ou cache global sem necessidade real.

Estado: banco para dados do negócio; React Hook Form para rascunhos; React para UI; URL para busca/filtros/paginação; localStorage para carrinho e favoritos.

## Backend e isolamento

- Toda operação administrativa resolve identidade e loja no servidor. Nunca aceite `storeId` do formulário.
- Toda consulta/mutação da loja inclui `context.storeId`; dados de outra loja retornam 404.
- Mutações HTTP usam `assertAdminAccess(true)` e `getAdminContext()`.
- Valide entradas com Zod também no servidor. Prisma nunca vira resposta ao cliente; use DTOs.
- Use transação para alterações relacionadas; não faça I/O externo dentro da transação.
- Dinheiro usa centavos inteiros; datas da API usam ISO UTC.
- Resposta: `{ data }`. Erro: `{ error: { code, message, fieldErrors? } }`, via `handle()`/`AppError`.
- Use `logger`, nunca `console.*`, e não registre payload sensível.
- Mudança de schema exige nova migração Prisma. Nunca use `db push` em produção nem edite migração aplicada. Preserve a constraint manual `Store_logo_same_store`.

## Invariantes do domínio

- Better Auth controla senha (6–128 caracteres), confirmação, recuperação e sessão. `StoreMember` autoriza; cookies apenas selecionam uma loja já autorizada.
- Free: 10 produtos, 1 imagem/produto, métricas de 7 dias, somente logo, sem importação.
- Essencial: 50 produtos, importação, histórico, logo e cores.
- Profissional: até 1.000 produtos, personalização completa e campanha.
- Permissões de plano são impostas no servidor. Trial Profissional dura 14 dias; entrada pelo Free não o inicia. Downgrade aplica limites e o reset de personalização existente.
- `available` controla compra; `published` controla vitrine/limite; `archivedAt` representa exclusão.
- Ao excluir produto, preserve registro/métricas, remova relações de imagem e apague do storage somente assets sem outro uso. Proteja logo, banner e imagens compartilhadas.
- Upload aceita JPEG/PNG/WebP, valida com Sharp, converte para WebP e usa R2 em produção. A vitrine lê a URL pública do R2.
- Carrinho/favoritos usam chave versionada pelo ID da loja. Curtidas do banco são espelho analítico idempotente. Preview não gera métricas; falha analítica não bloqueia WhatsApp.
- Variantes não têm estoque; quando existem, somente combinações cadastradas são compráveis.

Antes de mudar essas regras, leia apenas o documento correspondente em `docs/`.

## Frontend

- Componha primitives shadcn existentes; instale/crie somente se faltar.
- Use tokens semânticos de `app/globals.css`; não adicione classes com hex arbitrário. Preserve a paleta verde salvo pedido explícito.
- Valide em 390 px e desktop, por teclado e leitor de tela.
- Exclusão usa `AlertDialog`; formulário usa `Dialog`. Garanta labels, erros, foco e nomes acessíveis.
- Evite botões aninhados, overflow de texto e envio duplicado. Operações assíncronas precisam de loading, erro útil e preservação do formulário.
- Use o padrão existente de `next/image`; R2 público não passa por `/api/assets`.
- Não use `useEffect` para valor derivável ou leitura possível no servidor.

## Código e validação

Biome controla formato/imports/lint; ESLint cobre espaçamento e early return. Use dois espaços, LF, aspas duplas, ponto e vírgula e 100 colunas. Sem `any`, `console`, código morto ou `else` após retorno. Não silencie TypeScript, exceções ou testes.

Para cada tarefa:

1. Leia este arquivo; inspecione implementação, contratos e testes afetados.
2. Confira `git status` e preserve mudanças alheias.
3. Entregue o fluxo inteiro necessário: contrato, servidor, UI, teste e documentação pertinente.
4. Adicione regressão para lógica, tenant, plano, cobrança, auth, storage ou bug recorrente.
5. Rode `bun run lint`, `bun run typecheck` e testes relacionados. Para mudança relevante, rode também `bun test` e `bun run build`; use Playwright para fluxos/layout.
6. Revise `git diff --check`, segredos e gerados. Faça commit objetivo e push na branch atual. Nunca faça amend/force push sem pedido.
7. Informe resultado, validações e hash do commit.

Comandos principais: `bun run dev`, `bun run db:deploy`, `bun run lint`, `bun run typecheck`, `bun test`, `bun run build`, `bun run test:e2e`, `bun run test:auth`.

Integração usa PostgreSQL real no banco isolado `tuavitrine_test`; nunca aponte testes/seed para produção. Migração de produção é separada do build.

Referências: `docs/architecture.md`, `docs/plans.md`, `docs/authentication.md`, `docs/storage.md`, `docs/feedback.md`, `docs/operations.md` e `docs/vercel-deployment.md`. Se código e documentação divergirem, confirme o comportamento nos testes e atualize a documentação junto com a correção.
