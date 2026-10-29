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
- exibir escolhas equivalentes de aceitar e rejeitar e link para detalhes;
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

- [ ] estado desconhecido e rejeitado não enviam eventos client-side;
- [ ] aceitar inicia captura sem reload obrigatório;
- [ ] rejeitar não degrada funcionalidades do produto;
- [ ] revogação interrompe captura e limpa identidade/persistência aplicável;
- [ ] preferência é versionada e pode ser solicitada novamente após mudança material;
- [ ] eventos server-side estão desabilitados ou obedecem à base legal e ao mecanismo de oposição
  aprovado, inclusive em webhooks;
- [ ] política e responsável por retenção/acesso estão registrados;
- [ ] auditoria de produto/privacidade foi concluída ou produção permanece desabilitada.

## Validação

- E2E para aceitar, rejeitar, persistir escolha e revogar;
- inspecionar storage/cookies e requests de rede em cada estado;
- validar a política server-side com operação administrativa e webhook, inclusive após oposição;
- testar indisponibilidade da fonte de preferência, quando houver, com comportamento fail-closed para
  analytics e sem bloquear o produto;
- revisar permissões de membros do projeto PostHog;
- lint, typecheck, testes e build.

## Observações

Não alegar “conformidade LGPD” apenas por concluir esta tarefa. A implementação é um controle técnico;
a base legal, os textos e o processo de atendimento ao titular exigem validação responsável.
