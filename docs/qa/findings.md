# Registro de achados de QA

Use um bloco por defeito ou oportunidade. Não registrar segredos, cookies, tokens, conteúdo de
e-mail, dados pessoais ou financeiros.

## Resumo

| ID | Severidade | Área | Viewport | Status | Título |
| --- | --- | --- | --- | --- | --- |
| QA-001 | P2 | Onboarding | Todos | confirmado | URL da vitrine mostra localhost em staging |
| QA-002 | P2 | Catálogo | Todos | novo | Preço zero é publicado sem explicação |
| QA-003 | P2 | Admin | 390 px | confirmado | Menu horizontal parece overflow da página |
| QA-004 | P1 | Vitrine | 390 e 1440 px | confirmado | Detalhe do produto fica transparente e ilegível |
| QA-005 | P1 | Suporte | Todos | confirmado | Canal de suporte indisponível e cópia contraditória |
| QA-006 | P2 | Campanhas | Todos | confirmado | Bloqueio do Free não oferece caminho de upgrade |
| QA-007 | P3 | Configurações | Todos | confirmado | QR code ainda usa texto de protótipo/local |

## Achados confirmados

### QA-001 — URL da vitrine mostra localhost em staging

- Severidade: `P2`
- Tipo: `usabilidade | configuração`
- Status: `confirmado`
- Ambiente/deploy: staging
- Data/hora da observação: `2026-11-07T10:58:57-03:00`
- Página/fluxo: `/admin/onboarding`, etapa “Sua loja”
- Plano e sessão: Free autenticado
- Viewport/navegador: desktop, navegador interno

Esperado: o prefixo do slug usa `https://staging.usetuavitrine.com.br/`.

Atual: o formulário mostra `localhost:3000/`, reduzindo confiança e sugerindo um endereço inválido.

Critério de aceite:

- [ ] Derivar o prefixo da origem pública configurada.
- [ ] Adicionar regressão para ambiente não local.
- [ ] Retestar onboarding em staging.

### QA-002 — Preço zero é publicado sem explicação

- Severidade: `P2`
- Tipo: `usabilidade | regra de negócio`
- Status: `novo`
- Ambiente/deploy: staging
- Data/hora da observação: `2026-11-07T10:58:57-03:00`
- Página/fluxo: primeiro produto do onboarding e `/admin/products`
- Plano e sessão: Free autenticado
- Viewport/navegador: desktop e 390 px, navegador interno

Esperado: preço obrigatório maior que zero ou indicação explícita de que zero publicará um item
gratuito/sem preço.

Atual: informar somente “Produto QA” conclui o onboarding e publica o item como `R$ 0,00`. O
contrato aceita zero, mas a interface não explica a consequência.

Critério de aceite:

- [ ] Produto sem preço não é publicado acidentalmente.
- [ ] Decisão de produto sobre itens gratuitos documentada e refletida na UI.
- [ ] Regressão do primeiro produto.

### QA-003 — Menu horizontal parece overflow da página

- Severidade: `P2`
- Tipo: `usabilidade | responsividade`
- Status: `confirmado`
- Ambiente/deploy: staging
- Data/hora da observação: `2026-11-07T10:58:57-03:00`
- Página/fluxo: shell `/admin/*`
- Plano e sessão: Free autenticado
- Viewport/navegador: 390 x 844 px, navegador interno

Esperado: destinos administrativos são descobertos sem parecer que o layout vazou lateralmente.

Atual: a navegação corta destinos e exibe uma barra de rolagem horizontal nativa muito evidente.

Critério de aceite:

- [ ] Menu comunica que há mais destinos ou usa padrão móvel próprio.
- [ ] Página não apresenta scrollbar horizontal global.
- [ ] Retestar todos os destinos em 390 px e por teclado.

### QA-004 — Detalhe do produto fica transparente e ilegível

- Severidade: `P1`
- Tipo: `usabilidade | responsividade`
- Status: `confirmado`
- Ambiente/deploy: staging
- Data/hora da observação: `2026-11-07T10:58:57-03:00`
- Página/fluxo: `/{slug}`, ação “Ver detalhes”
- Plano e sessão: vitrine Free anônima
- Viewport/navegador: 390 x 844 e 1440 x 900 px, navegador interno

Esperado: o dialog tem superfície opaca, conteúdo legível e separação clara do backdrop.

Atual: card, rodapé e textos da página aparecem através do dialog. Título, preço e ações ficam
sobrepostos ou com contraste insuficiente. Adicionar ao carrinho ainda funciona e `Esc` fecha.

Critério de aceite:

- [ ] Superfície do dialog usa fundo opaco e tokens corretos.
- [ ] Conteúdo não se mistura ao backdrop em nenhum breakpoint.
- [ ] Retestar 390 px, 1440 px, foco e teclado.

### QA-005 — Canal de suporte indisponível e cópia contraditória

- Severidade: `P1`
- Tipo: `funcional | usabilidade | integração`
- Status: `confirmado`
- Ambiente/deploy: staging
- Data/hora da observação: `2026-11-07T10:58:57-03:00`
- Página/fluxo: `/admin/support`
- Plano e sessão: Free autenticado
- Viewport/navegador: 390 x 844 px, navegador interno

Esperado: canal de suporte funcional ou alternativa clara antes da publicação.

Atual: a página diz que a mensagem vai direto para a equipe, mas logo abaixo informa “Canal em
configuração” e não oferece formulário ou contato alternativo.

Critério de aceite:

- [ ] Configurar `SUPPORT_EMAIL` ou fornecer canal alternativo.
- [ ] Alinhar a cópia ao estado real.
- [ ] Validar envio, erro e preservação do formulário.

### QA-006 — Bloqueio do Free não oferece caminho de upgrade

- Severidade: `P2`
- Tipo: `usabilidade | conversão`
- Status: `confirmado`
- Ambiente/deploy: staging
- Data/hora da observação: `2026-11-07T10:58:57-03:00`
- Página/fluxo: `/admin/promotions`
- Plano e sessão: Free autenticado
- Viewport/navegador: 390 x 844 px, navegador interno

Esperado: explicar o bloqueio e oferecer CTA para conhecer/assinar o Profissional.

Atual: a página termina após informar que o recurso é exclusivo do Profissional.

Critério de aceite:

- [ ] Adicionar CTA contextual para `/admin/billing`.
- [ ] Retestar navegação por teclado e mobile.

### QA-007 — QR code ainda usa texto de protótipo/local

- Severidade: `P3`
- Tipo: `conteúdo | usabilidade`
- Status: `confirmado`
- Ambiente/deploy: staging
- Data/hora da observação: `2026-11-07T10:58:57-03:00`
- Página/fluxo: `/admin/settings`
- Plano e sessão: Free autenticado
- Viewport/navegador: 390 e 1440 px, navegador interno

Esperado: instrução compatível com a URL pública exibida.

Atual: o card afirma “Neste protótipo, o link usa o endereço local configurado”, embora mostre a
URL pública de staging.

Critério de aceite:

- [ ] Remover a referência a protótipo/endereço local.
- [ ] Confirmar que o QR code usa a origem pública configurada.

## Modelo

### QA-000 — Título curto

- Severidade: `P0 | P1 | P2 | P3`
- Tipo: `funcional | usabilidade | acessibilidade | responsividade | integração | segurança`
- Status: `novo | confirmado | em correção | pronto para reteste | resolvido | não corrigir`
- Ambiente/deploy:
- Data/hora da observação (ISO 8601 com timezone):
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
