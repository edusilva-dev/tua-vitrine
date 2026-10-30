# Sprint 1 — Fundação de observabilidade de produto com PostHog

> **Documento mestre do sprint.** Leia este arquivo antes de implementar ou revisar qualquer tarefa
> de observabilidade. Em caso de divergência, este documento prevalece sobre os arquivos de tarefa;
> decisões novas devem ser registradas aqui antes de alterar a implementação.

## Estado do sprint

- **Status:** implementação em andamento; tarefas 01 e 02 implementadas, com smoke test externo da
  tarefa 01 pendente.
- **Tema:** product analytics e UX analytics com PostHog.
- **Produto:** Tua Vitrine.
- **Públicos observados:** lojistas autenticados e visitantes anônimos das vitrines públicas.
- **Referência de implementação:** tarefas numeradas em [`tasks/`](./tasks/).
- **Fora deste sprint:** Sentry, OpenTelemetry, Grafana, observabilidade de infraestrutura e painel
  administrativo próprio.

## Como recuperar o contexto

Ao retomar o trabalho:

1. leia este documento por inteiro;
2. confira a seção **Ordem de execução** e o status de cada tarefa;
3. leia apenas a tarefa que será executada e suas dependências;
4. confira `git status`, `AGENTS.md` e a implementação atual antes de editar;
5. atualize este documento se uma decisão arquitetural mudar.

Não implemente eventos diretamente em componentes sem passar pelo contrato e pelo wrapper definidos
neste sprint.

## Contexto e problema

O Tua Vitrine já possui métricas de negócio visíveis ao lojista em `modules/analytics`, persistidas no
PostgreSQL. Elas registram impressões, visualizações de produto e curtidas por loja. Isso não responde,
porém, às perguntas do administrador do SaaS: quem conclui o onboarding, onde o lojista abandona o
fluxo, quais recursos são usados, como uma sessão chegou a um erro e quais lojas estão ativando.

Este sprint cria a primeira camada de observabilidade de produto sem substituir as métricas atuais:

- **PostgreSQL + `modules/analytics`:** fonte das métricas que pertencem ao lojista e aparecem no
  painel dele;
- **PostHog + `modules/observability`:** telemetria do produto para o administrador do Tua Vitrine;
- **logs atuais:** diagnóstico operacional do servidor;
- **Sentry e OpenTelemetry:** evolução posterior, não dependência deste sprint.

## Objetivo

Ao final do sprint, o administrador deve conseguir:

- acompanhar a jornada da criação da conta até o primeiro contato pelo WhatsApp;
- segmentar resultados por loja, plano, ambiente, origem e superfície;
- reconhecer um lojista autenticado por um identificador interno estável, sem enviar e-mail ou nome;
- correlacionar eventos de uma mesma loja;
- assistir a replays consentidos com proteção de dados habilitada;
- consultar um funil de ativação e um dashboard de saúde do produto;
- confiar que eventos críticos representam ações concluídas, e não apenas cliques tentados.

## Escopo

### Incluído

- criação/configuração do projeto PostHog e ambientes;
- SDK web e SDK de servidor para Next.js App Router;
- contrato tipado e versionado de eventos;
- wrapper único para captura no browser e no servidor;
- identificação de lojista autenticado e reset no logout;
- associação de eventos à loja;
- eventos principais de conta, onboarding, catálogo, WhatsApp e assinatura;
- Session Replay com consentimento, mascaramento e auditoria de privacidade;
- Activation Funnel;
- Product Health Dashboard;
- testes do contrato/wrapper, smoke test de ingestão e checklist de rollout.

### Não incluído

- heatmaps e autocapture genérico;
- feature flags e experimentos;
- error tracking pelo PostHog;
- Sentry, Vercel Observability adicional, OpenTelemetry, Grafana ou Better Stack;
- envio de logs do servidor ao PostHog;
- substituição do banco de métricas do lojista;
- painel administrativo próprio;
- importação retroativa de eventos históricos;
- captura de texto de busca, conteúdo do carrinho, mensagens de WhatsApp ou campos de formulário.

