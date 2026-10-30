# Fluxo de desenvolvimento assistido

O Tua Vitrine não usa OpenSpec. Na fase atual do produto, documentos de sprint, regras canônicas e
testes próximos ao código fornecem contexto mais útil do que uma camada adicional de especificação.

## Referências

- `DEVELOPMENT.md`: regras canônicas de arquitetura, código e validação;
- `AGENTS.md`: instruções operacionais para agentes;
- `docs/`: decisões e comportamento dos domínios;
- `sprints/`: escopo, ordem e critérios de aceite do trabalho planejado;
- testes próximos à área alterada: comportamento executável esperado.

Artefatos antigos de OpenSpec, harness ou perfis de agentes não são fontes de verdade e não devem ser
usados para planejar ou implementar novas mudanças.

## Fluxo por demanda

1. Leia `DEVELOPMENT.md`, o documento do domínio e os testes afetados.
2. Verifique o estado do repositório e preserve alterações que não pertencem à demanda.
3. Crie ou reutilize uma branch `codex/<tarefa>` antes de editar.
4. Implemente a menor solução completa seguindo os padrões existentes.
5. Rode lint, typecheck, testes relacionados e, para mudanças relevantes, suíte completa e build.
6. Registre critérios de aceite, validações executadas e pendências no PR.
7. Solicite revisão independente do SHA final; mudanças posteriores exigem nova revisão.
8. Mantenha o merge manual e o PR em draft enquanto houver bloqueios.

Não registre prompts, logs de sessão, segredos, tokens ou dados pessoais no repositório.
