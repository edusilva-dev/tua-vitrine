# 02 — Criar contrato e wrapper de analytics

## Objetivo

Criar a única API autorizada para eventos, com nomes e propriedades tipados, defaults comuns,
sanitização e adaptadores separados para browser e servidor.

## Contexto

O SDK não pode se espalhar pelos componentes. O contrato deve impedir PII, divergência de nomes e
eventos com propriedades arbitrárias. `modules/analytics` já pertence às métricas do lojista; esta
camada fica em `modules/observability`.

## Implementação esperada

- definir os 11 eventos e seus payloads em `contracts/events.ts`;
- incluir `schema_version: 1`, `environment`, `release`, `surface` e `source` por adaptador;
- criar API explícita, por exemplo `analytics.productCreated(...)`;
- criar adaptador cliente sobre `posthog-js` e servidor sobre `posthog-node`;
- aceitar apenas enums e propriedades documentadas;
- normalizar nomes de plano e valores ausentes;
- aplicar noop quando desabilitado; no cliente, também quando não houver consentimento;
- manter o adaptador de servidor em noop na produção enquanto a base legal/controle server-side não
  estiver aprovado e implementado;
- capturar falhas de telemetria sem bloquear a operação e sem `console.*`;
- tornar o wrapper injetável/testável;
- impedir imports diretos do SDK por lint/teste de arquitetura, se viável sem complexidade excessiva.

## Arquivos/áreas afetadas

- `modules/observability/contracts/events.ts` (novo)
- `modules/observability/client/analytics.ts` (novo)
- `modules/observability/server/analytics.ts` (novo)
- `modules/observability/server/posthog.ts`
- `lib/server/logger.ts` apenas se necessário, sem mudar sua responsabilidade
- `tests/unit/observability*.test.ts` (novo)

## Critérios de aceite

- [x] todos os eventos do documento mestre possuem método e payload tipado;
- [x] não existe método público genérico com nome/payload livres;
- [x] propriedades comuns são aplicadas de modo consistente;
- [x] propriedades proibidas e desconhecidas falham em teste/desenvolvimento;
- [x] noop é silencioso e testado no cliente e no servidor;
- [x] cliente respeita consentimento e servidor respeita a política de habilitação definida;
- [x] falha do fornecedor não altera o resultado da operação de negócio;
- [x] imports de `posthog-js`/`posthog-node` ficam restritos aos adaptadores/bootstrap;
- [x] testes cobrem nome final, propriedades, sanitização e erro do cliente PostHog.

## Validação

- testes unitários com cliente falso para browser e servidor;
- teste de compilação dos payloads válidos e inválidos;
- busca no repositório por imports diretos do SDK;
- lint e typecheck.

## Observações

IDs internos não são PII direta, mas continuam dados pseudonimizados. Não permitir e-mail, nome,
telefone, slug, mensagem, descrição, termo de busca, URL completa ou objeto livre no contrato.

## Resultado da implementação

- `contracts/events.ts` contém os 11 payloads como `interface`, schemas estritos, serialização para
  `snake_case` e propriedades comuns versionadas;
- os planos reutilizam os schemas existentes de billing como fonte única;
- `client/analytics.ts` expõe somente os quatro eventos de interação e exige consentimento explícito;
- `server/analytics.ts` expõe somente os sete eventos de resultado e recebe `distinctId` fora das
  propriedades do evento;
- `distinctId` aceita somente os 32 caracteres alfanuméricos gerados pela configuração atual do
  Better Auth, sem presumir UUID e sem aceitar e-mail, telefone, nome ou slug;
- `source` e `surface` são derivados pelo contrato, nunca aceitos como texto livre do chamador;
- valores opcionais ausentes não são enviados e `release` pode ser `null` no browser;
- propriedades desconhecidas são rejeitadas em desenvolvimento/testes e descartam o evento em
  produção;
- falhas do SDK são reportadas sem propagar exceção para a operação de negócio;
- um teste arquitetural impede novos imports diretos dos SDKs fora dos pontos autorizados.

Validação executada em 2026-10-30:

- `bun run check`: lint, TypeScript e 113 testes aprovados;
- build de produção com configuração completa do PostHog aprovado;
- 9 testes específicos do wrapper, incluindo propriedades proibidas, noop, consentimento, falha do
  fornecedor e limite de imports;
- `git diff --check` aprovado.