Heatmaps ficam para uma fase posterior porque dependem de autocapture e de uma nova revisão de
privacidade. Os cliques importantes deste sprint serão eventos explícitos.

## Decisões arquiteturais

### 1. PostHog é adaptador, não API da aplicação

Código de produto não deve importar `posthog-js` nem `posthog-node`. As únicas exceções são os
adaptadores internos de `modules/observability` e o bootstrap em `instrumentation-client.ts`.

Chamadas esperadas:

```ts
analytics.productCreated({ productId, creationMethod: "manual" });
```

Chamadas proibidas fora do adaptador:

```ts
posthog.capture("product_created", payload);
```

Isso preserva tipagem, convenções, privacidade, testes e possibilidade de trocar o fornecedor.

### 2. Camada separada de `modules/analytics`

O novo código deve residir em `modules/observability`, com contratos compartilhados, adaptador de
browser, adaptador de servidor e componentes de identidade. `modules/analytics` continua responsável
pelas métricas do lojista. Não duplicar a persistência do PostHog no PostgreSQL neste sprint.

Estrutura esperada, sujeita a pequenos ajustes justificados na tarefa 02:

```text
instrumentation-client.ts
modules/observability/
  client/analytics.ts
  components/analytics-identity.tsx
  contracts/events.ts
  server/analytics.ts
  server/posthog.ts
```

### 3. Captura no ponto que confirma o resultado

- **Eventos de intenção/interação** (`product_creation_started`, `catalog_viewed`, `product_viewed`,
  `whatsapp_clicked`) nascem no browser.
- **Eventos de resultado de negócio** (`store_created`, `store_published`, `product_created`,
  `product_deleted`, `subscription_started`, `subscription_cancelled`) nascem no servidor, após a
  operação persistir com sucesso.
- `account_created` deve ser emitido pelo fluxo confiável de criação da conta e obedecer à política da
  tarefa 05. A implementação deve preferir um hook de servidor do Better Auth quando a captura
  server-side estiver autorizada; se a política exigir consentimento do browser, usar o retorno de
  sucesso do cliente com o UUID devolvido e idempotência documentada.
- Falha de telemetria nunca desfaz nem bloqueia a operação do produto. A captura é best-effort e erros
  usam o `logger` sem dados sensíveis.

### 4. Identidade de pessoa e loja são conceitos diferentes

- Lojista autenticado: `distinct_id = user.id` interno e estável.
- Visitante da vitrine: permanece anônimo; não criar perfil de pessoa.
- Loja: `group_type = "store"`, `group_key = store.id`.
- Todo evento de loja também inclui `store_id` como propriedade para consultas que não dependam de
  Group Analytics.
- Nunca usar e-mail, telefone, slug, nome da pessoa ou nome da loja como identificador.
- No logout, executar `reset()` para impedir que a próxima pessoa herde a identidade anterior.

O SDK web deve usar perfis apenas para pessoas identificadas. A identificação é montada no layout do
admin, onde `userId` e `StoreDTO` já são resolvidos no servidor. Na vitrine pública, apenas a loja é
associada; o visitante continua anônimo.

### 5. Cliente e servidor compartilham o mesmo catálogo de eventos

O arquivo de contratos define nomes, propriedades permitidas e `schema_version`. Métodos públicos do
wrapper são explícitos; não expor um `capture(name: string, properties: unknown)` ao código de produto.
Propriedades inesperadas devem falhar em teste/desenvolvimento e não devem ser enviadas.

### 6. Ambientes separados logicamente

Produção não pode receber eventos de desenvolvimento ou testes. Preferência:

1. projeto PostHog separado para produção e outro para desenvolvimento/staging; ou
2. se a conta não permitir, uma propriedade obrigatória `environment` e filtros salvos em todos os
   insights.

Testes automatizados não enviam eventos reais. Ausência de token deixa o adaptador em modo `noop`.
Os tokens de projeto são públicos por natureza, mas devem ser configurados por ambiente; chaves
pessoais/administrativas nunca entram no browser nem no repositório.

### 7. Sem autocapture neste sprint

