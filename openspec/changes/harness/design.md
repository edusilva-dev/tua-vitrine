# Design

## Context

A sessão raiz coordena o repositório existente. AGENTS é a entrada permanente; detalhes de processo
ficam em skills e docs/ai-workflow.md. O CI existente continua responsável por checks executáveis.

## Goals / Non-Goals

Reduzir contexto repetido, separar autoria e revisão e registrar estado fora do chat. Não prometer
economia de tokens nem transformar instruções em falsas garantias de isolamento ou aprovação GitHub.

## Decisions

- Perfis TOML locais: explorer, implementer-light, implementer, implementer-critical, code-reviewer
  e orchestrator. A sessão raiz exerce o último papel; não há camada de agente extra obrigatória.
- Luna/high para escopos leves; Sol/medium para implementação comum; Sol/high para coordenação,
  risco crítico e revisão. Modelo indisponível é informado; não há downgrade crítico silencioso.
- Até dois filhos por padrão, limite configurado de três. Contexto novo contém contrato de trabalho,
  arquivos permitidos, dependências e aceite. Escritores e testes com recursos comuns são serializados.
- OpenSpec 1.14.2 como devDependency; wrapper Bun desabilita telemetria. Skills upstream permanecem
  geradas, com comandos adaptados pelo AGENTS ao wrapper local. Config contextualiza artefatos.
- Revisor não escreve nem implementa correções. Recebe base/SHA e inspeciona diff e contexto.
  Correções geram novo commit e revisão. Achados P0/P1/P2 ou validação pendente mantêm PR em draft.
- Checker local testa estrutura de TOML, frontmatter, referências e papéis. Não atesta isolamento,
  disponibilidade de modelos, execução real da revisão ou proteção de branches.

## Risks / Trade-offs

Agentes compartilham permissões da sessão: "não editar" é uma instrução, não sandbox separado.
Configuração só entra em sessões que a carregam; verificar descoberta em chat novo. Mais agentes
podem aumentar consumo; limitar fan-out e registrar métricas apenas quando disponíveis.
Atualizar OpenSpec pode regenerar skills: revisar o diff e repetir checks antes de aceitar atualização.

## Validation

Validar configuração com Codex instalado, descoberta das skills, CLI OpenSpec sob Bun 1.3.14,
cenários independentes de roteamento e testes unitários negativos do checker. Executar lint,
typecheck, testes e build. Não alterar produto para testar o harness. Registrar evidências e
SHA revisado no PR; merge manual. Reverter a configuração e dependência é suficiente para rollback.
