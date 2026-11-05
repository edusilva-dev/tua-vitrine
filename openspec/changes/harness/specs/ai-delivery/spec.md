## ADDED Requirements

### Requirement: Branch por demanda

O fluxo SHALL criar uma branch `codex/<task>` antes de editar, reutilizar a mesma branch na
continuação da demanda e reservar Git mutável ao orquestrador.

#### Scenario: Nova demanda de implementação
- **WHEN** uma demanda autorizada exige alterações no repositório
- **THEN** o orquestrador cria a branch da tarefa antes da primeira edição
- **AND** preserva mudanças alheias sem reset ou force push

### Requirement: Contexto delimitado e roteamento por risco

O orquestrador SHALL delegar objetivo, arquivos permitidos, referências, contratos, dependências,
aceite e validação, selecionando perfil conforme risco e limitando concorrência a três filhos.

#### Scenario: Alteração de cobrança
- **WHEN** uma tarefa altera comportamento de cobrança
- **THEN** a implementação usa o perfil crítico e a revisão usa perfil de alta capacidade
- **AND** não inclui segredos ou histórico completo no contexto delegado

#### Scenario: Dependência compartilhada
- **WHEN** duas subtarefas precisam alterar o mesmo contrato ou usar o mesmo banco de teste
- **THEN** o orquestrador serializa essas operações antes de integrar resultados

#### Scenario: Modelo indisponível
- **WHEN** o perfil selecionado não pode ser executado
- **THEN** o orquestrador informa a limitação e não reduz silenciosamente a revisão crítica

### Requirement: Revisão independente e entrega manual

Toda entrega SHALL receber revisão de agente que não escreveu o código, vinculada à base e ao
SHA final, com achados verificáveis e limitações. O merge SHALL permanecer manual pelo usuário.

#### Scenario: Correção depois da revisão
- **WHEN** o implementador ou orquestrador modifica código já revisado
- **THEN** um novo commit recebe revisão do delta e da integração antes da conclusão

#### Scenario: Validação ou revisão pendente
- **WHEN** falta revisão, há achados P0/P1/P2 pendentes ou checks obrigatórios incompletos
- **THEN** o PR permanece em draft e a entrega explicita o bloqueio

### Requirement: Configuração verificável

O projeto SHALL oferecer validação local e em CI dos perfis e skills e execução de OpenSpec
fixada pelo lockfile usando Bun, sem afirmar garantias que dependem do runtime ou GitHub.

#### Scenario: Configuração inválida
- **WHEN** um perfil obrigatório, referência local ou frontmatter está inválido
- **THEN** o checker retorna falha sem imprimir payload sensível

#### Scenario: Atualização das instruções
- **WHEN** as skills ou perfis locais mudam
- **THEN** o operador verifica a descoberta em nova sessão antes de depender das novas instruções