`autocapture` fica desabilitado. Eventos e propriedades são explícitos para reduzir ruído, custo e
risco de coletar texto, URL ou valores de formulário. Pageviews genéricos não substituem
`catalog_viewed`. Heatmaps serão avaliados em outro sprint.

### 8. Base legal e consentimento por canal

Captura no browser e Session Replay só iniciam após consentimento válido no ambiente de produção. A
interface deve oferecer aceitar, rejeitar e alterar a escolha posteriormente. A rejeição não pode
impedir o uso da aplicação.

Eventos server-side não conseguem inferir a escolha guardada apenas no navegador, especialmente em
webhooks Stripe. Eles permanecem desabilitados em produção até o responsável por produto/privacidade
aprovar e documentar uma base legal, finalidade, retenção e mecanismo de oposição. Há dois caminhos:

1. **legítimo interesse aprovado:** registrar a avaliação correspondente e disponibilizar oposição;
   eventos server-side mínimos podem ser capturados independentemente do consentimento do browser;
2. **consentimento:** persistir a decisão por usuário/loja no servidor e consultá-la antes de cada
   captura server-side, inclusive em webhooks. Uma preferência apenas em cookie/localStorage não
   satisfaz este caminho.

O caminho escolhido deve ser registrado neste documento antes da implementação das tarefas 06 e 07.
Até lá, o adaptador server-side opera em noop em produção. Esta é uma decisão de engenharia
conservadora, não parecer jurídico. A política final, prazos de retenção e textos devem ser aprovados
pelo responsável do produto.

## Ferramentas escolhidas

| Ferramenta | Papel neste sprint | Decisão |
| --- | --- | --- |
| PostHog Cloud | eventos, pessoas, grupos, funil, dashboard e replay | Adotado |
| `posthog-js` | captura anônima/identificada no browser e replay | Adotado |
| `posthog-node` | eventos de resultado confirmados no servidor | Adotado |
| `instrumentation-client.ts` | inicialização compatível com Next.js App Router | Adotado |
| PostgreSQL atual | métricas do lojista | Mantido, sem migração |
| Sentry/OpenTelemetry | erros, traces e telemetria técnica | Adiado |

Fixar versões exatas no lockfile usando Bun. Antes de implementar, confirmar a API da versão instalada
na documentação oficial; não copiar configuração de tutoriais antigos.

## Configuração esperada

Variáveis previstas:

| Variável | Exposição | Uso |
| --- | --- | --- |
| `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` | browser | token do projeto do ambiente |
| `NEXT_PUBLIC_POSTHOG_HOST` | browser | host regional de ingestão |
| `POSTHOG_PROJECT_TOKEN` | servidor | token de ingestão do mesmo projeto |
| `POSTHOG_HOST` | servidor | host regional de ingestão |
| `NEXT_PUBLIC_APP_ENV` | browser | `development`, `staging` ou `production` |
| `APP_RELEASE` | servidor/build | SHA ou versão do deploy |

Os nomes finais devem respeitar as limitações do deploy atual. O parser de ambiente deve aceitar o
PostHog como opcional localmente e validar o conjunto completo quando habilitado. Nunca inserir valores
reais em `.env.example` ou `.env.vercel.example`.

## Convenções

### Eventos

- nomes em `snake_case`, no passado para resultados e com intenção explícita para início;
- nomes são estáveis; mudança de significado exige novo evento ou nova `schema_version`;
- um evento representa uma única ação reconhecível;
- eventos de sucesso só são emitidos depois da persistência;
- tentativas e erros não usam o mesmo nome do sucesso;
- reenvio do Stripe deve ser idempotente usando o ID do evento recebido;
- preview do admin nunca gera métricas de visitante.

### Propriedades comuns

Todo evento deve receber automaticamente, quando aplicável:

```ts
{
  schema_version: 1,
  environment: "development" | "staging" | "production",
  release: string | null,
  surface: "admin" | "storefront" | "billing" | "auth",
  source: string,
  store_id?: string,
  plan?: "FREE" | "ESSENTIAL" | "PROFESSIONAL"
}
```

