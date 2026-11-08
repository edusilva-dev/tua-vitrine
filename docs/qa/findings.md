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

## Execução STG-2026-11-08-01

- Alvo: `https://staging.usetuavitrine.com.br`
- Janela da rodada: `2026-11-08T12:38:00-03:00` a `2026-11-08T12:46:00-03:00`
- Sessão: mesma conta da rodada anterior; Free no início e trial Profissional ativado durante o QA
- Fingerprint do build: CSS `897c64b49cd07410` e `main-app-dad5a851ae48121e.js`
- Arquivo de upload: `public/assets/icone-tua-vitrine.png` do workspace de origem, PNG de
  1.254 × 1.254 px, 274.015 bytes e SHA-256
  `29c10477fc0057af11fbcda111f00e5cdcfcc18f42419a9324efd82e9c2465e1`
- Billing: checkout Stripe em test mode aberto sem preencher pagamento ou concluir assinatura
- Evidência: observação visual, DOM e árvore de acessibilidade do navegador interno.

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
| QA-008 | P2 | Storage | 390 px | confirmado | Upload de PNG válido falha com erro genérico |
| QA-009 | P2 | Configurações | 390 px | confirmado | WhatsApp salvo não hidrata no formulário |
| QA-010 | P3 | Billing | Desktop | confirmado | Checkout diverge da marca e do nome do plano |
| QA-011 | P3 | Catálogo | 390 px | confirmado | Modal perde foco e busca não tem nome acessível |
| QA-012 | P3 | Cadastro | 390 px | confirmado | Senha tem rótulo incorreto e não pode ser revelada |
| QA-013 | P2 | Onboarding | Todos | em investigação | Slug deixa de acompanhar o nome após redirecionamento |
| QA-014 | P3 | Admin | 390 px | confirmado | Controles recorrentes têm alvos táteis pequenos |

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
- O `nav` mede 375 px de largura visível para aproximadamente 1.025 px de conteúdo rolável.
- Em `/admin/support`, o menu inicia com `scrollLeft = 0` e o item ativo fica entre
  aproximadamente `x = 896` e `x = 1.013`, totalmente fora da tela. A rota atual não é trazida
  automaticamente para a área visível.
- Sidebar móvel e cabeçalho consomem 348 px antes do início do `main`, cerca de 41% de uma tela
  de 844 px. Nome da loja e ações aparecem em duas faixas empilhadas.

Direção recomendada:

- Manter a sidebar atual no desktop e, abaixo de `lg`, substituí-la por uma app bar compacta com
  menu hambúrguer que abre um `Sheet` lateral.
- Exibir os sete destinos verticalmente no drawer, com rota ativa visível, nome da loja no topo e
  ações de conta/prévia no rodapé. Fechar após navegar e restaurar foco no gatilho.
- Não usar bottom navigation: sete destinos excedem o conjunto pequeno de ações que esse padrão
  comporta bem.

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

### QA-008 — Upload de PNG válido falha com erro genérico

- Severidade: `P2`
- Tipo: `funcional | integração | usabilidade`
- Status: `confirmado`
- Ambiente/deploy: `STG-2026-11-08-01`
- Data/hora da observação: `2026-11-08T12:41:00-03:00`
- Página/fluxo: `/admin/products`, editar produto, adicionar imagem
- Plano e sessão: Free autenticado
- Viewport/navegador: 390 x 844 px, navegador interno

Esperado: PNG válido é processado pelo Sharp, salvo no R2 e aparece na lista de imagens do
produto.

Atual: após selecionar o arquivo, o contador permanece `0 / 1` e o formulário mostra somente
`Failed to fetch`. O arquivo é um PNG não animado de 1.254 × 1.254 px e 274.015 bytes, dentro dos
formatos e limites documentados.

Passos:

1. Abrir `/admin/products` com uma loja Free e editar um produto sem imagens.
2. Selecionar “Adicionar” em “Fotos do produto”.
3. Enviar o PNG válido descrito na execução.

Evidência:

- Estado visual/AX após o upload: `Fotos do produto (0 / 1)` e mensagem `Failed to fetch`.
- A chamada foi rejeitada no cliente sem resposta HTTP observável; nenhum erro correspondente
  apareceu no console do navegador. A camada causadora ainda não foi isolada.

Critério de aceite:

- [ ] Isolar em qual camada a requisição falha e corrigir a causa em staging.
- [ ] Exibir erro acionável em português quando a infraestrutura falhar.
- [ ] Retestar produto, logotipo e banner com JPEG, PNG e WebP válidos.

### QA-009 — WhatsApp salvo não hidrata no formulário

