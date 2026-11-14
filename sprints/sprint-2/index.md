# Sprint 2 — Operação da plataforma com Super Admin

> **Documento mestre do sprint.** Leia este arquivo antes de implementar ou revisar qualquer tarefa
> do Super Admin. Em caso de divergência, este documento prevalece sobre os arquivos de tarefa;
> decisões novas devem ser registradas aqui antes de alterar a implementação.

## Estado do sprint

- **Status:** implementação iniciada; tarefa 01 concluída.
- **Tema:** operação segura de lojas, assinaturas e solicitações de suporte.
- **Produto:** Tua Vitrine.
- **Público:** equipe interna da Tua Vitrine com permissão explícita de administrador da plataforma.
- **Referência de implementação:** tarefas numeradas em [`tasks/`](./tasks/).
- **Fora deste sprint:** CRM, help desk completo, BI, impersonação e edição do catálogo do lojista.

## Como recuperar o contexto

Ao retomar o trabalho:

1. leia este documento por inteiro;
2. confira a seção **Ordem de execução** e o status de cada tarefa;
3. leia a tarefa escolhida e suas dependências;
4. confira `git status`, `AGENTS.md` e a implementação atual antes de editar;
5. registre neste documento qualquer mudança de escopo ou decisão arquitetural.

## Contexto e problema

O Tua Vitrine já possui lojas reais, autenticação, planos e cobrança pela Stripe, mas a operação da
plataforma ainda depende de consultas diretas ao banco, ao painel da Stripe e aos e-mails recebidos.
Não existe uma visão interna que permita localizar uma loja, entender seu estado, diagnosticar uma
divergência de assinatura ou executar uma ação operacional controlada.

O suporte também depende apenas do envio de e-mail. Se a entrega falhar, a solicitação pode ser
perdida; se chegar, ela não fica relacionada a um histórico operacional da loja dentro do produto.

Este sprint cria um Super Admin pequeno e orientado à operação. O objetivo não é construir uma
plataforma administrativa genérica, mas dar à equipe interna as informações e ações necessárias para
atender lojistas com segurança.

## Objetivo

Ao final do sprint, um administrador da plataforma deve conseguir:

- entrar em uma área interna protegida por uma permissão específica;
- localizar lojas por dados operacionais relevantes;
- consultar identidade, estado, catálogo e assinatura de uma loja;
- diagnosticar divergências entre o banco e a Stripe;
- consultar e tratar solicitações de suporte sem depender somente da caixa de e-mail;
- executar poucas ações operacionais, sempre com motivo obrigatório;
- consultar um histórico imutável das ações administrativas.

## Escopo

### Incluído

- autorização explícita para administradores da plataforma;
- área interna separada do painel do lojista;
- busca e listagem de lojas;
- detalhe operacional de uma loja;
- leitura de dados locais de cobrança e atalhos seguros para a Stripe;
- reconciliação manual da assinatura com a Stripe;
- persistência das solicitações de suporte antes da tentativa de envio do e-mail;
- fluxo simples de suporte com estados, nota interna e resposta por e-mail externo;
- bloqueio/reativação e publicação/despublicação operacional de loja;
- reenvio de confirmação de e-mail e encerramento de trial, quando aplicável;
- concessão manual temporária de plano, com validade e justificativa;
- trilha de auditoria das ações administrativas;
- testes de autorização, isolamento e operações críticas.

### Não incluído

- resposta ao suporte dentro da plataforma ou conversa em tempo real;
- anexos, SLA, prioridade, filas, responsáveis ou automações de atendimento;
- notificações de ticket dentro do painel do lojista;
- impersonação ou acesso à sessão do lojista;
- edição de produtos, campanhas, identidade visual ou dados pessoais do lojista;
- exclusão definitiva de lojas;
- reembolsos ou alterações arbitrárias de cobrança fora da Stripe;
- dashboard amplo de métricas, receita ou crescimento;
- papéis administrativos configuráveis por uma interface;
- exportação em massa de dados.

## Decisões arquiteturais

### 1. Administrador da plataforma é uma autorização separada