Não repetir `user_id` nas propriedades: a identidade da pessoa já é o `distinct_id`. IDs internos de
produto podem ser enviados quando necessários ao diagnóstico, mas nomes, descrições e imagens não.
`plan` sempre significa o plano efetivo calculado por `getEntitlements`, nunca `StoreDTO.signupPlan`.

### Valores controlados

Usar enums/uniões para propriedades de baixa cardinalidade. Não enviar objetos livres, listas de IDs,
stack traces, URLs completas nem payloads de API. `source` e `surface` têm vocabulário fechado no
contrato.

Vocabulário inicial de `source`:

| Valor | Origem |
| --- | --- |
| `better_auth` | criação de conta confirmada pelo Better Auth |
| `onboarding` | criação e primeira publicação da loja |
| `product_form` | abertura explícita do formulário de produto |
| `catalog_service` | criação ou arquivamento confirmado no serviço de catálogo |
| `storefront` | interação na vitrine pública real |
| `stripe_webhook` | transição de assinatura confirmada pelo webhook Stripe |

O contrato recebe objetos em `camelCase`, valida-os com schemas estritos e envia propriedades em
`snake_case`. Planos reutilizam `billingPlanSchema` e `paidBillingPlanSchema`; não existe uma segunda
enumeração de planos na observabilidade. Propriedades opcionais ausentes são omitidas, enquanto
`release` ausente é normalizado para `null`.

### Catálogo de eventos do Sprint 1

| Evento | Origem confiável | Propriedades específicas mínimas |
| --- | --- | --- |
| `account_created` | criação concluída pelo Better Auth | `signup_plan`, `source` |
| `store_created` | `createStore`/`saveIdentity` após persistência | `store_id`, `plan`, `source` |
| `store_published` | transação que conclui onboarding e ativa a loja | `store_id`, `plan`, `product_count` |
| `product_creation_started` | abertura do formulário de novo produto | `store_id`, `source` |
| `product_created` | `saveProduct` após commit | `store_id`, `product_id`, `creation_method`, `is_first_product` |
| `product_deleted` | arquivamento concluído | `store_id`, `product_count`, `operation` |
| `catalog_viewed` | montagem da vitrine pública real | `store_id`, `plan`, `source` |
| `product_viewed` | abertura do detalhe público | `store_id`, `product_id`, `source` |
| `whatsapp_clicked` | imediatamente antes de abrir WhatsApp | `store_id`, `location`, `product_id?`, `cart_size?` |
| `subscription_started` | webhook Stripe após transição válida | `store_id`, `plan`, `billing_status` |
| `subscription_cancelled` | webhook/portal após cancelamento confirmado | `store_id`, `plan`, `effective_immediately` |

`store_published` ocorre uma vez, quando a primeira criação de produto transforma a loja de `DRAFT`
em `ACTIVE`. Editar produtos ou republicar produtos não repete o evento.

`whatsapp_clicked.location` aceita apenas `store_hero`, `product_card`, `product_detail` e `cart`.
Nunca enviar número, mensagem, nome do produto ou conteúdo do carrinho.

## Activation Funnel

A jornada atravessa duas identidades: o lojista cria/configura a loja, enquanto um visitante anônimo
abre a vitrine e clica no WhatsApp. PostHog associa grupos a eventos, não retroativamente às pessoas.
Por isso, um único funil por pessoa ou por loja começando em `account_created` produziria números
incorretos. O sprint cria dois insights complementares.

### 1. Merchant Onboarding Funnel — Sprint 1

Agregação: pessoa identificada (`user.id`). Todos os eventos server-side deste trecho devem receber o
`distinct_id` do lojista responsável.

1. `account_created`;
2. `store_created`;
3. `product_created` com `is_first_product = true`;
4. `store_published`.

### 2. Store Activation Funnel — Sprint 1

Este é o **Activation Funnel** principal. Agregação: grupo `store`. Group Analytics é dependência do
funil padrão, pois um breakdown/filtro por `store_id` não muda a unidade de agregação de pessoa.

