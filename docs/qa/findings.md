# Registro de achados de QA

Use um bloco por defeito ou oportunidade. Não registrar segredos, cookies, tokens, conteúdo de
e-mail, dados pessoais ou financeiros.

## Execução STG-2026-11-07-01

- Alvo: `https://staging.usetuavitrine.com.br`
- Janela da rodada: `2026-11-07T10:58:57-03:00` a `2026-11-07T11:06:00-03:00`
- Sessão: conta Free criada na rodada e vitrine `loja-qa-59705592`
- Fingerprint do build revalidado na mesma sessão: CSS `897c64b49cd07410` e
  `main-app-dad5a851ae48121e.js`
- Evidência: observação visual e árvore de acessibilidade do navegador interno; nenhum artefato
  contém e-mail, cookie, token ou credencial.

O fingerprint é formado pelos hashes dos assets servidos pelo alias durante a rodada. Ele permite
distinguir este build depois que `staging` apontar para um novo deployment.

## Resumo

| ID | Severidade | Área | Viewport | Status | Título |
| --- | --- | --- | --- | --- | --- |
| QA-001 | P3 | Onboarding | Todos | confirmado | URL da vitrine mostra localhost em staging |
| QA-002 | P2 | Catálogo | Todos | confirmado | Preço zero é publicado sem explicação |
| QA-003 | P2 | Admin | 390 px | confirmado | Menu horizontal parece overflow da página |
| QA-004 | P2 | Vitrine | 390 e 1440 px | confirmado | Detalhe do produto fica transparente e ilegível |
| QA-005 | P2 | Suporte | Todos | confirmado | Canal de suporte indisponível e cópia contraditória |
| QA-006 | P3 | Campanhas | Todos | confirmado | Bloqueio do Free não oferece caminho de upgrade |
| QA-007 | P3 | Configurações | Todos | confirmado | QR code ainda usa texto de protótipo/local |

## Achados confirmados

### QA-001 — URL da vitrine mostra localhost em staging

- Severidade: `P3`
- Tipo: `usabilidade | configuração`
- Status: `confirmado`
- Ambiente/deploy: `STG-2026-11-07-01`
- Data/hora da observação: `2026-11-07T10:58:57-03:00`
- Página/fluxo: `/admin/onboarding`, etapa “Sua loja”
- Plano e sessão: Free autenticado
- Viewport/navegador: desktop, navegador interno

Esperado: o prefixo do slug usa `https://staging.usetuavitrine.com.br/`.

Atual: o formulário mostra `localhost:3000/`, reduzindo confiança e sugerindo um endereço inválido.

Passos:

1. Criar uma conta Free em staging e confirmar o e-mail.
2. Abrir `/admin/onboarding` na etapa “Sua loja”.
3. Digitar um nome e observar o prefixo exibido antes do slug.

Evidência:

- Observação visual reproduzida em staging: `localhost:3000 / loja-qa-59705592`.

Critério de aceite:

- [ ] Derivar o prefixo da origem pública configurada.
- [ ] Adicionar regressão para ambiente não local.
- [ ] Retestar onboarding em staging.

### QA-002 — Preço zero é publicado sem explicação

- Severidade: `P2`
- Tipo: `usabilidade | regra de negócio`
- Status: `confirmado`
- Ambiente/deploy: `STG-2026-11-07-01`
- Data/hora da observação: `2026-11-07T10:58:57-03:00`
- Página/fluxo: primeiro produto do onboarding e `/admin/products`
- Plano e sessão: Free autenticado
- Viewport/navegador: desktop e 390 px, navegador interno

Esperado: preço obrigatório maior que zero ou indicação explícita de que zero publicará um item
gratuito/sem preço.

Atual: informar somente “Produto QA” conclui o onboarding e publica o item como `R$ 0,00`. O
contrato aceita zero, mas a interface não explica a consequência.

Passos:

1. Avançar até “Primeiro produto” no onboarding Free.
2. Preencher apenas o nome e manter “Preço normal” em `R$ 0,00`.
3. Selecionar “Adicionar produto” e abrir `/admin/products`.

Evidência:

- Toast “Produto adicionado à vitrine” e card publicado `Produto QA — R$ 0,00`.

Critério de aceite:

- [ ] Produto sem preço não é publicado acidentalmente.
- [ ] Decisão de produto sobre itens gratuitos documentada e refletida na UI.
- [ ] Regressão do primeiro produto.

### QA-003 — Menu horizontal parece overflow da página

- Severidade: `P2`
- Tipo: `usabilidade | responsividade`
- Status: `confirmado`
- Ambiente/deploy: `STG-2026-11-07-01`
- Data/hora da observação: `2026-11-07T10:58:57-03:00`
- Página/fluxo: shell `/admin/*`
- Plano e sessão: Free autenticado
- Viewport/navegador: 390 x 844 px, navegador interno

Esperado: destinos administrativos são descobertos sem parecer que o layout vazou lateralmente.

Atual: a navegação corta destinos e exibe uma barra de rolagem horizontal nativa muito evidente.

Passos:

1. Abrir qualquer rota `/admin/*` em 390 x 844 px.
2. Observar o menu abaixo do seletor da loja.
3. Tentar descobrir Estatísticas, Assinatura, Minha vitrine e Suporte.

Evidência:

- Em 390 x 844 px, a árvore de acessibilidade expôs os sete destinos, mas visualmente o viewport
  mostrou somente os primeiros itens e uma scrollbar horizontal nativa no menu.

