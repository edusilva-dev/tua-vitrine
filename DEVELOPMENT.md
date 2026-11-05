# Regras de desenvolvimento

Este arquivo é a referência canônica para implementar e revisar código no Tua Vitrine. Antes de
alterar uma área, leia também o documento do domínio correspondente em `docs/` e os testes próximos.
Código antigo pode conter padrões diferentes; não amplie a inconsistência nem refatore arquivos fora
do escopo somente para adequá-los a estas regras.

## Princípios

- implemente a menor solução completa para o problema atual;
- procure funções, componentes, schemas e adaptadores existentes antes de criar novos;
- não crie camadas, constantes, catálogos ou abstrações para uma única utilização;
- mantenha regras de negócio explícitas e próximas do domínio que as utiliza;
- preserve mudanças alheias e não altere dependências ou versões sem necessidade da tarefa.

## Organização

- `app/`: páginas, layouts e Route Handlers finos;
- `modules/<domínio>/contracts`: schemas Zod e contratos compartilhados;
- `modules/<domínio>/server`: regras de negócio, Prisma, transações e integrações server-side;
- `modules/<domínio>/components`: componentes do domínio;
- `modules/<domínio>/client`: adaptadores e utilitários exclusivos do navegador;
- `components/ui`: primitives compartilhadas do shadcn;
- `lib/server`: infraestrutura transversal do servidor;
- `lib/client`: infraestrutura transversal do navegador;
- `tests/unit`, `tests/integration` e Playwright: testes por nível.

Use imports absolutos com `@/*`. Código cliente nunca importa Prisma, `server-only` ou módulos de
servidor. Arquivos server-side que não podem entrar no bundle do navegador importam `server-only`.

## TypeScript e contratos

- use `interface` para DTOs, props, configurações, estados e qualquer outra estrutura de objeto;
- não crie aliases `type Nome = { ... }`;
- use `type` somente quando uma interface não puder representar o contrato, como união, tipo mapeado,
  tipo condicional ou inferência direta de um schema; antes disso, prefira inferência da função;
- não use `any`, non-null assertion ou supressão de TypeScript;
- deixe o retorno ser inferido em funções internas; declare retorno quando ele fizer parte do contrato
  público ou proteger uma fronteira importante;
- valide entradas externas com Zod no servidor; Prisma não atravessa a fronteira HTTP;
- DTOs expõem somente os campos necessários e usam datas ISO UTC e dinheiro em centavos inteiros.

Valores aceitos por uma configuração devem ter uma única fonte de verdade. Não crie arrays ou enums
auxiliares apenas para repetir os valores de um schema existente.

## Ambiente e configuração

`lib/server/env.ts` é a autoridade para declarar, validar, normalizar e combinar variáveis de
ambiente. Novas integrações devem:

- adicionar suas variáveis ao schema existente;
- validar juntas as variáveis que formam uma configuração indivisível;
- permanecer opcionais somente quando existir comportamento `noop` seguro;
- nunca fornecer fallback de produção para token, host ou credencial;
- expor ao navegador apenas variáveis `NEXT_PUBLIC_*` deliberadamente públicas;
- não criar um módulo genérico de configuração que replique enumerações ou regras do `env.ts`.

Quando o navegador precisar de inicialização própria, mantenha o adaptador em
`modules/<domínio>/client` e passe a ele somente as variáveis públicas necessárias.

## Backend

- Route Handlers autenticam, validam HTTP e chamam services; não contêm regra de negócio;
- services aplicam permissões e regras, coordenam transações e retornam DTOs;
- repositories concentram consultas reutilizadas quando essa separação reduz duplicação real;
- operações administrativas derivam `storeId` do contexto autenticado, nunca do formulário;
- toda consulta de tenant inclui `context.storeId`; acesso cruzado retorna 404;
- I/O externo não acontece dentro de transações de banco;
- falhas de integração secundária não desfazem a operação principal quando a regra do domínio define
  execução best-effort.

Use `AppError` e `handle()` para erros HTTP esperados. Use `logger` no servidor, nunca `console.*`, e
nunca registre segredos, tokens, payloads pessoais ou conteúdo de e-mail.

## Frontend

- Server Components carregam os dados iniciais por services;
- Client Components cuidam somente de interação e formulário;
- mutações usam `lib/client/http.ts` e atualizam dados do servidor com `router.refresh()` quando
  necessário;
- use React Hook Form para rascunhos, URL para filtros e localStorage apenas para estado local
  deliberadamente persistente;
- não use `useEffect` para valores deriváveis ou dados que possam ser lidos no servidor;
- componha primitives existentes e use tokens semânticos de `app/globals.css`.

## Código e nomes

- funções e variáveis usam camelCase; componentes, classes e interfaces usam PascalCase;
- constantes realmente compartilhadas usam SCREAMING_SNAKE_CASE; valores locais de uso único ficam
  no ponto de uso;
- prefira funções pequenas com early return e sem `else` após retorno;
- comentários explicam decisões e riscos, não repetem o código;
- Biome define dois espaços, LF, aspas duplas, ponto e vírgula e largura de 100 colunas.

## Testes e entrega

- lógica pura recebe teste unitário;
- Prisma, isolamento de loja, transações e idempotência recebem teste de integração no PostgreSQL
  `tuavitrine_test`;
- fluxos reais de interface, autenticação e responsividade usam Playwright;
- testes nunca acessam produção nem enviam telemetria externa;
- toda correção de bug inclui regressão quando tecnicamente possível.

Antes de entregar, rode lint, typecheck, testes relacionados e `git diff --check`. Para mudanças
relevantes, rode também a suíte completa e o build. Não silencie falhas e registre separadamente
qualquer validação externa que dependa de credenciais ou serviço de terceiro.