1. `store_created`;
2. `product_created` com `is_first_product = true`;
3. `store_published`;
4. `catalog_viewed`;
5. `whatsapp_clicked`.

Configuração inicial dos dois insights:

- janela de conversão: 14 dias;
- ambiente: produção;
- visualizar conversão geral e relativa ao passo anterior;
- breakdowns salvos: `plan`, `source` e `whatsapp_clicked.location` quando aplicável;
- não exigir `subscription_started` para considerar ativação;
- documentar data de criação, proprietário e link de cada insight.

Se Group Analytics não estiver disponível, não criar um funil padrão e chamá-lo de funil de loja.
Criar um insight HogQL que agregue explicitamente cada passo por `store_id`, documentar a consulta e
validá-la contra uma coorte conhecida. Se isso não for viável no plano contratado, o Store Activation
Funnel fica bloqueado; tendências separadas por `store_id` podem ser exibidas, mas não substituem a
conversão sequencial.

A sequência preserva `product_created` e `store_published` como passos distintos porque o primeiro
mede criação de valor e o segundo confirma a mudança de estado da loja. Eles podem ter timestamps
próximos, mas significados diferentes. O dashboard pode apresentar os dois funis lado a lado, mas não
deve uni-los artificialmente.

## Product Health Dashboard

Nome: **Product Health — Sprint 1**. Período padrão: últimos 30 dias, com filtro de produção.

Cartões mínimos:

1. contas criadas — total e usuários únicos;
2. lojas criadas — total de grupos únicos;
3. lojas publicadas — total e taxa sobre lojas criadas;
4. primeiros produtos criados — `product_created` com `is_first_product = true`;
5. lojas ativas em 7 dias — lojas com pelo menos um dos eventos `store_created`,
   `product_creation_started`, `product_created`, `product_deleted`, `store_published`,
   `catalog_viewed`, `product_viewed`, `whatsapp_clicked`, `subscription_started` ou
   `subscription_cancelled` nos últimos 7 dias, agregadas por grupo `store` ou consulta HogQL por
   `store_id`;
6. visualizações de catálogo — total e lojas únicas;
7. visualizações de produto — total e taxa por `catalog_viewed`;
8. cliques no WhatsApp — total, lojas únicas e taxa por `catalog_viewed`;
9. assinaturas iniciadas e canceladas — tendência por plano;
10. conversão dos funis de onboarding do lojista e ativação da loja.

Cada cartão deve ter descrição de negócio, evento/filtro, agregação, janela e limitações. Não chamar
um número de “lojas ativas” sem declarar a definição acima.

## Session Replay e privacidade

Configuração inicial: **mask first**.

- mascarar todos os inputs, inclusive busca, telefone, e-mail, senha e textarea;
- mascarar texto por padrão e liberar seletivamente apenas conteúdo comprovadamente público/seguro;
- aplicar `ph-no-capture` a autenticação, cobrança, suporte, feedback, dados de conta e qualquer bloco
  com informações pessoais ou conteúdo livre;
- remover query string e fragmento das URLs capturadas; tokens e `session_id` nunca aparecem;
- não gravar headers, bodies de requisição/resposta, console ou canvas neste sprint;
- não gravar páginas de preview;
- iniciar replay somente após consentimento de analytics;
- restringir acesso aos replays ao menor número de pessoas;
- definir retenção mínima necessária no PostHog e revisar após 30 dias;
- executar auditoria manual em cadastro, login, onboarding, produtos, configurações, suporte, billing,
  vitrine e carrinho antes de produção.

Critério de bloqueio: qualquer e-mail, senha, telefone, endereço, nome pessoal, mensagem, token,
conteúdo de suporte ou dado de cobrança visível no replay impede o rollout.

## Privacidade, segurança e LGPD

- registrar finalidade: melhorar ativação, usabilidade e confiabilidade do produto;
- coletar somente propriedades listadas no contrato;
- não enviar dados pessoais diretos ao PostHog;
- tratar IDs internos, IP e identificadores de dispositivo como dados potencialmente pessoais;
- disponibilizar escolha clara para aceitar/rejeitar analytics e revogar depois;
- manter captura client-side/replay desativada antes da escolha;
- manter captura server-side desativada em produção até a base legal ser aprovada e implementada;
- documentar operador, região, retenção, acesso, exclusão e atendimento aos direitos do titular na
  política de privacidade;
