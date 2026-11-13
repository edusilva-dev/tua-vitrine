# Campanha de QA do produto

Este diretório organiza o QA pré-lançamento da Tua Vitrine. O objetivo é validar o produto real em
staging, página por página e fluxo por fluxo, cobrindo correção funcional, usabilidade,
responsividade, acessibilidade e integrações externas.

## Documentos

- [Público e autenticação](./public-and-auth.md)
- [Onboarding e administração](./onboarding-and-admin.md)
- [Catálogo e vitrine](./catalog-and-storefront.md)
- [Integrações e operação](./integrations-and-operations.md)
- [Registro de achados](./findings.md)

## Estratégia

1. Executar os checks locais e registrar a baseline.
2. Confirmar que Vercel, Neon, R2, Stripe e Resend pertencem ao ambiente de staging.
3. Fazer smoke read-only da landing, health checks, assets e vitrine existente.
4. Limpar somente os dados de teste do staging após conferir projeto, branch e escopo.
5. Criar uma conta descartável e percorrer autenticação, onboarding e primeiro produto.
6. Validar cada página administrativa em desktop e 390 px.
7. Validar a vitrine como comprador anônimo, incluindo favoritos, carrinho e WhatsApp.
8. Exercitar integrações e cenários destrutivos por último.

Correções não são feitas durante a exploração. Cada achado aceito vira uma tarefa delimitada com
regressão, revisão independente e evidência de validação.

## Ambientes e dados

- Nunca executar Playwright contra o Neon compartilhado de staging. Os fixtures removem registros.
- Usar identidade descartável por rodada, referenciada como `QA_EMAIL`; não registrar e-mail real.
- Usar slug prefixado com `qa-` e timestamp para localizar e remover os dados da rodada.
- Confirmar visualmente projeto e branch antes de qualquer limpeza no Neon.
- Fazer backup ou criar branch de restauração antes de limpeza ampla.
- Não usar seed, migração destrutiva ou scripts com `--apply` sem revisar o dry-run.
- Confirmar Stripe em test mode, bucket R2 e domínio de e-mail exclusivos de staging.
- Registrar IDs criados na rodada; preferir limpeza seletiva a truncar tabelas.

## Matriz mínima

| Dimensão | Variações obrigatórias |
| --- | --- |
| Viewport | Desktop atual e 390 x 844 px |
| Entrada | Mouse/toque, teclado e leitor de tela nos fluxos críticos |
| Rede | Normal, lenta, falha e dupla submissão |
| Dados | Vazio, mínimo, limite, texto longo, imagem ausente e dados inválidos |
| Planos | Free, Essencial, Profissional, trial, downgrade e inadimplência |
| Sessão | Anônimo, e-mail não verificado, autenticado, sessão expirada e outra loja |

Também validar zoom de 200%, contraste das cores personalizadas, foco após navegação/modal e
ausência de overflow horizontal.

## Estados e severidade

- `Não iniciado`: cenário ainda não executado.
- `Passou`: resultado esperado observado com evidência.
- `Falhou`: defeito reproduzível registrado em `findings.md`.
- `Bloqueado`: dependência externa ou dado impede a execução.
- `Não aplicável`: cenário incompatível com o ambiente ou plano, com justificativa.

| Severidade | Critério |
| --- | --- |
| P0 | Perda/exposição de dados, quebra de isolamento, cobrança indevida ou indisponibilidade total |
| P1 | Cadastro, publicação, compra por WhatsApp ou billing não conclui |
| P2 | Função importante falha, acessibilidade crítica ou UX com alto abandono |
| P3 | Problema visual, texto, consistência ou melhoria de baixo impacto |

## Evidência por cenário

Registrar data/hora, ambiente/deploy, viewport, plano, passos, resultado esperado, resultado real e
evidência. Não anexar tokens, cookies, payloads pessoais, conteúdo de e-mails ou dados financeiros.

## Cobertura automatizada atual

| Área | Situação resumida |
| --- | --- |
| Auth e tenant | Forte em local; falta domínio real, Resend e cookies de staging |
| Catálogo, planos e importação | Backend forte; faltam E2E dos fluxos de UI |
| Storage | Boa limpeza; falta upload HTTP/Sharp/R2 ponta a ponta |
| Vitrine e feedback | E2E parcial; falta WhatsApp real e falha analítica |
| Métricas | Regras cobertas; falta dashboard, filtros e timezone em E2E |
| Billing | Maior lacuna: checkout, portal, webhook, duplicidade e falha de pagamento |
| Suporte | Apenas contrato; falta serviço e entrega real |

## Baseline da campanha

- [ ] `bun run lint`
- [ ] `bun run typecheck`
- [ ] `bun test`
- [ ] `bun run test:e2e`
- [ ] `bun run test:auth`
- [ ] `bun run build`
- [ ] `git diff --check`
- [ ] Health live/ready em staging
- [ ] Deploy e commit de staging registrados
