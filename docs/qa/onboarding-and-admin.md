# QA — onboarding e administração

Aplicar todos os cenários em desktop e 390 px, com teclado nos fluxos críticos.

## `/admin/onboarding`

- [ ] Etapa 1 cria nome/slug; slug duplicado e inválido têm erro útil.
- [ ] Etapa 2 normaliza WhatsApp com DDI e permite voltar sem perder dados.
- [ ] Etapa 3 cria o primeiro produto e conclui o onboarding.
- [ ] Refresh/retorno retoma `onboardingStep` correto.
- [ ] `?new=1` cria outra loja sem reutilizar dados indevidos.
- [ ] Free limita a uma imagem; planos pagos aceitam até cinco.
- [ ] Entrada pelo Free permanece Free e não preenche/inicia trial ao criar o primeiro produto.
- [ ] Entrada pelo Essencial/Profissional inicia um único trial Profissional de 14 dias.
- [ ] Trial expira após 14 dias e não reinicia ao refazer onboarding ou criar outro produto.
- [ ] Troca de etapa move foco e anuncia erros.
- [ ] Indicador de passos, prefixo de slug e submit sticky cabem em 390 px.

## Shell administrativo

- [ ] Sidebar desktop e navegação horizontal mobile têm `aria-current` e foco visível.
- [ ] Menu mobile não esconde destinos nem cria overflow da página.
- [ ] Nome longo de loja não quebra layout.
- [ ] Banner de onboarding incompleto aponta para a etapa correta.
- [ ] Preview e logout funcionam; erro de logout não deixa UI inconsistente.
- [ ] Loading administrativo é anunciado.

## `/admin` — visão geral

- [ ] Cards e rankings refletem métricas conhecidas.
- [ ] Estados vazios explicam como gerar dados.
- [ ] Preview não incrementa métricas.
- [ ] Trial inicia uma vez, mostra datas/dias corretos e resiste a duplo clique.
- [ ] Falha ao ativar trial preserva estado e oferece nova tentativa.

## `/admin/metrics`

- [ ] Período padrão e atalhos 7/30 dias/mês produzem URL e dados corretos.
- [ ] Free não consulta além de sete dias e exibe contexto de upgrade.
- [ ] Query e datas inválidas apresentam erro recuperável.
- [ ] Back/forward restaura filtro e gráfico.
- [ ] Timezone, virada do dia e crescimento zero/infinito são coerentes.
- [ ] Gráfico oferece alternativa acessível a hover/tooltip.

## `/admin/promotions`

- [ ] Free/Essencial veem bloqueio e caminho claro de upgrade.
- [ ] Profissional cria, ativa, desativa e edita campanha.
- [ ] Título, CTA, descrição, banner e seleção de produtos persistem.
- [ ] Campanha sem produtos/banner tem estado compreensível.
- [ ] Textos longos e cores personalizadas mantêm legibilidade.

## `/admin/billing`

- [ ] Plano, trial, renovação, cancelamento e inadimplência aparecem corretamente.
- [ ] Checkout, cancelamento e retorno não criam assinatura duplicada.
- [ ] Estado “pagamento recebido, confirmação pendente” se resolve após webhook.
- [ ] Upgrade, downgrade e reativação respeitam entitlements.
- [ ] Downgrade explica/resetta personalização e exige seleção de publicados quando necessário.
- [ ] Portal Stripe abre a conta correta em test mode.
- [ ] Estados `past_due`, `unpaid`, `incomplete` e `paused` são acionáveis.

## `/admin/settings`

- [ ] Nome, tagline e WhatsApp salvam com validação e preservação em erro.
- [ ] Logo aceita JPEG/PNG/WebP válido, rejeita inválido/grande e remove com confirmação.
- [ ] Cor, template e agrupamento obedecem ao plano.
- [ ] Cores claras/escuras mantêm contraste WCAG na vitrine.
- [ ] Ordem de categorias funciona por teclado e é anunciada.
- [ ] Copiar link tem fallback; QR baixa e decodifica para o domínio publicado.

## `/admin/support`

- [ ] Categoria, assunto, mensagem e contador validam corretamente.
- [ ] Falha de envio preserva todo o formulário.
- [ ] Canal não configurado apresenta estado claro.
- [ ] Feedback da plataforma aceita tipo, nota e comentário.
- [ ] Resumo de clientes mostra total/média/distribuição e estado vazio.
- [ ] Controles de nota funcionam por teclado e leitor de tela.

## `/admin/preview`

- [ ] Faixa de preview e retorno ao painel são sempre visíveis.
- [ ] Busca, filtros, paginação, favorito, detalhe e carrinho não geram métricas.
- [ ] Feedback público fica oculto.
- [ ] Links internos permanecem no preview quando aplicável.
