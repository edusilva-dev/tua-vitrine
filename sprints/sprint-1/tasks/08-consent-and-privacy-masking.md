# 08 — Aplicar consentimento e privacy masking

## Objetivo

Garantir controle do titular, minimizar dados coletados e aprovar a segurança de eventos e replays
antes da produção.

## Contexto

Cookies/identificadores analíticos e replay não são necessários ao funcionamento principal. A ANPD
recomenda transparência, opção de rejeitar não necessários e controle granular. Este plano adota
opt-in conservador até aprovação da hipótese legal e dos textos do produto.

## Implementação esperada

- criar estado de consentimento versionado com `unknown`, `accepted` e `rejected`;
- exibir escolhas equivalentes de aceitar e rejeitar e link para detalhes;
- não inicializar captura persistente/replay antes de `accepted`;
- permitir revisar/revogar a escolha em local acessível;
- ao revogar, parar captura, resetar identidade e remover persistência PostHog aplicável;
- atualizar política de privacidade/cookies com fornecedor, finalidade, categorias e retenção;
- aplicar `ph-no-capture` em auth, suporte, feedback, billing, dados pessoais e conteúdo livre;
- manter inputs sempre mascarados;
- liberar texto apenas em elementos estáticos classificados como seguros;
- auditar eventos e replays com dados sentinela;
- definir processo de exclusão/anonimização e acesso no PostHog.

## Arquivos/áreas afetadas

- componente/provider de consentimento (novo)
- `app/layout.tsx`
- `instrumentation-client.ts`
- telas de auth, onboarding, settings, support, feedback e billing
- componentes de storefront e carrinho
- página/política de privacidade e cookies, se ainda inexistente
- testes unitários e E2E de consentimento
- configuração de retenção e permissões no PostHog

## Critérios de aceite

- [ ] estado desconhecido e rejeitado não enviam eventos nem replay;
- [ ] aceitar inicia captura sem reload obrigatório;
- [ ] rejeitar não degrada funcionalidades do produto;
- [ ] revogação interrompe captura e limpa identidade/persistência aplicável;
- [ ] preferência é versionada e pode ser solicitada novamente após mudança material;
- [ ] nenhum dado proibido aparece em payload ou replay;
- [ ] auth, billing, suporte e feedback estão bloqueados/mascarados;
- [ ] política e responsável por retenção/acesso estão registrados;
- [ ] auditoria jurídica/produto foi concluída ou produção permanece desabilitada.

## Validação

- E2E para aceitar, rejeitar, persistir escolha e revogar;
- inspecionar storage/cookies e requests de rede em cada estado;
- usar valores sentinela em e-mail, senha, telefone, nome, suporte, produto e query string;
- assistir replays de todos os fluxos listados no documento mestre;
- revisar permissões de membros do projeto PostHog;
- lint, typecheck, testes e build.

## Observações

Não alegar “conformidade LGPD” apenas por concluir esta tarefa. A implementação é um controle técnico;
a base legal, os textos e o processo de atendimento ao titular exigem validação responsável.