O acesso não deve ser inferido de `StoreMember`, plano, e-mail ou domínio. Deve existir uma permissão
explícita de plataforma, concedida diretamente por operação controlada no banco ou por script interno.
Não haverá tela pública para promover usuários.

A implementação pode usar uma tabela dedicada ou um papel equivalente no modelo de autenticação,
desde que:

- não seja editável pelo próprio usuário;
- seja verificado no servidor em todas as páginas, consultas e mutações;
- não conceda automaticamente associação a nenhuma loja;
- permita revogação imediata;
- mantenha o caminho para autenticação reforçada e 2FA em evolução posterior.

### 2. O Super Admin é separado do painel do lojista

A área interna deve usar uma rota própria e um layout identificável. Ela não reutiliza
`getAdminContext()`, pois esse contexto exige que o usuário pertença à loja atual. Serviços internos
recebem uma identidade de administrador da plataforma e aceitam o identificador da loja somente após
a autorização global ser validada.

O menu do lojista não deve exibir o acesso para usuários comuns. Um administrador autorizado pode
receber um acesso discreto, sem tornar a existência da área parte do fluxo normal do produto.

### 3. Leitura agregada, escrita pequena e explícita

A página da loja agrega dados de conta, associação, catálogo, assinatura, suporte e eventos
operacionais. Essa leitura não deve alterar o estado da loja nem consultar serviços externos
automaticamente a cada renderização.

Cada ação de escrita terá endpoint e service próprios, validação Zod, confirmação na interface e
motivo obrigatório. Não haverá endpoint genérico para alterar campos arbitrários.

### 4. Stripe continua sendo a fonte da cobrança

O Super Admin exibe o estado persistido localmente e identifica quando a última sincronização pode
estar divergente. A ação **Reconciliar assinatura** consulta a Stripe e reaplica a mesma regra de
sincronização usada pelos webhooks.

Reembolso, troca manual da assinatura e edição de pagamentos continuam no Dashboard da Stripe. O
painel fornece links para o cliente e a assinatura quando existirem.

### 5. Suporte é registro interno com notificação por e-mail

O envio atual deve passar a seguir esta ordem:

1. validar a solicitação e identificar loja e usuário;
2. persistir a solicitação com estado `NEW`;
3. tentar enviar a notificação para o endereço de suporte;
4. registrar sucesso ou falha da notificação sem apagar a solicitação;
5. retornar sucesso ao lojista quando o registro tiver sido salvo.

O e-mail avisa a equipe; o banco preserva o histórico. O Super Admin permite consultar a solicitação,
marcá-la como `IN_PROGRESS` ou `RESOLVED`, escrever uma nota interna curta e abrir o cliente de e-mail
para responder ao endereço do lojista. Não haverá thread de respostas dentro do sistema neste sprint.

### 6. Ações administrativas exigem motivo e auditoria

Toda ação que altere loja, plano, trial, autenticação ou suporte deve registrar:

- administrador responsável;
- loja e recurso afetados;
- ação executada;
- estado anterior e novo estado, com dados mínimos;
- motivo informado;
- data e hora;
- resultado da operação.

Registros de auditoria não podem ser editados nem excluídos pelo Super Admin. Não registrar segredos,
mensagens completas de suporte, tokens ou dados de pagamento.

### 7. Concessão manual de plano é temporária

Uma cortesia ou correção operacional não deve fingir que existe uma assinatura Stripe. A concessão
manual deve ter plano, motivo, data de expiração e administrador responsável. A resolução das
permissões considera a assinatura, o trial e a concessão manual de forma explícita e testável.

Quando a concessão expirar, a loja volta automaticamente ao plano aplicável pelas regras normais. O
Super Admin não cria cobrança nem modifica a assinatura remota.

### 8. Bloqueio operacional não apaga dados

Bloquear uma loja impede o uso administrativo pelo lojista sem remover conta, catálogo, assinatura ou
histórico. Despublicar a vitrine é uma ação separada, para que suporte e segurança possam tratar cada
situação de forma proporcional. Reativação e republicação também exigem motivo e auditoria.

## Experiência inicial

### Lojas

