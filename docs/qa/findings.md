# Registro de achados de QA

Use um bloco por defeito ou oportunidade. Não registrar segredos, cookies, tokens, conteúdo de
e-mail, dados pessoais ou financeiros.

## Resumo

| ID | Severidade | Área | Viewport | Status | Título |
| --- | --- | --- | --- | --- | --- |

## Modelo

### QA-000 — Título curto

- Severidade: `P0 | P1 | P2 | P3`
- Tipo: `funcional | usabilidade | acessibilidade | responsividade | integração | segurança`
- Status: `novo | confirmado | em correção | pronto para reteste | resolvido | não corrigir`
- Ambiente/deploy:
- Página/fluxo:
- Plano e sessão:
- Viewport/navegador:

Passos:

1. Passo reproduzível.
2. Ação que evidencia o problema.

Esperado:

Resultado esperado observável.

Atual:

Resultado real, frequência e impacto.

Evidência:

- Screenshot, vídeo, log sanitizado ou resposta sem dados sensíveis.

Critério de aceite:

- [ ] Comportamento corrigido.
- [ ] Regressão automatizada quando aplicável.
- [ ] Reteste desktop.
- [ ] Reteste 390 px.
- [ ] Teclado/leitor de tela quando aplicável.

## Observações ainda não classificadas

- Landing em 390 x 844 px: a primeira dobra não mostrou overflow ou sobreposição. A navegação de
  seções não aparece no header mobile; avaliar em teste de usabilidade se apenas o CTA é suficiente.
