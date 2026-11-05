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
- no funil de loja, agregar por grupo `store`;
- se Group Analytics não estiver disponível, criar e validar uma consulta HogQL que agregue a
  sequência por `store_id`; breakdown/filtro por propriedade não é fallback válido;
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
- [ ] fallback, se usado, é HogQL agregado por `store_id` e foi validado contra coorte conhecida;
- [ ] breakdown por plano funciona;
- [ ] fluxo canônico aparece em ordem e sem duplicidade indevida;
- [ ] drop-offs podem ser abertos para eventos/replays consentidos;
- [ ] descrições explicam onboarding, ativação e por que os funis não foram unidos.

## Validação

- criar uma conta/loja sintética em staging e concluir toda a jornada;
- conferir timestamps, pessoa, grupo, propriedades e contagem em cada passo;
- repetir um passo e confirmar que o funil não infla a unidade agregada;
- se usar HogQL, comparar o resultado com uma contagem manual por `store_id`;
- testar filtro por plano e origem;
- registrar capturas/evidências sem dados pessoais.

## Observações

Não incluir assinatura como requisito de ativação neste sprint. Conversão comercial pode virar um
segundo funil após a qualidade dos dados ser comprovada.

## Validação no projeto de desenvolvimento — 05/11/2026

Projeto PostHog `710815`; insights criados pelo administrador do projeto, Eduardo Silva:

| Insight de validação | Unidade | Filtro e breakdown | Link |
| --- | --- | --- | --- |
| Merchant Onboarding Funnel — Sprint 1 (dev validation) | pessoa | `environment = development`; `signup_plan` no primeiro passo | [Abrir](https://us.posthog.com/project/710815/insights/zI7e7bXe) |
| Store Activation Funnel — Sprint 1 (dev validation) | grupo `store` (índice 0) | `environment = development`; propriedade `plan` do grupo | [Abrir](https://us.posthog.com/project/710815/insights/3KuO71Fo) |
| Store Activation by WhatsApp Location — Sprint 1 (dev validation) | grupo `store` (índice 0) | `environment = development`; `location` atribuída ao quinto passo | [Abrir](https://us.posthog.com/project/710815/insights/qkGBPmH9) |

Os três usam ordem sequencial e janela de conversão de 14 dias. O primeiro produto é filtrado por
`is_first_product = true`. A visualização mostra conversão desde o início; a opção de conversão
relativa ao passo anterior permanece disponível no insight.

Um fluxo sintético local completou cadastro, confirmação de e-mail, criação da loja, primeiro
produto, publicação, abertura da vitrine e clique no WhatsApp. A consulta salva retornou uma pessoa
convertida nos quatro passos e um grupo `store` convertido nos cinco passos. Visitas e cliques
repetidos da mesma loja não aumentaram a contagem do grupo. As três tentativas de cadastro anteriores
que não chegaram à loja permanecem nos dados de desenvolvimento: por isso o funil do lojista mostra
quatro entradas e 25% de conversão, enquanto o de loja mostra uma entrada e 100%.

`source` identifica a origem técnica fixa de cada evento (`better_auth`, `onboarding`,
`catalog_service` ou `storefront`), não uma origem de aquisição. Um breakdown por `source` neste funil
seria constante ou atribuiria um valor diferente a cada passo; não mede canal de entrada. Ele só
será salvo quando houver um atributo de aquisição classificado e instrumentado em tarefa própria.

Os insights acima são apenas para validar desenvolvimento. Ainda faltam o projeto/fluxo de produção,
o filtro `environment = production` nos insights oficiais, a auditoria de replay e a política da
tarefa 05. Consentimento, bloqueadores de anúncios e a combinação de eventos server/client podem
reduzir a conversão observada. A tarefa 09 permanece aberta até a validação da versão oficial.
