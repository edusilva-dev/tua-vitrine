# tua-vitrine

Catálogo para pequenos negócios, com gestão de produtos e fechamento pelo WhatsApp. Bun 1.3.14, Next.js 16, React 19, Prisma 7 e PostgreSQL 16. Contas de lojistas com confirmação de e-mail, recuperação de senha e autorização por loja estão disponíveis em `AUTH_MODE=session`. A configuração padrão continua sendo a demonstração local; publicação depende da preparação operacional descrita em docs/operations.md.

## Desenvolvimento no WSL

Mantenha o checkout no filesystem Linux e use Bun 1.3.14, a mesma versão fixada no CI e Docker. Confira `bun --version` antes dos comandos.

```sh
bun install --frozen-lockfile
cp -n .env.example .env.local
bun run db:up
bun run db:generate
bun run db:deploy
bun run db:seed
bun run dev
```

Abra http://localhost:3000. O banco dedicado usa localhost:55432 e projeto Compose tua-vitrine-local; não interfere no PostgreSQL existente em 5432. Não sobrescreva .env existente. Bun carrega .env.local; scripts Prisma usam prisma7.config.ts explicitamente.

## Qualidade

Os testes usam exclusivamente `tuavitrine_test`, nunca o catálogo de desenvolvimento. Prepare esse banco uma vez e aplique migrações novamente quando mudarem:

```sh
docker compose exec db createdb -U tuavitrine tuavitrine_test
DATABASE_URL=postgresql://tuavitrine:tuavitrine_local@localhost:55432/tuavitrine_test bun run db:deploy
```

Se o banco já existe, pule `createdb`. `TEST_DATABASE_URL` e `E2E_DATABASE_URL` permitem configurar a conexão, mas o nome isolado é obrigatório. Fixtures de navegador são preparadas e removidas pela suíte, sem depender do seed demonstrativo.

```sh
bun run check
bun run build
bunx --bun playwright install chromium
bun run test:e2e
bun run test:auth
```

Biome formata e verifica regras gerais. ESLint complementa somente espaçamento entre instruções e early returns. TypeScript usa strict, exactOptionalPropertyTypes e noUncheckedIndexedAccess. Execute bun run lint:fix para correções automáticas; revise o diff. Console é proibido; logs de servidor usam Pino. Componentes shadcn são instalados com bunx --bun shadcn add NOME, preservando customizações existentes.

## Docker local

Depois de aplicar migrações ao banco local:

```sh
docker compose --profile app up -d --build --wait
docker compose logs app
```

Para manter Bun local em 3000 e Docker em 3001, execute APP_PORT=3001 APP_URL=http://localhost:3001 docker compose --profile app up -d --build --wait. Sem override, pare o servidor Bun local antes de usar o app Docker na porta 3000. Contêiner app usa db:5432, volume de uploads dedicado e porta vinculada a 127.0.0.1. O runtime recebe configuração; o build não recebe credenciais reais. Não use docker compose down -v se quiser preservar banco e imagens.

Para alternar entre app no WSL e Docker usando o mesmo banco e fotos, use o override `compose.wsl.yml` após preparar o diretório compartilhado conforme [armazenamento](docs/storage.md). O Compose padrão preserva o volume de fotos existente.

Consulte [autenticação](docs/authentication.md), [proteção antecipada do painel](docs/proxy.md),
[manutenção da autenticação](docs/auth-maintenance.md), [segurança das dependências](docs/dependency-security.md),
[arquitetura](docs/architecture.md), [armazenamento](docs/storage.md), [operação](docs/operations.md) e
[implantação em VPS](docs/deployment.md). Para a hospedagem gerenciada, siga
[deploy na Vercel com Neon](docs/vercel-deployment.md).
