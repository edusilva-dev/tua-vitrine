# Deploy na Vercel com Neon

Esta é a referência oficial de produção. A Vercel instala com Bun a partir do bun.lock; as
funções Next.js executam no runtime Node.js gerenciado da plataforma.

## Cobrança

A produção só inicia com `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`,
`STRIPE_PRICE_BASIC_MONTHLY` e `STRIPE_PRICE_PRO_MONTHLY` configuradas.

Os segredos devem ser variáveis Sensitive na Vercel. Prefira uma chave restrita com somente as
permissões necessárias para Customers, Checkout Sessions, Billing Portal e Subscriptions.

No Dashboard da Stripe, cadastre um endpoint de webhook para cada modo usado pelo ambiente:

```text
https://usetuavitrine.com.br/api/webhooks/stripe
```

Staging usa outro endpoint e outro `STRIPE_WEBHOOK_SECRET`, limitado à branch `staging`. Como os
previews são protegidos pela Vercel, a URL deve incluir um segredo de **Protection Bypass for
Automation** criado exclusivamente para a Stripe:

```text
https://staging.usetuavitrine.com.br/api/webhooks/stripe?x-vercel-protection-bypass=SEGREDO
```

Nunca reutilize o segredo de assinatura do webhook de produção em staging. Quando produção migrar
para o modo live da Stripe, mantenha staging no modo de teste com preços e endpoint próprios.

Assine os eventos `customer.subscription.*`, `checkout.session.completed`,
`checkout.session.async_payment_succeeded`, `invoice.paid` e `invoice.payment_failed`. O valor de
`STRIPE_WEBHOOK_SECRET` deve ser o segredo `whsec_...` desse endpoint no mesmo modo das chaves e dos
preços configurados. Enquanto produção usar dados de teste, o endpoint e o segredo também precisam
pertencer ao modo de teste.

O retorno do Checkout inclui o identificador da sessão e reconcilia a assinatura imediatamente.
Isso evita manter a loja no plano Free quando a entrega do webhook atrasar, mas não substitui o
webhook: renovações, cancelamentos e falhas de cobrança chegam de forma assíncrona.

## 1. Preparar o Neon

No painel do Neon, copie duas conexões do mesmo banco e branch:

- `DATABASE_URL`: conexão com pooling; o hostname contém `-pooler`;
- `DATABASE_URL_UNPOOLED`: conexão direta, sem `-pooler`, usada exclusivamente pelo operador ou CI
  de migrações.

As duas URLs precisam de TLS (`sslmode=require`). O runtime limita automaticamente o pool a uma
conexão por instância na Vercel. Não cadastre a URL direta na Vercel quando a
plataforma não executa migrações; mantenha-a num secret do CI ou no ambiente seguro do operador.
O pool é registrado com o ciclo de vida do Fluid Compute pela integração `@vercel/functions`.

Antes do primeiro deploy, aplique as migrações a partir de um ambiente confiável:

```sh
DATABASE_URL='URL_POOLED' DATABASE_URL_UNPOOLED='URL_DIRETA' bun run db:deploy
```

O `buildCommand` da Vercel executa `bun run vercel-build`, que aplica `prisma migrate deploy` antes de
compilar a aplicação. Assim, produção, staging e todos os previews atualizam o banco correspondente
antes de publicar código que depende do novo schema. `DATABASE_URL_UNPOOLED` deve apontar para a
conexão direta de cada ambiente; se ela não estiver presente, o Prisma usa `DATABASE_URL`.

Os previews compartilham o branch `test`, portanto mais de um build pode encontrar a mesma migração.
O Prisma serializa a aplicação de migrações e os builds seguintes encontram o schema já atualizado.
As migrações ainda devem ser compatíveis com a versão anterior durante a implantação: código que
começa a ler uma tabela nova deve tratar sua ausência, e a remoção de estruturas antigas deve ocorrer
em uma entrega posterior. Um rollback da aplicação não reverte o banco.

## 2. Criar e configurar o projeto

Importe o repositório no painel da Vercel. O projeto detecta Next.js e usa `vercel.json` para instalar
e compilar com Bun. Cadastre as variáveis de `.env.vercel.example` em **Settings → Environment
Variables**. Segredos devem ser marcados como sensíveis e nunca copiados para arquivos versionados.

Para produção:

- `APP_URL=https://usetuavitrine.com.br`;
- `DATABASE_URL` pooled; a URL direta fica no ambiente que executa as migrações;
- um `BETTER_AUTH_SECRET` aleatório com pelo menos 32 caracteres;
- crie um token R2 restrito ao bucket `tua-vitrine` e configure as quatro variáveis `R2_*`.

Para previews comuns, use uma única branch Neon chamada `test`. Configure `DATABASE_URL` e
`DATABASE_URL_UNPOOLED` no ambiente Preview sem filtro de branch. Omita `APP_URL`: a aplicação usa
o endereço do deployment e também aceita o alias da branch fornecido pela Vercel. Não conecte
previews ao banco de produção e não habilite a criação automática de branches Neon por deployment.

