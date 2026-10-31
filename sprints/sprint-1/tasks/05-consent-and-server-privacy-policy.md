# 05 — Implementar consentimento e política de privacidade do servidor

## Objetivo

Garantir controle do titular no browser e definir, antes dos eventos de negócio, quando a telemetria
server-side pode operar em produção.

## Contexto

Cookies/identificadores analíticos e replay não são necessários ao funcionamento principal. A ANPD
recomenda transparência, opção de rejeitar não necessários e controle granular. Um webhook Stripe não
enxerga a preferência guardada apenas no navegador; portanto, cliente e servidor exigem mecanismos e
decisões explícitos.

## Implementação esperada

- registrar a base legal aprovada para eventos server-side e manter o adaptador desabilitado em
  produção até essa decisão;
- se a base server-side for consentimento, persistir a escolha vinculada ao usuário/loja em fonte
  consultável pelo servidor e aplicá-la também a webhooks; cookie/localStorage sozinho é insuficiente;
- se a base aprovada for legítimo interesse, registrar avaliação, finalidade, minimização, retenção e
  mecanismo de oposição, implementando o opt-out também no servidor;
- criar estado de consentimento do browser versionado com `unknown`, `accepted` e `rejected`;
- exibir o aviso flutuante no rodapé com “Eu concordo” e link para detalhes; sem concordância,
  manter a captura desligada e permitir continuar usando o produto;
- não inicializar captura client-side persistente antes de `accepted`;
- permitir revisar/revogar a escolha em local acessível;
- ao revogar, parar captura, resetar identidade e remover persistência PostHog aplicável;
- atualizar política de privacidade/cookies com fornecedor, finalidade, categorias e retenção;
- definir processo de exclusão/anonimização e acesso no PostHog.

## Arquivos/áreas afetadas

- componente/provider de consentimento (novo)
- `app/layout.tsx`
- `instrumentation-client.ts`
- módulo de observability
- página/política de privacidade e cookies, se ainda inexistente
- contrato/API/schema de preferência server-side, somente se o caminho aprovado exigir persistência
- testes unitários e E2E de consentimento

## Critérios de aceite

- [x] estado desconhecido e rejeitado não enviam eventos client-side;
- [x] aceitar inicia captura sem reload obrigatório;
- [x] continuar sem concordar não degrada funcionalidades do produto;
- [x] revogação interrompe captura e limpa identidade/persistência aplicável;
- [x] preferência é versionada e pode ser solicitada novamente após mudança material;
- [x] eventos server-side estão desabilitados ou obedecem à base legal e ao mecanismo de oposição
  aprovado, inclusive em webhooks;
- [ ] política e responsável por retenção/acesso estão registrados;
- [x] auditoria de produto/privacidade foi concluída ou produção permanece desabilitada.

## Validação

- E2E para aceitar, continuar sem concordar, persistir escolha e revogar;
- inspecionar storage/cookies e requests de rede em cada estado;
- validar a política server-side com operação administrativa e webhook, inclusive após oposição;
- testar indisponibilidade da fonte de preferência, quando houver, com comportamento fail-closed para
  analytics e sem bloquear o produto;
- revisar permissões de membros do projeto PostHog;
- lint, typecheck, testes e build.

## Observações

Não alegar “conformidade LGPD” apenas por concluir esta tarefa. A implementação é um controle técnico;
a base legal, os textos e o processo de atendimento ao titular exigem validação responsável.

## Decisão registrada em 30/10/2026

O responsável pela demanda confirmou que ainda não há base legal aprovada para a telemetria de
produto enviada pelo servidor em produção. O adaptador continua em `noop` nesse ambiente, inclusive
para webhooks Stripe. Nenhuma preferência local do navegador será tratada como autorização do
servidor. A seleção e aprovação da hipótese legal, da retenção, do responsável pelo acesso e do
mecanismo de oposição continuam pendentes. A captura server-side em produção não será habilitada
nem descrita como autorizada nesta tarefa.

## Procedimento operacional pendente de aprovação

- **Acesso:** limitar o projeto e os replays a pessoas designadas pelo responsável do produto;
  registrar quem possui acesso e revisar as permissões antes do rollout. A pessoa responsável por
  retenção e solicitações do titular ainda não foi designada nesta tarefa.
- **Retenção:** definir e registrar prazo por categoria de dado no projeto PostHog antes de ativar a
  produção. Nenhum prazo foi aprovado; não assumir o padrão do plano contratado como decisão de
  produto.
- **Exclusão/anonimização:** após verificar uma solicitação pelos canais oficiais do produto, uma
  pessoa autorizada localiza o perfil pelo `user.id` interno, solicita exclusão dos eventos e, quando
  houver replay, também das gravações; registra o pedido, a confirmação e a conclusão assíncrona sem
  copiar dados pessoais para tickets ou logs. Eventos anônimos de loja exigem avaliação específica,
  pois `store_id` não identifica por si só uma pessoa. A operação deve seguir a
  [documentação de exclusão de pessoas do PostHog](https://posthog.com/docs/data/persons).
- **Auditoria:** inspecionar eventos, armazenamento/cookies e permissões do projeto não produtivo.
  A auditoria de privacidade de produção permanece bloqueante na tarefa 11.

## Evidências de implementação

- A preferência local versionada controla a inicialização do SDK, o aceite e a revogação. O aviso
  flutuante no rodapé, as preferências e a página `/privacidade/cookies` permitem rever a
  escolha sem ocupar o slug público `/privacidade` de uma loja.
- O SDK usa persistência em memória e não captura automaticamente. A revogação impede novas
  capturas e limpa identidade e armazenamento aplicável. O adaptador bloqueia retries antigos após
  revogação e novo aceite; como o PostHog não oferece cancelamento público de retries, esse guard
  depende da estrutura do SDK instalado e precisa ser revalidado em upgrades. Uma requisição já
  iniciada pode terminar depois da revogação.
- Testes unitários cobrem estado, falhas de armazenamento/SDK, troca de identidade e kill switch.
  Playwright cobre os dois viewports, storage/cookies, rede interceptada, falha HTTP 503 e retries,
  navegação do painel e colisão do slug. Lint, typecheck, 135 testes e build passaram com Bun 1.3.14.
- A revisão das permissões reais do projeto PostHog, o prazo de retenção e a designação do
  responsável ainda precisam de evidência antes da ativação em produção.
