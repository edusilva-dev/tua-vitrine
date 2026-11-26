# 02 — Criar contrato e wrapper de analytics

**Status:** concluída em 2026-11-25.

## Objetivo

Criar a única API autorizada para eventos, com nomes e propriedades tipados, defaults comuns,
sanitização e adaptadores separados para browser e servidor.

## Contexto

O SDK não pode se espalhar pelos componentes. O contrato deve impedir PII, divergência de nomes e
eventos com propriedades arbitrárias. `modules/analytics` já pertence às métricas do lojista; esta
camada fica em `modules/observability`.

## Implementação esperada

- definir os 13 eventos e seus payloads em `contracts/events.ts`;
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

## Evidências

- catálogo versionado com os 13 eventos, propriedades finais em `snake_case` e vocabulários fechados;
- métodos explícitos para browser e servidor, sem API pública para nomes ou payloads arbitrários;
- captura do browser depende de configuração e consentimento; servidor permanece noop em produção;
- payload inválido falha em desenvolvimento/teste e é descartado em produção;
- falhas do SDK são isoladas da operação de negócio e o servidor registra somente o nome do evento;
- teste de arquitetura limita imports dos SDKs ao bootstrap e aos adaptadores autorizados.
