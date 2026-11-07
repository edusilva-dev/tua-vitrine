# QA — catálogo e vitrine

## `/admin/products` — listagem

- [ ] Vazio inicial difere de busca/filtro sem resultado.
- [ ] Busca, categoria, paginação e back/forward mantêm estado.
- [ ] Cards representam rascunho/publicado, disponível/indisponível, desconto e variantes.
- [ ] Seleção da página e exclusão em lote não afetam itens fora do escopo.
- [ ] Exclusão individual/em lote usa AlertDialog e recupera falha parcial.
- [ ] Textos longos, fallback de imagem e 390 px não causam overflow.

## Criar/editar produto

- [ ] Nome, descrição, preço em centavos, desconto e categoria validam no servidor.
- [ ] Disponibilidade e publicação têm significados distintos.
- [ ] Dialog preserva formulário em erro e avisa antes de descartar alterações.
- [ ] JPEG/PNG/WebP passam por validação/conversão; demais formatos e >5 MB falham.
- [ ] Upload/remover/trocar imagem mantém assets compartilhados protegidos.
- [ ] Variantes aceitam apenas combinações cadastradas, sem duplicidade.
- [ ] Duplo submit/concorrência não ultrapassa limites 10/50/1.000.
- [ ] Limite de imagens é 1 no Free e 5 nos planos pagos.

## Publicação e downgrade

- [ ] Dialog lista produtos e informa limite do plano.
- [ ] Publicação em lote é atômica e não excede entitlement.
- [ ] Downgrade acima do limite obriga seleção antes de concluir.
- [ ] Lista vazia e falha de salvamento têm mensagem explícita.

## Importação

- [ ] Free vê recurso bloqueado; planos pagos baixam o modelo correto.
- [ ] Apenas `.xlsx` válido avança.
- [ ] Preview separa linhas válidas/inválidas e explica cada erro.
- [ ] Relatório CSV abre com acentos e colunas corretas.
- [ ] Confirmação é idempotente e respeita limites/concorrência.
- [ ] Fechar/reabrir não confirma importação acidentalmente.
- [ ] Tabela permanece utilizável em 390 px.

## `/{slug}` — entrada e catálogo

- [ ] Loja ativa carrega; inexistente/inativa retorna 404 sem dados.
- [ ] Marca, tagline, logo, cores, template e agrupamento refletem configurações.
- [ ] Free exibe branding obrigatório.
- [ ] Campanha ativa respeita entitlement e alterna seleção/todos os produtos.
- [ ] Busca com debounce, filtros, limpar, paginação e URL funcionam juntos.
- [ ] Catálogo vazio e busca vazia têm ações úteis.
- [ ] Grade/lista, seções, nomes longos e imagens ausentes funcionam em 390 px.

## Detalhe, favoritos e carrinho

- [ ] Dialog restaura foco, fecha por ESC e permanece utilizável com teclado virtual.
- [ ] Galeria, preço, desconto e disponibilidade refletem o servidor.
- [ ] Variante obrigatória bloqueia compra até seleção válida.
- [ ] Quantidade fica entre 1 e 99.
- [ ] Favoritos são isolados pela chave versionada da loja e persistem localmente.
- [ ] localStorage bloqueado degrada com aviso, sem travar a compra.
- [ ] Carrinho revalida preço/disponibilidade e explica itens alterados.
- [ ] Limites de 100 linhas e 99 unidades são aplicados.
- [ ] Mudanças em outra aba não corrompem favoritos/carrinho.

## WhatsApp, métricas e feedback

- [ ] Mensagem contém loja, itens, variantes, quantidades, subtotal e link corretos.
- [ ] Destino usa o WhatsApp configurado e abre aplicativo/web esperado.
- [ ] Falha analítica não bloqueia a abertura do WhatsApp.
- [ ] Preview nunca registra visita, visualização ou curtida.
- [ ] Visitas/visualizações/likes públicos são idempotentes conforme contrato.
- [ ] Feedback geral e de busca vazia envia motivo, nota e comentário.
- [ ] Rate limit/erro de feedback preserva contexto e não coleta dado pessoal.
