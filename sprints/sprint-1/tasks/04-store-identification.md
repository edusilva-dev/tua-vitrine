# 04 — Identificar e agrupar por loja

**Status:** implementação concluída em 2026-11-26; inspeção no PostHog depende do consentimento da
tarefa 05 e da instrumentação das tarefas 06 e 07.

## Objetivo

Associar eventos à loja correta, permitindo análise por tenant sem misturar a identidade do usuário
com a identidade do negócio.

## Contexto

Um usuário autenticado é uma pessoa; uma loja é o tenant. O contexto atual já resolve a loja no
servidor. `StoreDTO.signupPlan` é o plano escolhido no cadastro, não necessariamente o plano vigente;
o valor correto vem de `getEntitlements`. `store_id` continua obrigatório para auditoria e consultas
HogQL, mas um simples breakdown por essa propriedade não substitui um funil agregado por grupo.

## Implementação esperada

- chamar `group("store", store.id, propriedades_seguras)` no admin e na vitrine pública;
- resolver `plan` por `getEntitlements({ storeId })` e entregá-lo ao componente de identidade sem
  alterar o significado de `signupPlan`;
- incluir `store_id` e o plano efetivo nos eventos relevantes;
- limitar propriedades do grupo a `plan`, `status`, `onboarding_step` e datas não sensíveis aprovadas;
- não enviar nome, slug, WhatsApp ou URL da loja;
- atualizar associação quando a loja selecionada mudar;
- garantir que preview não seja contado como uso público;
- suportar captura server-side com `groups: { store: storeId }`;
- documentar consultas HogQL por `store_id` quando Group Analytics não estiver disponível.

## Arquivos/áreas afetadas

- `app/(admin)/admin/layout.tsx`
- `app/(storefront)/[slug]/page.tsx`
- `modules/storefront/server-page.tsx`
- `modules/billing/server/entitlements.ts`
- layout/service do admin necessário para resolver entitlements
- `modules/observability/components/analytics-identity.tsx`
- wrappers cliente/servidor
- contratos de eventos e testes

## Critérios de aceite

- [x] todo evento de loja contém `store_id` correto;
- [x] eventos suportados carregam o grupo `store`;
- [x] troca de loja atualiza o grupo sem alterar o `distinct_id` da pessoa;
- [x] vitrine pública agrupa por loja sem identificar o visitante;
- [x] preview não emite `catalog_viewed` nem eventos públicos;
- [x] nenhuma propriedade sensível aparece no grupo;
- [x] `plan` corresponde a `Entitlements.plan` após upgrade, trial, downgrade e cancelamento;
- [x] isolamento entre duas lojas é coberto por teste.

## Validação

- testes unitários do contexto de identidade/grupo;
- E2E com duas lojas autorizadas quando a fixture permitir;
- inspeção de eventos de duas lojas no PostHog de teste;
- consulta por grupo e, se necessária, consulta HogQL explicitamente agregada por `store_id`;
- lint e typecheck.

## Observações

Se o plano PostHog não oferecer Group Analytics, preservar `store_id`. Não tratar filtro ou breakdown
como agregação: o funil de loja exige uma consulta HogQL validada ou fica bloqueado.

## Evidências

- admin e vitrine pública resolvem `Entitlements.plan` no servidor e entregam somente ID, plano
  efetivo, status e etapa de onboarding ao componente cliente;
- o wrapper chama `group("store", store.id, properties)` de forma idempotente e reaplica o grupo
  após reset ou troca de loja, sem mudar a identidade da pessoa;
- a vitrine pública monta o grupo sem `userId`; o preview não monta a identidade pública;
- capturas server-side que possuem `store_id` enviam `groups: { store: storeId }` automaticamente;
- o contrato estrito rejeita nome, slug, WhatsApp, URL e qualquer propriedade adicional no grupo;
- testes cobrem duas lojas distintas, consentimento ausente, repetição, reset e propriedades seguras.

## Consulta HogQL de contingência

Quando Group Analytics não estiver disponível, consultas exploratórias podem agregar explicitamente
por `store_id`. Esta consulta conta lojas únicas por evento e ambiente; ela não substitui o funil
sequencial da tarefa 09:

```sql
SELECT
  event,
  uniqExact(properties.store_id) AS unique_stores
FROM events
WHERE
  properties.environment = 'production'
  AND properties.store_id IS NOT NULL
  AND timestamp >= now() - INTERVAL 30 DAY
GROUP BY event
ORDER BY unique_stores DESC
```

O Activation Funnel por loja exige uma consulta HogQL sequencial validada contra uma coorte conhecida
ou o recurso Group Analytics. Um breakdown de `store_id` continua insuficiente.