- criar procedimento para exclusão/anonimização de pessoa no PostHog quando aplicável;
- não usar telemetria para decisões automatizadas, publicidade ou perfilamento neste sprint;
- não habilitar captura de rede, console ou autocapture por conveniência.

A referência regulatória é o Guia Orientativo de Cookies e Proteção de Dados Pessoais da ANPD. A
aprovação de texto e hipótese legal é uma dependência do produto/jurídico, não uma conclusão técnica.

## Critérios de sucesso

### Técnicos

- zero import de SDK fora dos adaptadores/bootstrap autorizados;
- todos os 11 eventos tipados, documentados e com testes de propriedades proibidas;
- eventos de servidor não quebram a operação quando o PostHog está indisponível;
- eventos do Stripe não duplicam em reentrega do mesmo webhook;
- produção, staging e desenvolvimento podem ser filtrados sem ambiguidade;
- logout reseta a identidade; troca de loja atualiza o grupo;
- preview e testes automatizados não poluem produção;
- lint, TypeScript, testes relacionados e build passam.

### Produto

- um fluxo canônico aparece nos dois funis complementares, cobrindo da conta ao WhatsApp sem misturar
  identidades;
- o dashboard contém todos os cartões definidos e possui descrições;
- é possível filtrar por plano, origem e loja;
- um replay consentido pode ser aberto a partir de uma sessão relevante;
- nenhum dado listado como proibido é encontrado na auditoria de eventos ou replay.

### Operacionais

- links do projeto, funnel e dashboard são registrados na tarefa correspondente sem incluir segredo;
- responsável pelo acesso e retenção está definido;
- existe checklist de validação por ambiente e procedimento simples de desligamento;
- custos/volume são revisados após a primeira semana e após 30 dias.

## Riscos e mitigação

| Risco | Impacto | Mitigação |
| --- | --- | --- |
| Vazamento de dados em replay | Alto | consentimento, máscara máxima, `ph-no-capture`, auditoria bloqueante |
| Eventos duplicados | Alto | origem de sucesso no servidor, idempotência Stripe, testes de reentrega |
| Identidades misturadas | Alto | `identify` com UUID interno, `reset` no logout, teste de troca de conta/loja |
| Preferência só no browser não alcançar webhook | Alto | base legal separada ou consentimento persistido e consultado no servidor |
| Dados de teste em produção | Médio | projetos separados ou `environment` obrigatório, SDK noop em testes |
| Métricas inconsistentes com PostgreSQL | Médio | responsabilidades distintas e definições explícitas; não prometer igualdade 1:1 |
| Alto custo/volume | Médio | sem autocapture, perfis só identificados, propriedades mínimas, revisão de volume |
| Evento disparado antes do sucesso | Médio | eventos de resultado no servidor após persistência |
| SDK bloquear UX | Médio | captura best-effort, timeout/flush apropriado, nenhuma dependência funcional |
| Dashboard sem governança | Baixo | nomes, descrições, owner, filtros e definição de cada métrica |
| Mudança de API do SDK | Médio | versões fixadas e conferência na documentação oficial da versão instalada |

## Dependências

- acesso administrativo a uma conta/projeto PostHog;
- escolha da região do projeto e ambientes;
- variáveis configuradas em desenvolvimento, staging e produção;
- permissão para criar insights e dashboards;
- decisão de produto/privacidade sobre base legal do browser e do servidor, política e retenção;
- release/SHA disponível no deploy, ou decisão documentada de deixar `release = null` inicialmente;
- Group Analytics disponível ou consulta HogQL por `store_id` implementada e validada.

Nenhuma dessas dependências autoriza inserir segredos no repositório.

## Ordem de execução

