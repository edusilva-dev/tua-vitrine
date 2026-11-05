# Tasks

## 1. Contratos e permissões compartilhados

- [ ] 1.1 Estender o contrato de personalização com cores opcionais, `fontPreset` e `cardRoundness`, atualizar DTOs e centralizar defaults; verificar testes unitários de JSON legado, defaults, opções inválidas e preservação da frase.
- [ ] 1.2 Separar a permissão de modelo/frase da personalização avançada na matriz e nos entitlements; verificar `tests/unit/entitlements.test.ts` para Free, Essencial, Profissional, trial vigente e expirado, preservando as demais permissões.
- [ ] 1.3 Criar normalização compartilhável por plano e validação de contraste das cores efetivas; verificar testes unitários de contraste no limiar, cores parciais, valores sem permissão e leitura segura de dados armazenados inválidos.

## 2. Persistência, leitura e downgrade

- [ ] 2.1 Aplicar a matriz em `saveSettings`, DTOs e leituras públicas pelo PATCH existente, preservando validação/origem e contexto de loja; verificar integração de persistência, normalização, payload inválido, logo de outra loja e tentativa de enviar `storeId` alheio.
- [ ] 2.2 Atualizar os resets em `applyStripeSubscription` e `changePlan` com a mesma normalização; verificar em `tests/integration/plan-enforcement.test.ts` Profissional para Essencial preservando cor/frase/modelo, passagem para Free, campanhas, cancelamento agendado e aparência efetiva após perda de acesso/trial sem reset prévio.
- [ ] 2.3 Atualizar a matriz e os efeitos do downgrade em `docs/plans.md`, na regra correspondente de AGENTS e nos textos de `billing-panel.tsx`; verificar coerência com os testes, preservação do bloco gerado do Next e ausência de alterações em preços ou regras de trial.

## 3. Aplicação visual e prévia

- [ ] 3.1 Implementar o resolvedor puro de tokens locais, os dois presets das fontes existentes e três raios exclusivos dos cards; verificar testes unitários dos defaults e overrides e regressão visual dos tokens sem alterar o painel.
- [ ] 3.2 Aplicar a aparência em galeria/lista e nos conteúdos de portal afetados da vitrine, extraindo somente peças visuais necessárias; verificar Playwright com fundo claro/escuro, cards, detalhes e carrinho, sem regressão de compra ou vazamento de tema para o painel/outra loja.
- [ ] 3.3 Criar amostra passiva identificada como exemplo usando o mesmo resolvedor e peças visuais; verificar Playwright mostrando o rascunho sem PATCH, métricas, curtidas, WhatsApp ou escrita em carrinho/favoritos e preservar o teste de `/admin/preview` sem métricas.

## 4. Editor conciso e comunicação

- [ ] 4.1 Reorganizar `StoreSettings` em controles básicos e Ajustes avançados recolhidos, com indicação de plano, preservando nome, WhatsApp, categorias, ordem, link e QR code; verificar Playwright para os três planos e salvamento somente do logo sem abrir os avançados.
- [ ] 4.2 Integrar a amostra ao rascunho único e atualizar formulário/logo com o DTO normalizado após sucesso; verificar Playwright de expandir/recolher sem perder ajustes, erro de contraste/rede preservando formulário, prevenção de envio duplicado e vitrine mudando somente após salvar.
- [ ] 4.3 Validar e ajustar layout em 390 px e desktop, rótulos, foco, teclado e anúncio de erros/expansão; verificar ausência de overflow e conclusão do fluxo com teclado e conferência por leitor de tela, registrando as evidências efetivas.
- [ ] 4.4 Documentar em `docs/plans.md` o fluxo de edição, os limites dos ajustes avançados e a diferença entre amostra de rascunho e prévia completa salva; verificar correspondência com a tela entregue e o escopo da especificação.

## 5. Integração e revisão independente

- [ ] 5.1 Rodar `bun run lint`, `bun run typecheck`, `bun run spec -- validate --all --strict`, `bun test`, `bun run build` e `git diff --check` no estado integrado; registrar resultados e pendências sem alterar controles para obter aprovação.
- [ ] 5.2 Executar os fluxos Playwright relacionados e as regressões de planos/tenant com banco isolado `tuavitrine_test`, sem concorrência entre suítes que compartilham recursos; verificar fluxo completo editor, API, persistência, downgrade e vitrine com evidências em celular e desktop.
- [ ] 5.3 Criar commit pelo orquestrador e solicitar revisão independente do SHA contra critérios de aceite, isolamento, planos e compatibilidade; verificar ausência de P0/P1/P2 pendentes e revisar novamente cada correção em novo commit.
- [ ] 5.4 Fazer push e abrir ou atualizar PR com escopo, evidências, SHA revisado e pendências, aguardando CI do SHA final; manter draft se revisão/validação estiver incompleta e deixar o merge manual para o usuário.

## Workflow follow-up

- Arquivar a mudança somente após implementação, validação e revisão concluídas; não iniciar a implementação durante a criação destes artefatos.
- Merge e publicação seguem o fluxo do projeto; a proposta não os executa nem antecipa sua aprovação.
