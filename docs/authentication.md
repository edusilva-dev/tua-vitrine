# Contas de lojistas e autorização

## Fluxo

Better Auth 1.7.5 gerencia credenciais, confirmação de e-mail, sessões persistidas no PostgreSQL e recuperação. Cadastro exige senha de 6–128 caracteres. A conta só acessa o painel depois de confirmar o e-mail. Recuperação usa link temporário e revoga sessões existentes ao trocar a senha. A resposta da solicitação de recuperação é genérica.

As telas são `/cadastro`, `/entrar`, `/verificar-email`, `/recuperar-senha` e `/redefinir-senha`. Clientes das vitrines continuam anônimos e não precisam criar conta.

A API fica no Route Handler curinga `app/api/auth/[...all]/route.ts`. Better Auth resolve os métodos abaixo no servidor; o cliente React não armazena senha nem token de sessão:

- `POST /api/auth/sign-up/email`
- `POST /api/auth/sign-in/email`
- `POST /api/auth/sign-out`
- `GET /api/auth/get-session`
- `GET /api/auth/verify-email`
- `POST /api/auth/send-verification-email`
- `POST /api/auth/request-password-reset`
- `POST /api/auth/reset-password`

Em `AUTH_MODE=local` esses endpoints retornam 404 de propósito. Use `AUTH_MODE=session` para ativar contas e autorização.

`StoreMember` vincula usuário à loja. Nesta versão somente OWNER existe. O servidor calcula o contexto pela sessão; o cookie `tv-store` apenas seleciona entre lojas autorizadas. Seleção inválida retorna 404, nunca uma loja de outro usuário. Login, logout e confirmação limpam a seleção anterior. Criação da loja e vínculo ocorrem na mesma operação transacional. Nenhum endpoint público permite atribuir proprietários.

## Experimentar localmente

1. Use Bun 1.3.14, instale com lock congelado e execute `bun run db:generate` e `bun run db:deploy`.
2. Configure `.env.local`: `AUTH_MODE=session`, `LOCAL_ONLY=true`, `APP_ENV=development`, `APP_URL=http://localhost:3000`.
3. Gere `BETTER_AUTH_SECRET` com `bun -e 'process.stdout.write(require("node:crypto").randomBytes(32).toString("hex"))'` e armazene somente no ambiente privado.
4. Use `MAIL_TRANSPORT=file` e `MAIL_OUTBOX_DIR=./work/mail-outbox`. Execute `bun run dev` e abra `/cadastro`.
5. Em desenvolvimento, os e-mails são JSON nesse diretório (permissão 0600); abra localmente o link do e-mail da conta criada. Não há endpoint que exponha essa caixa. Não versionar, publicar ou compartilhar esses arquivos: contêm links de acesso temporário.

`AUTH_MODE=local` mantém o protótipo existente somente em localhost, sem contas. Esse modo é recusado em staging e produção. A migração não reivindica lojas existentes automaticamente. Para associar uma loja antiga a uma conta já verificada, o operador executa `bun run store:assign-owner SLUG EMAIL` para conferir e acrescenta `--apply` para efetivar. O comando não transfere lojas com outro proprietário.

## Staging e produção

Exigem `AUTH_MODE=session`, `LOCAL_ONLY=false`, `APP_URL` HTTPS, segredo forte e único por ambiente, `MAIL_TRANSPORT=smtp`, `MAIL_FROM`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER` e `SMTP_PASSWORD`. SMTP usa TLS obrigatório. Nunca usar o segredo público dos testes. Antes de liberar clientes, validar entrega de confirmação/recuperação no domínio real, restauração de backup e operação do provedor escolhido.

Limites de autenticação são armazenados no PostgreSQL. Better Auth identifica IP pelos cabeçalhos encaminhados; o proxy de produção deve sobrescrever cabeçalhos de IP e impedir acesso direto ao processo Next. A configuração desse proxy e os limites de borda continuam sendo parte obrigatória da implantação. Os limites das métricas públicas ainda são locais ao processo.

E-mails são enviados após a resposta pelo ciclo de vida `after()` do Next. Falhas geram log sem conteúdo do e-mail/token; a interface permite novo envio. Ainda não há fila durável de entrega. O modo arquivo é proibido fora de localhost.

## Referências

- [Integração Next.js](https://better-auth.com/docs/integrations/next)
- [E-mail, senha e recuperação](https://better-auth.com/docs/authentication/email-password)
- [Prisma](https://better-auth.com/docs/adapters/prisma)

## ADR 006 — Biblioteca de autenticação e adoção das lojas

Usamos biblioteca de autenticação, evitando implementar hashing de senhas, assinatura de cookies ou tokens de recuperação no domínio do catálogo. Sessões autenticadas são separadas de `AnonymousSession`, que permanece exclusivamente analítica. A camada HTTP resolve a identidade e verifica autorização antes dos services existentes. Não há cache de autorização entre requisições.

Lojas antigas ficam sem vínculo até atribuição explícita por operador. Usar slug/nome para reivindicar uma loja permitiria tomar posse de um cadastro alheio; por isso retry de onboarding só recupera rascunho que já pertence ao usuário. Não há convites, equipe ou transferência de propriedade nesta etapa.

A migração adiciona tabelas sem remover a FK manual `Store_logo_same_store`. Diffs automáticos Prisma sugerem removê-la por ela não estar representada no schema; revisar e preservar essa constraint em futuras migrações.
