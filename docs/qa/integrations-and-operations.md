# QA — integrações e operação

## Preflight de staging

- [ ] Domínio aponta para o projeto e deployment esperados na Vercel.
- [ ] Commit, branch, horário e status do deployment são registrados.
- [ ] `live` e `ready` respondem com sucesso e sem detalhes sensíveis.
- [ ] Neon mostra projeto/branch de staging e existe caminho de restauração.
- [ ] R2 usa bucket/prefixo de staging e URL pública esperada.
- [ ] Stripe está em test mode com webhook de staging.
- [ ] Resend usa remetente/domínio e destinatários de teste.
- [ ] Variáveis de ambiente não apontam para produção.

## Limpeza de dados

Antes de apagar qualquer dado, registrar projeto, branch, horário, tabelas/IDs e mecanismo de
restauração. A limpeza ampla é uma exceção; preferir registros com prefixo `qa-` criados pela
campanha.

- [ ] Export/branch de restauração criado.
- [ ] Sessões e contas de QA identificadas.
- [ ] Lojas, memberships, produtos, categorias, assets, eventos e feedbacks relacionados listados.
- [ ] Referências e ordem de exclusão revisadas contra o schema Prisma.
- [ ] Objetos R2 órfãos identificados em dry-run.
- [ ] Operação destrutiva confirmada imediatamente antes da execução.
- [ ] Contagens pós-limpeza e health checks registrados.

Não executar `db push`, seed, migração destrutiva, `rateLimit.deleteMany()` global nem fixtures E2E
contra staging.

## Vercel e observabilidade mínima de lançamento

- [ ] Deploy sem erro e domínio com TLS válido.
- [ ] Logs de cada fluxo crítico correlacionáveis sem payload sensível.
- [ ] Erros 4xx esperados não viram ruído crítico; 5xx têm contexto suficiente.
- [ ] Timeout/retry de integrações não duplica mutações.
- [ ] Health checks não dependem de serviços externos desnecessários.

Observabilidade completa pode evoluir após o lançamento, mas health, logs estruturados, alerta de
indisponibilidade e rastreabilidade de cobrança são critérios mínimos.

## R2 e imagens

- [ ] Upload real valida conteúdo com Sharp e converte para WebP.
- [ ] URL pública abre sem passar por `/api/assets`.
- [ ] Exclusão remove relação e só apaga objeto sem outro uso.
- [ ] Logo, banner e imagens compartilhadas permanecem protegidos.
- [ ] Falha/retry de remoção não corrompe o banco.
- [ ] `assets:check-r2` é usado apenas no bucket isolado e limpa seu objeto de sonda.

## Stripe

- [ ] Checkout Free→pago e upgrade entre pagos.
- [ ] Cancelamento do checkout não altera plano.
- [ ] Webhook rejeita assinatura inválida e aceita evento válido uma vez.
- [ ] Eventos duplicados e fora de ordem são idempotentes.
- [ ] Renovação, falha de pagamento, cancelamento e reativação sincronizam entitlements.
- [ ] Portal usa customer correto e volta ao staging.
- [ ] Nenhum cartão real é usado; apenas números de teste oficiais.

## Resend e suporte

- [ ] Confirmação e recuperação chegam com links de staging.
- [ ] Falha de e-mail não expõe conta nem conteúdo em logs.
- [ ] Solicitação de suporte chega ao destino correto sem duplicação.
- [ ] Rate limit e indisponibilidade preservam o formulário.

## WhatsApp e métricas

- [ ] Abertura real do WhatsApp usa o número de staging.
- [ ] A mensagem não contém dado de outro tenant.
- [ ] Falha de evento analítico não bloqueia a conversão.
- [ ] Retentativas não inflam visitas, visualizações ou likes.

## Encerramento da rodada

- [ ] Achados triados e vinculados à página/cenário.
- [ ] Evidências sem dados sensíveis.
- [ ] Dados `qa-` removidos seletivamente.
- [ ] Objetos R2 descartáveis removidos.
- [ ] Contas/sessões de QA encerradas conforme necessidade.
- [ ] Staging retorna ao estado saudável.

