# 09 — Criar Activation Funnel

## Objetivo

Criar e validar dois funis complementares: onboarding do lojista e ativação da loja até o primeiro
clique no WhatsApp.

## Contexto

Os insights só devem ser criados após os eventos reais aparecerem com propriedades corretas. A conta
pertence a uma pessoa; o contato final é feito por um visitante anônimo. Como grupos não são aplicados
retroativamente a eventos anteriores à loja, unir toda a jornada em um único funil distorceria os
dados.

## Implementação esperada

- criar **Merchant Onboarding Funnel — Sprint 1**, agregado por pessoa, com `account_created` →
  `store_created` → primeiro `product_created` → `store_published`;
- criar **Store Activation Funnel — Sprint 1**, agregado por loja, com `store_created` → primeiro
  `product_created` → `store_published` → `catalog_viewed` → `whatsapp_clicked`;
- usar a janela de 14 dias definida no documento mestre;
- no funil de loja, agregar por grupo `store` e usar `store_id` como fallback documentado;
- filtrar `environment = production` na versão oficial;
- configurar visualização de conversão geral e relativa;
- adicionar breakdowns úteis por plano/origem;
- executar um fluxo canônico em ambiente não produtivo e conferir a sequência;
- registrar owner, descrição, data e link de cada insight em local não sensível;
- documentar limitações de consentimento, ad blockers e eventos server/client.

## Arquivos/áreas afetadas

- projeto PostHog (insight/funnel)
- este arquivo e/ou documento mestre para link e evidência
- nenhum código de produto, salvo correção de instrumentação descoberta e revisada separadamente

## Critérios de aceite

- [ ] funil do lojista contém os quatro passos definidos e agrega por pessoa;
- [ ] funil da loja contém os cinco passos definidos e agrega por loja;
- [ ] janela de conversão de 14 dias;
- [ ] ambiente de produção filtrado no insight oficial;
- [ ] unidade de agregação de cada funil está documentada;
- [ ] breakdown por plano funciona;
- [ ] fluxo canônico aparece em ordem e sem duplicidade indevida;
- [ ] drop-offs podem ser abertos para eventos/replays consentidos;
- [ ] descrições explicam onboarding, ativação e por que os funis não foram unidos.

## Validação

- criar uma conta/loja sintética em staging e concluir toda a jornada;
- conferir timestamps, pessoa, grupo, propriedades e contagem em cada passo;
- repetir um passo e confirmar que o funil não infla a unidade agregada;
- testar filtro por plano e origem;
- registrar capturas/evidências sem dados pessoais.

## Observações

Não incluir assinatura como requisito de ativação neste sprint. Conversão comercial pode virar um
segundo funil após a qualidade dos dados ser comprovada.