- Severidade: `P2`
- Tipo: `funcional | usabilidade`
- Status: `confirmado`
- Ambiente/deploy: `STG-2026-11-08-01`
- Data/hora da observação: `2026-11-08T12:42:00-03:00`
- Página/fluxo: `/admin/settings`
- Plano e sessão: Free e trial Profissional autenticados
- Viewport/navegador: 390 x 844 px, navegador interno

Esperado: o campo “WhatsApp de atendimento” carrega o número salvo durante o onboarding.

Atual: o campo aparece vazio em Free e continua vazio após ativar o trial. A mesma resposta RSC
serializa `store.whatsapp` preenchido, e a vitrine pública gera o link `wa.me` com esse número.
Como o schema exige WhatsApp válido, há risco de o campo vazio impedir outras alterações; esse
efeito não foi submetido para evitar uma mutação acidental do número público.

Passos:

1. Concluir o onboarding com um WhatsApp válido.
2. Confirmar que a vitrine pública oferece “Conversar com a loja”.
3. Abrir `/admin/settings` e observar o campo de WhatsApp.
4. Recarregar a página e repetir após ativar o trial Profissional.

Evidência:

- DOM do input: `value` e `defaultValue` vazios.
- Estado RSC da mesma página: `store.whatsapp` preenchido; o valor não chegou ao controle.

Critério de aceite:

- [ ] Hidratar o valor formatado sem divergência entre servidor e React Hook Form.
- [ ] Salvar nome, personalização ou agrupamento sem exigir redigitação do telefone.
- [ ] Adicionar regressão para carregamento e salvamento parcial das configurações.

### QA-010 — Checkout diverge da marca e do nome do plano

- Severidade: `P3`
- Tipo: `billing | usabilidade | conversão`
- Status: `confirmado`
- Ambiente/deploy: `STG-2026-11-08-01`
- Data/hora da observação: `2026-11-08T12:43:00-03:00`
- Página/fluxo: `/admin/billing`, upgrade Free para Essencial
- Plano e sessão: Free autenticado; Stripe test mode
- Viewport/navegador: desktop, navegador interno

Esperado: checkout identifica “Tua Vitrine” e o plano “Essencial”, mantendo a mesma oferta de
R$ 19/mês apresentada no painel.

Atual: o valor está correto e a sessão usa `cs_test`/`pk_test`, mas o checkout mostra um nome
pessoal como recebedor, em vez da marca, e o produto “Tua Vitrine Basic”. A divergência aparece
antes da entrada de qualquer dado de pagamento.

Passos:

1. Abrir `/admin/billing` com uma loja Free.
2. Selecionar “Fazer upgrade” no card Essencial.
3. Verificar cabeçalho, nome do produto, valor e modo da sessão Stripe.
4. Voltar sem preencher ou confirmar o pagamento.

Evidência:

- Checkout de teste: `Assinar Tua Vitrine Basic`, recebedor identificado por nome pessoal em vez da
  marca e `R$ 19,00 por mês`.

Critério de aceite:

- [ ] Configurar branding público da Stripe como “Tua Vitrine”.
- [ ] Renomear produto/preço do plano para “Essencial”.
- [ ] Retestar checkout Essencial e Profissional em test mode.

### QA-011 — Modal perde foco e busca não tem nome acessível

- Severidade: `P3`
- Tipo: `acessibilidade | usabilidade`
- Status: `confirmado`
- Ambiente/deploy: `STG-2026-11-08-01`
- Data/hora da observação: `2026-11-08T12:45:00-03:00`
- Página/fluxo: `/admin/products`, “Gerenciar vitrine”
- Plano e sessão: trial Profissional autenticado
- Viewport/navegador: 390 x 844 px, teclado e árvore de acessibilidade

Esperado: a busca tem nome acessível e, ao fechar o dialog por `Esc`, o foco retorna ao botão
“Gerenciar vitrine”.

Atual: o campo é anunciado apenas como `text field`, sem `label`, `aria-label` ou
`aria-labelledby`. Ao fechar por `Esc`, o foco vai para a raiz da página em vez de retornar ao
gatilho. Checkbox e botão de publicação continuam alcançáveis por `Tab`.

Passos:

1. Em 390 x 844 px, abrir `/admin/products` e selecionar “Gerenciar vitrine”.
2. Navegar pelo modal usando `Tab` e observar o nome anunciado para a busca.
3. Pressionar `Esc` e verificar o elemento focado.

Evidência:

- DOM da busca: somente `placeholder="Buscar produto"`, sem associação a um nome acessível.
- Estado AX após fechar: foco em `AXWebArea`, não no botão que abriu o modal.

