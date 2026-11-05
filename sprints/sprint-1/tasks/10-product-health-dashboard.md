# 10 — Criar Product Health Dashboard

## Objetivo

Concentrar indicadores de aquisição, ativação, uso da vitrine, contato e assinatura em um dashboard
operacional com definições explícitas.

## Contexto

Um dashboard só é confiável quando cada cartão declara evento, agregação e janela. Métricas do PostHog
podem divergir das métricas internas por consentimento, bloqueadores e origem client-side.

## Implementação esperada

- criar dashboard **Product Health — Sprint 1**;
- adicionar os dez cartões definidos no documento mestre;
- usar período padrão de 30 dias e filtro de produção;
- definir “loja ativa em 7 dias” pela lista exata do documento mestre e agregar por grupo `store` ou
  HogQL explícito por `store_id`;
- usar lojas únicas, usuários únicos ou eventos totais conforme o significado do cartão;
- adicionar descrições, owner e última revisão;
- incluir os funis de onboarding do lojista e ativação da loja;
- permitir breakdown por plano e origem quando tecnicamente correto;
- registrar limitações diretamente na descrição do dashboard;
- validar números com uma pequena coorte sintética conhecida.

## Arquivos/áreas afetadas

- projeto PostHog (dashboard e insights)
- este arquivo e/ou documento mestre para link e evidência
- nenhum código de produto, salvo correção separada de instrumentação

## Critérios de aceite

- [x] todos os dez cartões mínimos existem no dashboard de validação;
- [x] cada cartão possui definição, evento, filtro, agregação e janela;
- [ ] filtro de produção está aplicado;
- [x] planos podem ser comparados onde aplicável (funil da loja e tendência de billing);
- [x] contagem de lojas usa grupo `store`, nunca pessoas por engano;
- [x] cartão de lojas ativas usa exatamente os eventos qualificadores do documento mestre;
- [x] billing é apresentado como tendência analítica, não fonte financeira;
- [x] dashboard inclui os dois funis validados sem uni-los artificialmente;
- [x] links e owner estão registrados sem segredos.

## Validação

- conferir cada insight com eventos brutos da coorte sintética;
- comparar uma amostra de `catalog_viewed`/`product_viewed` com métricas internas e explicar
  divergências;
- testar janelas de 7 e 30 dias;
- testar filtros de ambiente, plano e origem;
- revisão visual do dashboard por quem administrará o produto.

## Observações

Evitar métricas de vaidade sem decisão associada. Qualquer cartão adicional deve responder a uma
pergunta operacional clara e ter definição registrada.

## Validação no projeto de desenvolvimento — 05/11/2026

Projeto PostHog `710815`. Dashboard [Product Health — Sprint 1 (dev validation)](https://us.posthog.com/project/710815/dashboard/2308370),
com `environment = development`. Responsável: Eduardo Silva. Última revisão: 05/11/2026.
O catálogo governado de métricas do projeto está vazio; estas definições do sprint ainda não são
métricas aprovadas no Data Catalog.

| Cartão | Definição e agregação | Janela | Resultado da coorte de desenvolvimento |
| --- | --- | --- | --- |
| 1. Contas criadas | `account_created`: eventos totais e pessoas únicas | 30 dias | 4 eventos, 4 pessoas |
| 2. Lojas criadas | `store_created`: grupos `store` únicos | 30 dias | 1 loja |
| 3. Lojas publicadas | `store_published`: total; grupos publicados / grupos criados no mesmo período | 30 dias | 1 evento, 100% |
| 4. Primeiros produtos | `product_created` com `is_first_product = true`: total | 30 dias | 1 evento |
| 5. Lojas ativas | Grupos `store` únicos com qualquer um dos dez eventos qualificadores do documento mestre | 7 dias | 2 lojas |
| 6. Catálogos | `catalog_viewed`: total e grupos `store` únicos | 30 dias | 17 eventos, 2 lojas |
| 7. Produtos | `product_viewed`: total e razão sobre `catalog_viewed` | 30 dias | 6 eventos, 35,29% |
| 8. WhatsApp | `whatsapp_clicked`: total, grupos `store` únicos e razão sobre `catalog_viewed` | 30 dias | 5 eventos, 2 lojas, 29,41% |
| 9. Assinaturas | `subscription_started` e `subscription_cancelled`: tendência por `plan` | 30 dias | Sem eventos na coorte |
| 10. Funis | [Onboarding do lojista](https://us.posthog.com/project/710815/insights/zI7e7bXe) por pessoa e [ativação da loja](https://us.posthog.com/project/710815/insights/3KuO71Fo) por grupo `store` | 30 dias de entradas; conversão em 14 dias | 4 → 1 pessoa; 1 → 1 loja |

Os cartões 3, 7 e 8 separam os totais das taxas para que ambas as leituras permaneçam visíveis. As
taxas dos cartões 7 e 8 são razões entre eventos, não conversões de visitantes. A taxa do cartão 3
compara grupos que tiveram eventos na mesma janela, não uma coorte de lojas criadas. A descrição do
dashboard registra essas limitações, o consentimento/bloqueadores, o caráter sintético dos dados e que
billing não substitui a fonte financeira. `source` é o emissor técnico e não foi usado como canal de
aquisição. O funil da loja já permite comparação por plano; o cartão de billing possui breakdown por
`plan`, mas a coorte não contém eventos de assinatura para validar números por plano.

As consultas de cartões e funis retornaram os números acima quando executadas individualmente. A
execução em lote do dashboard retornou `null` para alguns cartões que funcionaram individualmente;
isso exige conferência visual adicional no PostHog. Os números de vitrine não foram comparados com a
base interna por loja nesta etapa. Essa amostra e a revisão visual pelo administrador ficam para a
validação em staging.

Pendente: criar a versão oficial com `environment = production` após a tarefa 11 liberar a captura,
validar eventos de assinatura e os outros eventos ainda ausentes da taxonomia, comparar uma amostra
com as métricas internas e revisar filtros de ambiente/plano no staging. Nenhuma captura de produção
foi habilitada por esta tarefa.
