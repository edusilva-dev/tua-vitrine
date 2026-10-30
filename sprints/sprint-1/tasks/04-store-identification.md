# 04 — Identificar e agrupar por loja

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

## Resultado da implementação

O layout do admin e a página pública recebem o plano efetivo de `getEntitlements`. Ambos passam ao
componente de identidade somente ID, plano, status e etapa de onboarding. O adaptador valida essas
propriedades antes de chamar `group("store", ...)` e atualiza o grupo quando a loja ou o plano muda.
Na navegação do admin para a vitrine, a identidade pessoal é limpa antes da associação pública.

Os wrappers de browser e servidor enviam o grupo de cada evento de loja a partir do `store_id`
validado pelo contrato. `account_created` permanece sem grupo. A vitrine de preview continua sem
emissão de eventos públicos; a captura de `catalog_viewed` pertence à tarefa 07.

Se Group Analytics não estiver disponível, esta consulta HogQL permite auditar contagens por loja
sem confundir eventos de uma pessoa com lojas distintas:

```sql
SELECT properties.store_id AS store_id, event, count() AS total
FROM events
WHERE properties.environment = 'staging'
  AND properties.store_id IS NOT NULL
  AND event IN ('store_created', 'product_created', 'store_published',
                'catalog_viewed', 'whatsapp_clicked')
GROUP BY store_id, event
ORDER BY store_id, event
```

O funil sequencial agregado por `store_id` continua na tarefa 09 e precisa de validação com uma coorte
conhecida. A inspeção de eventos reais de duas lojas no PostHog permanece pendente até a tarefa 05
habilitar consentimento e existir projeto não produtivo configurado.

Validação local em 30/10/2026 com Bun 1.3.14: lint, typecheck, 125 testes, build e os 12 cenários
Playwright da vitrine em desktop e mobile passaram. Os testes unitários cobrem troca de duas lojas,
limite de propriedades do grupo e transição do admin para a vitrine anônima.
