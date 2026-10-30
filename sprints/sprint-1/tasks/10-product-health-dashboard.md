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

- [ ] todos os dez cartões mínimos existem;
- [ ] cada cartão possui definição, evento, filtro, agregação e janela;
- [ ] filtro de produção está aplicado;
- [ ] planos podem ser comparados onde aplicável;
- [ ] contagem de lojas usa grupo ou `store_id`, nunca pessoas por engano;
- [ ] cartão de lojas ativas usa exatamente os eventos qualificadores do documento mestre;
- [ ] billing é apresentado como tendência analítica, não fonte financeira;
- [ ] dashboard inclui os dois funis validados sem uni-los artificialmente;
- [ ] links e owner estão registrados sem segredos.

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
