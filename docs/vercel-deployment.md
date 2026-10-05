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

Migrações não fazem parte do `buildCommand`: builds de preview e produção podem ocorrer em paralelo,
e executar DDL durante cada build cria concorrência e torna rollback de aplicação inseguro.

## 2. Criar e configurar o projeto

Importe o repositório no painel da Vercel. O projeto detecta Next.js e usa `vercel.json` para instalar
e compilar com Bun. Cadastre as variáveis de `.env.vercel.example` em **Settings → Environment
Variables**. Segredos devem ser marcados como sensíveis e nunca copiados para arquivos versionados.

Para produção:

- `APP_URL=https://usetuavitrine.com.br`;
- `DATABASE_URL` pooled; a URL direta fica no ambiente que executa as migrações;
- um `BETTER_AUTH_SECRET` aleatório com pelo menos 32 caracteres;
- crie um token R2 restrito ao bucket `tua-vitrine` e configure as quatro variáveis `R2_*`.

Para previews comuns, use um branch Neon separado quando houver dados reais. Omita `APP_URL` para
que o endereço do deployment seja usado e nunca conecte previews ao banco de produção.

A branch `staging` é a exceção: ela possui o domínio estável
`https://staging.usetuavitrine.com.br` e deve receber uma variável `APP_URL` limitada a essa branch:

```sh
vercel env add APP_URL preview --git-branch staging \
  --value https://staging.usetuavitrine.com.br --force --no-sensitive --yes
```

Essa separação é necessária porque `APP_URL` define a origem confiável do Better Auth, os cookies e
os links enviados por e-mail. Produção e staging não devem confiar automaticamente uma na outra.

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
