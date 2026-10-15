## 1. Configuração

- [x] 1.1 Criar codex/harness e atualizar regras de branch, autoria e revisão.
- [x] 1.2 Adicionar perfis Codex com modelos por risco e concorrência limitada.
- [x] 1.3 Adicionar skills de coordenação, implementação e revisão.
- [x] 1.4 Instalar OpenSpec fixado, gerar skills e configurar contexto e wrapper Bun.

## 2. Verificação e operação

- [x] 2.1 Implementar checker e testes negativos de configuração; integrar no CI.
- [x] 2.2 Documentar uso, ambiente isolado e limites; adicionar template de PR.
- [ ] 2.3 Executar descoberta, cenários de delegação e validações integradas.
- [ ] 2.4 Revisar independentemente o commit final e resolver achados.
- [ ] 2.5 Publicar branch e PR, registrar SHA/evidências e acompanhar CI; merge manual.

## Evidências da implementação

- Bun 1.3.14: instalação congelada, lint, typecheck, harness:check e validação OpenSpec passaram.
- 99 testes passaram, incluindo 22 do checker; build passou com configuração local de teste do CI.
- Codex 0.154.0 carregou configuração e descobriu as skills locais sem erros.
- Avaliação independente de quatro cenários confirmou roteamento por risco, revisão obrigatória e
  serialização de contratos e banco compartilhados.
- Auditoria pendente: 11 alertas (5 high, 5 moderate, 1 low), mesmos alertas no lockfile da base
  `master`. OpenSpec adiciona caminho para braces, já presente via shadcn. Não houve atualização
  incidental de versões da stack. CI deve permanecer bloqueado até correção separada; PR em draft.
- Playwright não foi executado localmente nesta alteração de ferramentas, sem mudança de UI.