| Ordem | Tarefa | Depende de | Status |
| --- | --- | --- | --- |
| 01 | [Instalar e configurar o PostHog](./tasks/01-posthog-installation-and-configuration.md) | — | Implementada; smoke test externo pendente |
| 02 | [Criar contrato e wrapper de analytics](./tasks/02-analytics-contract-and-wrapper.md) | 01 | Implementada |
| 03 | [Identificar o usuário autenticado](./tasks/03-user-identification.md) | 02 | Pendente |
| 04 | [Identificar e agrupar por loja](./tasks/04-store-identification.md) | 02, 03 | Pendente |
| 05 | [Implementar consentimento e política do servidor](./tasks/05-consent-and-server-privacy-policy.md) | 01–04 | Pendente |
| 06 | [Instrumentar eventos do lojista](./tasks/06-merchant-lifecycle-events.md) | 02–05 | Pendente |
| 07 | [Instrumentar vitrine, WhatsApp e billing](./tasks/07-storefront-whatsapp-and-billing-events.md) | 02–05 | Pendente |
| 08 | [Habilitar replay e privacy masking](./tasks/08-session-replay-and-privacy-masking.md) | 01–05 | Pendente |
| 09 | [Criar Activation Funnel](./tasks/09-activation-funnel.md) | 06, 07 | Pendente |
| 10 | [Criar Product Health Dashboard](./tasks/10-product-health-dashboard.md) | 06, 07, 09 | Pendente |
| 11 | [Validar e liberar o rollout](./tasks/11-validation-and-rollout.md) | 01–10 | Pendente |

Tarefas 06 e 07 só começam após a decisão da tarefa 05 estar registrada. Tarefas 09 e 10 só começam
depois de os eventos aparecerem no projeto de desenvolvimento/staging com propriedades corretas. A
produção só é habilitada após concluir a tarefa 11.

## Definição de pronto do sprint

O sprint está pronto somente quando:

- todas as tarefas estão marcadas como concluídas e seus critérios de aceite têm evidência;
- o catálogo de eventos implementado corresponde a este documento;
- testes e build passam;
- o revisor independente não possui achados bloqueantes;
- auditoria de privacidade não encontra dados proibidos;
- funil e dashboard estão criados e validados com um fluxo canônico;
- consentimento, política, retenção e acesso foram decididos para produção;
- documentação foi atualizada com decisões finais e links não sensíveis.

## Referências

- [PostHog — Next.js](https://posthog.com/docs/libraries/next-js)
- [PostHog — identificação de usuários](https://posthog.com/docs/product-analytics/identify)
- [PostHog — Group Analytics](https://posthog.com/docs/product-analytics/group-analytics)
- [PostHog — privacidade em Session Replay](https://posthog.com/docs/session-replay/privacy)
- [PostHog — funnels](https://posthog.com/docs/product-analytics/funnels)
- [PostHog — dashboards](https://posthog.com/docs/product-analytics/dashboards)
- [ANPD — Guia Orientativo Cookies e Proteção de Dados Pessoais](https://www.gov.br/anpd/pt-br/centrais-de-conteudo/materiais-educativos-e-publicacoes/guia_orientativo_cookies_e_protecao_de_dados_pessoais)

## Registro de decisões

| Data | Decisão | Motivo |
| --- | --- | --- |
| 2026-10-29 | PostHog separado de `modules/analytics` | preservar a fonte de métricas do lojista |
| 2026-10-29 | sem autocapture/heatmap no Sprint 1 | minimizar ruído, custo e exposição de dados |
| 2026-10-29 | resultado no servidor; interação no browser | confiabilidade sem perder contexto de UX |
| 2026-10-29 | IDs internos, sem PII direta | minimização e correlação estável |
| 2026-10-29 | replay com máscara máxima e consentimento | rollout conservador para dados não essenciais |
| 2026-10-30 | browser expõe 4 eventos de interação e servidor 7 eventos de resultado | preservar a origem confiável de cada evento |
| 2026-10-30 | `source` é derivado pelo contrato, não recebido do chamador | impedir valores livres e divergentes |
| 2026-10-30 | schemas de billing são a fonte dos nomes de plano | evitar enumeração duplicada |