Critério de aceite:

- [ ] Menu comunica que há mais destinos ou usa padrão móvel próprio.
- [ ] Página não apresenta scrollbar horizontal global.
- [ ] Retestar todos os destinos em 390 px e por teclado.

### QA-004 — Detalhe do produto fica transparente e ilegível

- Severidade: `P2`
- Tipo: `usabilidade | responsividade`
- Status: `confirmado`
- Ambiente/deploy: `STG-2026-11-07-01`
- Data/hora da observação: `2026-11-07T10:58:57-03:00`
- Página/fluxo: `/{slug}`, ação “Ver detalhes”
- Plano e sessão: vitrine Free anônima
- Viewport/navegador: 390 x 844 e 1440 x 900 px, navegador interno

Esperado: o dialog tem superfície opaca, conteúdo legível e separação clara do backdrop.

Atual: card, rodapé e textos da página aparecem através do dialog. Título, preço e ações ficam
sobrepostos ou com contraste insuficiente. Adicionar ao carrinho ainda funciona e `Esc` fecha.

Passos:

1. Abrir a vitrine pública e selecionar “Ver detalhes” em um produto.
2. Repetir em 390 x 844 e 1440 x 900 px.
3. Comparar o texto do dialog com o card e o rodapé ao fundo.

Evidência:

- Em 390 x 844 e 1440 x 900 px, card, rodapé e textos da página permaneceram visíveis através da
  superfície do dialog; a árvore de acessibilidade manteve título, preço, quantidade, carrinho e
  fechamento disponíveis.

Critério de aceite:

- [ ] Superfície do dialog usa fundo opaco e tokens corretos.
- [ ] Conteúdo não se mistura ao backdrop em nenhum breakpoint.
- [ ] Retestar 390 px, 1440 px, foco e teclado.

### QA-005 — Canal de suporte indisponível e cópia contraditória

- Severidade: `P2`
- Tipo: `funcional | usabilidade | integração`
- Status: `confirmado`
- Ambiente/deploy: `STG-2026-11-07-01`
- Data/hora da observação: `2026-11-07T10:58:57-03:00`
- Página/fluxo: `/admin/support`
- Plano e sessão: Free autenticado
- Viewport/navegador: 390 x 844 px, navegador interno

Esperado: canal de suporte funcional ou alternativa clara antes da publicação; feedback da
plataforma deve continuar identificado como um fluxo separado.

Atual: a página diz que a mensagem vai direto para a equipe, mas logo abaixo informa “Canal em
configuração” e não oferece formulário de suporte ou contato alternativo. O formulário de feedback
da plataforma continua disponível mais abaixo, mas não substitui um pedido que exige resposta.

Passos:

1. Abrir `/admin/support` autenticado.
2. Comparar a introdução “Sua mensagem vai direto para a equipe” com o card seguinte.
3. Verificar separadamente o formulário “Ajude a melhorar a plataforma”.

Evidência:

- Estado visível “Canal em configuração” sem formulário de suporte; formulário de feedback da
  plataforma presente com tipo, nota e comentário opcional.

Critério de aceite:

- [ ] Configurar `SUPPORT_EMAIL` ou fornecer canal alternativo.
- [ ] Alinhar a cópia ao estado real.
- [ ] Validar envio, erro e preservação do formulário.

### QA-006 — Bloqueio do Free não oferece caminho de upgrade

- Severidade: `P3`
- Tipo: `usabilidade | conversão`
- Status: `confirmado`
- Ambiente/deploy: `STG-2026-11-07-01`
- Data/hora da observação: `2026-11-07T10:58:57-03:00`
- Página/fluxo: `/admin/promotions`
- Plano e sessão: Free autenticado
- Viewport/navegador: 390 x 844 px, navegador interno

Esperado: explicar o bloqueio e oferecer CTA para conhecer/assinar o Profissional.

Atual: a página termina após informar que o recurso é exclusivo do Profissional.

Passos:

1. Entrar com uma loja Free.
2. Abrir `/admin/promotions`.
3. Verificar as ações disponíveis após o card de bloqueio.

Evidência:

- Estado visível contém apenas a explicação do plano Profissional, sem link ou botão para billing.

Critério de aceite:

- [ ] Adicionar CTA contextual para `/admin/billing`.
- [ ] Retestar navegação por teclado e mobile.

### QA-007 — QR code ainda usa texto de protótipo/local

- Severidade: `P3`
- Tipo: `conteúdo | usabilidade`
- Status: `confirmado`
- Ambiente/deploy: `STG-2026-11-07-01`
- Data/hora da observação: `2026-11-07T10:58:57-03:00`
- Página/fluxo: `/admin/settings`
- Plano e sessão: Free autenticado
- Viewport/navegador: 390 e 1440 px, navegador interno

Esperado: instrução compatível com a URL pública exibida.

Atual: o card afirma “Neste protótipo, o link usa o endereço local configurado”, embora mostre a
URL pública de staging.

Passos:

1. Abrir `/admin/settings` em staging.
2. Localizar o card “Do balcão para a vitrine”.
3. Comparar a URL pública exibida com o texto abaixo de “Gerar QR code”.

Evidência:

- URL exibida em `https://staging.usetuavitrine.com.br/...` e texto visível sobre protótipo/endereço
  local no mesmo card.

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