A entrada do Super Admin é uma busca operacional. Deve aceitar, no mínimo:

- nome ou slug da loja;
- e-mail do lojista;
- ID da loja;
- ID de cliente ou assinatura da Stripe.

A lista mostra somente o necessário para escolher o resultado correto: loja, slug, proprietário,
plano efetivo, estado operacional e data de criação. Busca, paginação e filtros ficam na URL.

### Detalhe da loja

O detalhe reúne:

- loja e proprietário;
- URL pública e estado de publicação/bloqueio;
- criação, onboarding e atividade disponível;
- quantidade de produtos publicados, arquivados e totais;
- plano efetivo e origem do acesso: Free, trial, Stripe ou concessão manual;
- status, datas e identificadores da assinatura;
- solicitações recentes de suporte;
- ações controladas e histórico recente de auditoria.

### Solicitações de suporte

Uma lista simples mostra estado, categoria, assunto, loja, solicitante, data e resultado da notificação
por e-mail. A visualização do chamado oferece contexto da loja, mensagem completa, nota interna,
mudança de estado e atalho para responder por e-mail.

### Auditoria

A lista de auditoria permite filtrar por loja, administrador, ação e período. Ela serve para responder
quem alterou o quê, quando e por qual motivo; não é uma solução de observabilidade geral.

## Ordem de execução

| Ordem | Tarefa | Dependências | Status |
| --- | --- | --- | --- |
| 01 | [Acesso e segurança do Super Admin](./tasks/01-super-admin-access-and-security.md) | — | Concluída |
| 02 | [Busca e listagem de lojas](./tasks/02-store-search-and-list.md) | 01 | Pendente |
| 03 | [Detalhe operacional da loja](./tasks/03-store-operational-detail.md) | 01, 02 | Pendente |
| 04 | [Cobrança e reconciliação](./tasks/04-billing-diagnostics-and-reconciliation.md) | 01, 03 | Pendente |
| 05 | [Suporte persistido e caixa operacional](./tasks/05-persisted-support-workflow.md) | 01, 03 | Pendente |
| 06 | [Ações operacionais controladas](./tasks/06-controlled-operational-actions.md) | 01, 03, 04 | Pendente |
| 07 | [Trilha de auditoria](./tasks/07-admin-audit-log.md) | 01; integrada a 04–06 | Pendente |
| 08 | [Validação, segurança e rollout](./tasks/08-validation-security-and-rollout.md) | 01–07 | Pendente |

As tarefas 04 e 05 podem avançar em paralelo depois da tarefa 03. A estrutura de auditoria da tarefa
07 deve ser definida antes de concluir qualquer mutação das tarefas 04 a 06, mesmo que sua interface
seja entregue depois.

## Definição de pronto do sprint

- somente administradores autorizados acessam rotas e APIs internas;
- um usuário comum não consegue inferir dados de outra loja por URL ou chamada direta;
- a equipe localiza uma loja e entende seu estado sem consultar o banco manualmente;
- divergências de assinatura podem ser diagnosticadas e reconciliadas sem editar registros à mão;
- solicitações de suporte persistem mesmo quando o envio do e-mail falha;
- todas as mutações administrativas exigem motivo e deixam auditoria consultável;
- operações destrutivas e recursos fora de escopo não aparecem na interface nem nas APIs;
- lint, typecheck, testes relacionados, suíte completa e build passam;
- o rollout começa por ambiente de teste/staging com ao menos um administrador autorizado;
- documentação operacional explica concessão, revogação e resposta a incidentes de acesso.

## Riscos e cuidados

- **Acesso excessivo:** autorização deve ser server-side e coberta por testes negativos.
- **Dados sensíveis:** mostrar apenas dados necessários; não expor senha, tokens ou pagamento.
- **Divergência de cobrança:** reutilizar a regra central de sincronização, sem duplicá-la na UI.
- **Ação acidental:** confirmação, motivo obrigatório, idempotência quando aplicável e auditoria.
- **Escopo crescente:** novas ideias entram em outro sprint se não forem necessárias para localizar,
  diagnosticar ou atender uma loja.
