# 07 — Habilitar Session Replay

## Objetivo

Disponibilizar replay de sessões para diagnóstico de UX, inicialmente fora de produção e com
configuração de privacidade máxima.

## Contexto

Replay reconstrói a interface e pode revelar dados sensíveis mesmo sem eventos customizados. Esta
tarefa habilita a capacidade técnica; consentimento, marcações e auditoria bloqueante são concluídos
na tarefa 08 antes do rollout.

## Implementação esperada

- habilitar replay no projeto PostHog não produtivo;
- iniciar gravação somente quando analytics estiver autorizado;
- configurar `maskAllInputs: true` e mascaramento de texto por padrão;
- desabilitar captura de console, rede, bodies, headers e canvas;
- remover query string e fragmentos das URLs de replay;
- impedir gravação em preview, auth, billing e demais áreas sensíveis até auditoria;
- associar replay a usuário apenas no admin autenticado e a grupo de loja quando disponível;
- definir amostragem inicial baixa e ajustável remotamente, se suportado;
- registrar retenção temporária e responsáveis de acesso.

## Arquivos/áreas afetadas

- `instrumentation-client.ts`
- módulo de consentimento/observability
- layouts ou marcadores de rota necessários
- configuração do projeto PostHog
- testes da configuração

## Critérios de aceite

- [ ] replay só inicia após autorização;
- [ ] inputs e textos ficam mascarados na configuração inicial;
- [ ] URLs não exibem query string, hash, token ou `session_id`;
- [ ] console e tráfego de rede não são capturados;
- [ ] preview não é gravado;
- [ ] sem token/consentimento, nenhum snapshot é enviado;
- [ ] acesso e retenção estão documentados;
- [ ] um replay de teste pode ser localizado por evento consentido.

## Validação

- gravar sessões sintéticas em desktop e 390 px;
- preencher valores falsos exclusivos em cada tipo de campo e procurar por eles no replay;
- navegar com query params sentinela e confirmar redaction;
- verificar requests de ingestão antes/depois do consentimento;
- testar preview, login e billing;
- lint, typecheck e build.

## Observações

Nenhum conteúdo deve ser seletivamente liberado nesta tarefa. Começar mascarado é intencional; a
utilidade do replay será aumentada apenas após a classificação da tarefa 08.
