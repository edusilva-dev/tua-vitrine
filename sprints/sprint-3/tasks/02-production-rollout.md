# 02 — Preparar produção e alertas

**Status:** em andamento.

## Objetivo

Garantir que os eventos publicados sejam acionáveis, separados por ambiente e ligados ao código que
os produziu.

## Implementação

- cadastrar o DSN em production, staging e preview;
- cadastrar o token de source maps somente nos ambientes de build necessários;
- confirmar environment e release nos eventos;
- validar source maps em um deployment de preview;
- criar alerta por e-mail para erro novo em produção;
- documentar consulta, triagem e resolução de issues.

## Critérios de aceite

- [x] DSN e token de source maps estão configurados na Vercel sem segredo versionado;
- [ ] preview envia evento com ambiente correto;
- [ ] stack trace aponta para arquivo e linha legíveis;
- [x] alerta de erro novo está ativo somente para produção;
- [x] procedimento operacional está documentado.

## Procedimento operacional

1. Abra **Issues** no projeto `tua-vitrine` e filtre primeiro por `environment:production`.
2. Confirme a primeira e a última ocorrência, a rota, o release e a quantidade de usuários afetados.
3. Leia o stack trace e os breadcrumbs; use os Runtime Logs da Vercel para acompanhar a execução
   completa no mesmo horário.
4. Corrija a causa e marque a issue como resolvida no próximo release. Se ela reaparecer, o Sentry a
   reabre como regressão.
5. Arquive apenas eventos conhecidos e sem ação. Não silencie uma classe de erro antes de registrar o
   motivo.

O alerta inicial deve avisar a equipe por e-mail quando uma issue aparecer pela primeira vez em
produção. Staging e previews permanecem consultáveis, mas não disparam esse alerta.

## Configuração aplicada

- `NEXT_PUBLIC_SENTRY_DSN`: Config da Vercel em Production e Preview;
- `SENTRY_AUTH_TOKEN`: Secret da Vercel em Production e Preview, com escopo `org:ci`;
- alerta `Novo erro em produção`: primeira ocorrência, ambiente `production`, e-mail para a equipe
  `Tua Vitrine`.

A validação final do ambiente e dos source maps deve acontecer no primeiro deployment de preview
desta branch. Depois do merge, a mesma conferência deve ser repetida uma vez em produção.
