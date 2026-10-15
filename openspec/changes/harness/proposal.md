# Proposal

## Why

O projeto já possui regras e CI, mas precisa de um fluxo versionado para coordenação de agentes,
contextos delimitados e revisão independente. A demanda e as políticas foram acordadas com o usuário.

## What Changes

- Configurar papéis Codex e roteamento de modelos por risco, com concorrência limitada.
- Adicionar skills próprias, OpenSpec local fixado e documentação operacional.
- Exigir branch por demanda, revisão independente por SHA e PR com merge manual.
- Validar estrutura do harness e specs no CI existente.

## Capabilities

### New Capabilities

- `ai-delivery`: fluxo de entrega assistida por agentes com contexto delimitado e revisão independente.

### Modified Capabilities

Nenhuma.

## Impact

Configuração de desenvolvimento, scripts, testes e CI; nenhuma API, schema de banco ou regra de
negócio muda. Fora de escopo: deploy, proteção remota de branches, migração das specs de todo o
produto, instalação global e orquestrador externo. Aceite: descoberta das skills, configuração
válida, testes dos validadores, cenários de delegação, revisão independente e PR rastreável.
