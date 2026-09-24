# Deploy na Vercel com Neon

Esta é a referência de deploy gerenciado. O Compose de produção continua útil para uma VPS, mas não
participa do deploy na Vercel. A Vercel instala com Bun a partir do `bun.lock`; as funções Next.js
executam no runtime Node.js gerenciado da plataforma.

## 1. Preparar o Neon

No painel do Neon, copie duas conexões do mesmo banco e branch:

- `DATABASE_URL`: conexão com pooling; o hostname contém `-pooler`;
- `DATABASE_URL_UNPOOLED`: conexão direta, sem `-pooler`, usada exclusivamente pelo operador ou CI
  de migrações. `DIRECT_URL` continua aceito como alias manual.

As duas URLs precisam de TLS (`sslmode=require`). O runtime usa `DATABASE_POOL_MAX=1` para limitar
as conexões mantidas por cada instância serverless. Não cadastre a URL direta na Vercel quando a
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

- `APP_ENV=production`;
- `APP_URL=https://SEU-SUBDOMINIO.fyweb.com.br`;
- `DATABASE_URL` pooled; a URL direta fica no ambiente que executa as migrações;
- `DATABASE_POOL_MAX=1`;
- `AUTH_MODE=session`, `LOCAL_ONLY=false` e um `BETTER_AUTH_SECRET` aleatório;
- `STORAGE_DRIVER=disabled` enquanto não houver storage persistente.

Para previews, use um branch Neon separado quando houver dados reais. Defina `APP_ENV=staging`,
omita `APP_URL` para que o endereço do deployment seja usado e nunca conecte previews ao banco de
produção.

## 3. E-mail e imagens ainda pendentes

O cadastro exige confirmação de e-mail e a recuperação de senha depende de entrega real. Por isso o
ambiente público continua recusando inicialização sem SMTP válido. Antes do primeiro deploy utilizável,
configure `MAIL_TRANSPORT=smtp`, remetente e credenciais. Não use valores fictícios: eles criariam
contas que não conseguem confirmar o endereço.

O filesystem das funções da Vercel é efêmero. Com `STORAGE_DRIVER=disabled`, catálogo, onboarding e
autenticação funcionam, mas o endpoint de upload responde `503` com uma mensagem controlada. Escolha
um storage de objetos antes de habilitar fotos. Vercel Blob, S3 e serviços compatíveis com S3 são
opções; a escolha deve resultar em um novo adapter, sem gravar em `/tmp` como persistência. Prefira
upload direto do navegador com URL/token temporário para não depender do limite de corpo das funções.

## 4. Domínio e validação

Adicione o subdomínio escolhido em **Settings → Domains** e crie no DNS da `fyweb.com.br` o registro
mostrado pela Vercel. Atualize `APP_URL` para a origem exata, sem caminho nem barra final. A troca de
domínio exige novo deploy porque o Better Auth usa essa origem para cookies e links de e-mail.

Após o deploy:

1. confirme `GET /api/health/live` e `GET /api/health/ready`;
2. crie e confirme uma conta real;
3. valide login, logout e recuperação de senha;
4. crie uma loja sem imagem e abra a vitrine pelo slug;
5. confira nos logs que não há erros de conexão, autenticação ou envio de e-mail.

Se uma migração incompatível já tiver sido aplicada, fazer rollback apenas do deployment não desfaz o
banco. Prefira migrações compatíveis com a versão anterior e só remova estruturas antigas numa etapa
posterior.