Critério de aceite:

- [ ] Adicionar nome acessível persistente à busca.
- [ ] Restaurar o foco ao gatilho tanto pelo botão de fechar quanto por `Esc`.
- [ ] Retestar teclado e leitor de tela em 390 px e desktop.

### QA-012 — Senha tem rótulo incorreto e não pode ser revelada

- Severidade: `P3`
- Tipo: `conteúdo | usabilidade | acessibilidade`
- Status: `confirmado`
- Ambiente/deploy: `STG-2026-11-08-01`
- Data/hora da observação: `2026-11-08T13:00:00-03:00`
- Página/fluxo: `/cadastro?plano=free`
- Plano e sessão: visitante
- Viewport/navegador: 390 x 844 px, navegador interno

Esperado: no primeiro cadastro, o campo é chamado “Senha” e permite revelar/ocultar o valor sem
perder o texto ou o foco.

Atual: o rótulo é “Nova senha”, linguagem própria de redefinição, e os campos de senha e
confirmação permanecem fixos em `type=password`, sem controle de visualização.

Evidência:

- Árvore de acessibilidade: `Nova senha` e `Confirme a senha`, sem botão para mostrar ou ocultar.
- DOM: ambos os inputs usam `type=password`; o único botão do formulário é “Criar conta”.

Critério de aceite:

- [ ] Alterar o rótulo para “Senha” no cadastro, sem afetar recuperação/redefinição.
- [ ] Adicionar controle acessível de mostrar/ocultar, com estado inicial oculto.
- [ ] Preservar valor e foco ao alternar; usar nome acessível que reflita a próxima ação.
- [ ] Retestar teclado e 390 px.

### QA-013 — Slug deixa de acompanhar o nome após redirecionamento

- Severidade: `P2`
- Tipo: `funcional | usabilidade | consistência`
- Status: `em investigação`
- Ambiente/deploy: `STG-2026-11-08-01`
- Data/hora do relato: `2026-11-08T13:00:00-03:00`
- Página/fluxo: onboarding da loja → redirecionamento para o admin/configurações
- Plano e sessão: nova conta autenticada
- Viewport/navegador: relatado em teste exploratório externo

Esperado: enquanto o slug ainda for derivado automaticamente e não tiver sido editado pelo
usuário, alterar o nome da loja mantém o slug sincronizado mesmo após a transição de etapa/tela.

Atual relatado: o slug acompanha o nome na primeira etapa, mas a sincronização para após avançar e
ser redirecionado ao admin. A causa e a tela exata de destino ainda precisam de confirmação no código
e em um novo cadastro.

Critério de aceite:

- [ ] Definir uma única regra de derivação para onboarding e configurações.
- [ ] Continuar sincronizando enquanto o slug estiver intocado/derivado do nome anterior.
- [ ] Nunca sobrescrever um slug alterado manualmente.
- [ ] Adicionar regressão para a transição entre etapas e retestar com nova conta.

### QA-014 — Controles recorrentes têm alvos táteis pequenos

- Severidade: `P3`
- Tipo: `usabilidade | acessibilidade | responsividade`
- Status: `confirmado`
- Ambiente/deploy: `STG-2026-11-08-01`
- Data/hora da observação: `2026-11-08T13:00:00-03:00`
- Página/fluxo: shell, cadastro, produtos, estatísticas, configurações e billing
- Plano e sessão: visitante e trial Profissional autenticado
- Viewport/navegador: 390 x 844 px, navegador interno

Esperado: ações primárias e controles usados com frequência oferecem alvo tátil confortável,
idealmente 44 px, sem exigir precisão fina.

Atual: botões e inputs recorrentes medem 32 ou 36 px de altura. Isso inclui sair/prévia, criar
conta, gerenciar/importar/adicionar produto, filtros, datas, aplicar período, salvar configurações e
trocar plano.

Evidência:

- Atalhos de período em Estatísticas: 32 px.
- Inputs e ações principais observados nas telas auditadas: 36 px.
- Em Minha vitrine, o botão Salvar aparece somente depois de aproximadamente 1.770 px de conteúdo
  abaixo do começo do formulário, agravando o custo da ação no mobile.

Critério de aceite:

- [ ] Padronizar controles interativos móveis relevantes com alvo de pelo menos 44 px.
- [ ] Preservar densidade atual no desktop quando apropriado.
- [ ] Avaliar barra de ação persistente para formulários longos, especialmente Minha vitrine.
- [ ] Retestar toque, teclado e 390 px.

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
