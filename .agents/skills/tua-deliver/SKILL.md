---
name: tua-deliver
description: Implementa e valida uma subtarefa delimitada do tua-vitrine seguindo seus contratos e invariantes.
---

# Entregar uma subtarefa

Leia AGENTS.md, o objetivo delegado e somente docs/testes do domínio afetado.
Reutilize contratos, serviços e primitives existentes. Consulte docs locais do Next antes de
alterar recursos do framework. Contrato HTTP → service → UI deve ficar completo quando aplicável.

Edite somente arquivos sob sua responsabilidade. Se precisar alterar um contrato compartilhado,
devolva a necessidade ao orquestrador para coordenar; não sobrescreva trabalho de outro agente.
Se o risco aumentar, peça reclassificação. Não delegue, não faça commit/push/merge.

Adicione regressão para lógica, tenant, plano, cobrança, auth, storage ou bug recorrente.
Use exclusivamente Bun 1.3.14. Execute testes focados; o orquestrador executa os checks integrados:

- Sempre `bun run lint`, `bun run typecheck` e `git diff --check`.
- Mudança relevante: `bun test` e `bun run build`.
- Fluxo/layout: Playwright, 390 px e desktop; foco, teclado e acessibilidade.
- Harness: `bun run harness:check` e `bun run spec -- validate --all --strict`.

Testes com banco usam somente `tuavitrine_test` local; veja `docs/ai-workflow.md` para preparação.
Não execute testes concorrentes no mesmo banco. Não rode migrações/seed usando `.env` de produção.
Falha por ambiente é pendência explícita, nunca teste aprovado ou motivo para silenciar teste.

Retorne resumo curto, arquivos alterados, comandos e resultados, riscos e pendências.
Não aprove a própria mudança: revisão independente pertence ao code-reviewer.
