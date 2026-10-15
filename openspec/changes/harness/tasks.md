## 1. Configuração

- [x] 1.1 Criar codex/harness e atualizar regras de branch, autoria e revisão.
- [x] 1.2 Adicionar perfis Codex com modelos por risco e concorrência limitada.
- [x] 1.3 Adicionar skills de coordenação, implementação e revisão.
- [x] 1.4 Instalar OpenSpec fixado, gerar skills e configurar contexto e wrapper Bun.

## 2. Verificação e operação

- [x] 2.1 Implementar checker e testes negativos de configuração; integrar no CI.
- [x] 2.2 Documentar uso, ambiente isolado e limites; adicionar template de PR.
- [x] 2.3 Executar descoberta, cenários de delegação e validações integradas.
- [x] 2.4 Revisar independentemente a implementação e resolver achados; revisar o delta final.
- [ ] 2.5 Publicar branch e PR, registrar SHA/evidências e acompanhar CI; merge manual.

## Evidências da implementação

- Bun 1.3.14: instalação congelada, lint, typecheck, harness:check e validação OpenSpec passaram.
- 99 testes passaram, incluindo 22 do checker; build passou com configuração local de teste do CI.
- Codex 0.154.0 carregou configuração e descobriu as skills locais sem erros.
- Avaliação independente de quatro cenários confirmou roteamento por risco, revisão obrigatória e
  serialização de contratos e banco compartilhados.
- A primeira validação encontrou 11 alertas já presentes na base local. A atualização remota
  `09a74af` trouxe correções e a exceção documentada de braces. Essa base foi integrada preservando
  seus hooks, versões e política de auditoria; a validação final usa `bun run audit`.
- Playwright não foi executado localmente nesta alteração de ferramentas, sem mudança de UI.
- Após integrar `09a74af`, auditoria conforme política existente, lint, typecheck, 99 testes,
  checker, specs e build passaram novamente. A revisão independente não encontrou achados
  substantivos; removeu-se uma linha vazia final da licença para passar diff-check.
- Branch publicada. A criação de PR pelo conector retornou 403 (permissão da integração);
  a publicação do PR e a confirmação de CI continuam pendentes até resolver o acesso.
