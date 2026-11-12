# 08 — Validar segurança e executar o rollout

## Objetivo

Validar o fluxo completo do Super Admin e liberar o recurso de forma controlada, com documentação
operacional suficiente para acesso e incidentes.

## Contexto

O Super Admin atravessa o isolamento entre lojas e executa operações sensíveis. O sprint só está
pronto quando autorização, isolamento, auditoria e comportamento de falha forem testados em conjunto.

## Implementação esperada

- criar testes end-to-end do acesso, busca, detalhe, suporte e ações críticas;
- testar chamadas diretas às APIs com usuário comum, sessão ausente e administrador revogado;
- revisar todos os DTOs e respostas em busca de dados desnecessários;
- verificar que mutações exigem motivo, confirmação e auditoria;
- validar falhas da Stripe e Resend sem estado parcial ou perda de suporte;
- preparar dados de teste representando os principais estados operacionais;
- documentar concessão/revogação de acesso e resposta a comprometimento de conta;
- documentar como reconciliar assinatura e tratar falha de notificação de suporte;
- liberar primeiro em test/staging e realizar smoke test com um administrador autorizado;
- liberar em produção somente após a matriz de autorização e isolamento passar.

## Matriz mínima de validação

| Cenário | Sem sessão | Lojista comum | Super Admin | Super Admin revogado |
| --- | --- | --- | --- | --- |
| Abrir área interna | Negado | Negado | Permitido | Negado |
| Buscar lojas | Negado | Negado | Permitido | Negado |
| Ler detalhe de loja | Negado | Negado | Permitido | Negado |
| Executar ação | Negado | Negado | Permitido com motivo | Negado |
| Consultar auditoria | Negado | Negado | Permitido | Negado |

## Critérios de aceite

- [ ] matriz de autorização passa em páginas e endpoints;
- [ ] testes confirmam isolamento e ausência de enumeração indevida;
- [ ] suporte é preservado quando a notificação por e-mail falha;
- [ ] reconciliação e ações operacionais não deixam estado parcial;
- [ ] toda mutação aparece na auditoria com conteúdo seguro;
- [ ] interface funciona em 390 px e desktop, por teclado;
- [ ] lint, typecheck, testes completos e build passam;
- [ ] smoke test em test/staging é concluído antes de produção;
- [ ] runbook de acesso, revogação e operações está atualizado.

## Validação

- rodar `bun run lint`;
- rodar `bun run typecheck`;
- rodar `bun test` e os testes específicos de autenticação/cobrança;
- rodar `bun run build`;
- rodar os cenários Playwright do Super Admin;
- executar `git diff --check` e revisar segredos/dados pessoais;
- realizar smoke test manual em test/staging.

## Fora do escopo

- teste de carga amplo da plataforma;
- certificação de compliance;
- monitoramento externo ou SIEM;
- treinamento de uma equipe de suporte com múltiplos níveis.
