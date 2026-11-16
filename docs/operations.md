# Operação e recuperação

## Ambientes

| Recurso | Local e testes | Produção |
| --- | --- | --- |
| Aplicação | Bun no WSL | Vercel |
| PostgreSQL | Compose em localhost:55432 | Neon |
| Imagens | filesystem local automático | Cloudflare R2 público com URL direta |
| E-mail | arquivo local | Resend |
| Cobrança | desabilitada ou Stripe test | Stripe |

Arquivos .env reais nunca são versionados. .env.example documenta o ambiente local e
.env.vercel.example documenta as variáveis da Vercel. Nenhuma credencial pode chegar ao cliente.

## Saúde e deploy

- /api/health/live confirma que o processo responde.
- /api/health/ready confirma acesso ao banco.
- Antes de compilar cada deploy, a Vercel executa bun run vercel-build; esse comando aplica
  bun run db:deploy com a conexão direta do Neon e só então gera o build da aplicação.
- migrate dev, db push e o seed demonstrativo não devem rodar em produção.
- Prefira migrações compatíveis com a versão anterior; reverter um deployment não reverte o schema.

Depois de cada deploy, valide cadastro, confirmação de e-mail, login, painel, upload de imagem,
vitrine pública, checkout e portal de cobrança. Consulte os logs da Vercel para falhas de runtime.

## Backup e restauração

O Neon é a fonte do catálogo e o Cloudflare R2 é a fonte das imagens. A política de recuperação deve
cobrir os dois serviços:

1. confirme a retenção e o point-in-time restore do branch de produção no Neon;
2. mantenha inventário dos objetos do R2 e uma rotina de exportação independente;
3. ensaie a restauração em um branch Neon e ambiente Vercel separados;
4. valide contagens, variantes, campanhas e renderização das imagens antes de considerar o ensaio
   concluído.

Nunca teste restauração sobre o branch de produção. Antes de uma migração destrutiva, crie um ponto de
recuperação e registre o procedimento de rollback.
## Retenção da auditoria administrativa

Os eventos de auditoria do Super Admin são imutáveis pela aplicação e devem ser mantidos por, no
mínimo, 24 meses. Não existe limpeza automática nesta sprint. Qualquer política futura de expurgo
deve preservar esse prazo, ser executada por uma rotina interna controlada e registrar a quantidade
e o intervalo removidos fora da própria tabela de auditoria.

## Operação do Super Admin

O acesso ao Super Admin é uma concessão explícita e não depende de associação com lojas. O usuário
precisa existir e ter o e-mail verificado. Execute os comandos somente com a conexão do ambiente que
deve ser alterado:

```bash
bun run platform-admin grant usuario@exemplo.com
bun run platform-admin revoke usuario@exemplo.com
```

Depois de conceder, confirme `GET /api/super-admin/session` com a sessão do usuário e verifique se a
área `/super-admin` abre. Depois de revogar, a mesma sessão deve receber `404` nas APIs internas e a
página não pode renderizar informações operacionais. Nunca conceda acesso por e-mail, domínio,
associação de loja ou alteração manual de cookie.

### Conta comprometida

1. revogue imediatamente o acesso com `platform-admin revoke` no ambiente afetado;
2. encerre as sessões do usuário e solicite redefinição de senha;
3. filtre a auditoria pelo administrador e pelo período suspeito;
4. confira bloqueios, publicação, concessões de plano, suporte e reconciliações executadas;
5. corrija cada estado por uma nova ação auditada; não edite ou apague eventos anteriores;
6. conceda novamente somente após confirmar a identidade e a segurança da conta.

### Reconciliação de assinatura

Use **Reconciliar assinatura** somente quando o estado local divergir do Dashboard da Stripe. Registre
um motivo objetivo, confirme a ação e confira o evento de sucesso ou falha na auditoria. A operação
consulta a Stripe e reaplica a regra dos webhooks; reembolso, troca manual e edição de pagamento
continuam no Dashboard da Stripe. Em falha remota, preserve o estado local e tente novamente depois
de confirmar as chaves e o ambiente da Stripe.

### Falha de notificação de suporte

Uma falha do Resend não apaga o chamado. Filtre **Suporte** pelos registros com falha, abra o chamado
e responda pelo endereço do lojista quando necessário. Confirme domínio, remetente e logs do Resend
antes de corrigir a configuração. Ao alterar estado ou nota interna, informe o motivo e confirme a
ação; a mensagem e a nota não são copiadas para a auditoria.

### Rollout e smoke test

Libere primeiro em preview/test e staging. Para cada ambiente:

1. confirme as migrações e a variável que habilita a autenticação;
2. conceda acesso a um administrador de teste e entre com uma sessão real;
3. busque uma loja, abra o detalhe, suporte e auditoria;
4. execute uma ação reversível com motivo e confirmação;
5. confira a alteração no banco e o evento correspondente na auditoria;
6. revogue o administrador e confirme o bloqueio imediato da sessão existente;
7. valide a interface em 390 px e desktop, sem rolagem horizontal.

Produção só deve ser habilitada após `bun run check`, build, Playwright do Super Admin e esse smoke
test passarem. Reverta o deployment se páginas ou APIs internas permitirem acesso sem concessão, se
uma mutação não gerar auditoria ou se uma operação deixar estado parcial.