A branch `staging` é a exceção: ela possui o domínio estável
`https://staging.usetuavitrine.com.br` e deve receber uma variável `APP_URL` limitada a essa branch:

```sh
vercel env add APP_URL preview --git-branch staging \
  --value https://staging.usetuavitrine.com.br --force --no-sensitive --yes
```

Essa separação é necessária porque `APP_URL` define a origem confiável do Better Auth, os cookies e
os links enviados por e-mail. Produção e staging não devem confiar automaticamente uma na outra.
Na Vercel, limite `DATABASE_URL` e `DATABASE_URL_UNPOOLED` do banco `staging` à branch Git `staging`;
essas variáveis sobrescrevem o banco `test` compartilhado pelos demais previews.

### Product analytics

O PostHog é opcional. O plano atual permite um único projeto, portanto produção e staging/preview
usam o mesmo token com `environment` obrigatório em todos os eventos e filtros. Configure em cada
ambiente o token público, o host regional fornecido pelo PostHog e o ambiente lógico:

- `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` e `NEXT_PUBLIC_POSTHOG_HOST` para o navegador;
- `POSTHOG_PROJECT_TOKEN` e `POSTHOG_HOST` para eventos confirmados no servidor;
- `NEXT_PUBLIC_APP_ENV` como `production` ou `staging`;
- `APP_RELEASE` somente quando a release não puder ser obtida de `VERCEL_GIT_COMMIT_SHA`.

O token de projeto permite apenas ingestão e pode aparecer no browser; chaves pessoais e
administrativas do PostHog nunca pertencem à Vercel nem ao bundle. A ausência das variáveis mantém o
adaptador desabilitado. Configuração parcial falha durante o bootstrap para evitar eventos enviados
ao projeto ou à região errados.

A fundação desabilita autocapture, pageviews, pageleave, feature flags e Session Replay. Em produção,
o SDK web inicia sem capturar até que o visitante conceda consentimento, e o adaptador de servidor
permanece desligado até a política de privacidade da Sprint 1 ser aprovada. Não habilite essas opções
diretamente no PostHog antes das tarefas correspondentes.

Não há CSP customizada no projeto atualmente. Se uma política for adicionada, permita o host regional
em `connect-src`; os bundles opcionais exigem `script-src https://*.posthog.com`, e replay exige
`worker-src blob: data:`. A validação de ingestão deve acontecer primeiro em staging e confirmar que
o smoke test possui `environment = development`. Todo insight de produção deve filtrar
`environment = production`; se o plano passar a permitir mais projetos, migre produção para um
projeto isolado antes do rollout.

## 3. E-mail e imagens

O cadastro exige confirmação de e-mail e a recuperação de senha depende de entrega real. Enquanto o
O envio de e-mail é parte obrigatória do ambiente de produção. Configure `MAIL_FROM` e
`RESEND_API_KEY`; a aplicação recusa a configuração antes de atender requisições se algum deles
estiver ausente.

O filesystem das funções da Vercel é efêmero. Configure `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`,
`R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME` e `R2_PUBLIC_URL` somente no servidor. A presença do conjunto
completo ativa o R2 automaticamente. O app valida a imagem, converte para WebP e grava sob
`stores/{storeId}/`; o navegador lê a imagem diretamente pela URL pública da Cloudflare.

O limite atual é 5 MB e o upload passa pela função para validar o conteúdo real com Sharp. Confirme o
limite de corpo do plano antes do lançamento; se ele for menor, migre o fluxo para upload temporário
direto e finalize a validação no servidor. Antes do lançamento, use um domínio customizado do R2 em
vez do endereço `r2.dev`, que é destinado apenas a desenvolvimento.

## 4. Domínios e validação

O projeto usa estes domínios:

| Ambiente | Domínio | Vínculo |
|---|---|---|
| Produção | `usetuavitrine.com.br` | deployment de produção |
| Staging | `staging.usetuavitrine.com.br` | branch Git `staging` |
| Redirecionamento | `www.usetuavitrine.com.br` | `308` para o domínio raiz |

Mantenha o domínio raiz como origem canônica. `APP_URL` deve conter somente a origem HTTPS, sem
caminho nem barra final. Toda alteração dessa variável exige um novo deploy porque o Better Auth a
usa nos cookies, na proteção de origem e nos links enviados por e-mail.

Após o deploy:

1. confirme `GET /api/health/live` e `GET /api/health/ready`;
2. crie e confirme uma conta real;
3. valide login, logout e recuperação de senha;
4. crie uma loja sem imagem e abra a vitrine pelo slug;
5. conclua um Checkout e confirme que o plano muda sem liberar novamente o trial;
6. confira na Stripe que a entrega do webhook recebeu `2xx`;
7. confira nos logs que não há erros de conexão, autenticação, cobrança ou envio de e-mail.

Se uma migração incompatível já tiver sido aplicada, fazer rollback apenas do deployment não desfaz o
banco. Prefira migrações compatíveis com a versão anterior e só remova estruturas antigas numa etapa
posterior.
