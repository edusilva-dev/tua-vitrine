# tua-vitrine

Protótipo local de catálogo para pequenos negócios, com gestão de produtos e fechamento pelo WhatsApp. Bun 1.3.14, Next.js 16, React 19, Prisma 7 e PostgreSQL 16. Sem autenticação: não publicar esta versão.

## Desenvolvimento no WSL

Mantenha o checkout no filesystem Linux. Adicione ~/.bun/bin ao PATH e use Bun 1.3.14 ou posterior: versões anteriores têm uma incompatibilidade conhecida com os workers CommonJS do Next 16.

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

```sh
bun run check
bun run build
bunx --bun playwright install chromium
bun run test:e2e
```

Biome formata e verifica regras gerais. ESLint complementa somente espaçamento entre instruções e early returns. TypeScript usa strict, exactOptionalPropertyTypes e noUncheckedIndexedAccess. Execute bun run lint:fix para correções automáticas; revise o diff. Console é proibido; logs de servidor usam Pino. Componentes shadcn são instalados com bunx --bun shadcn add NOME, preservando customizações existentes.

## Docker local

Depois de aplicar migrações ao banco local:

```sh
docker compose --profile app up -d --build --wait
docker compose logs app
```

Para manter Bun local em 3000 e Docker em 3001, execute APP_PORT=3001 APP_URL=http://localhost:3001 docker compose --profile app up -d --build --wait. Sem override, pare o servidor Bun local antes de usar o app Docker na porta 3000. Contêiner app usa db:5432, volume de uploads dedicado e porta vinculada a 127.0.0.1. O runtime recebe configuração; o build não recebe credenciais reais. Não use docker compose down -v se quiser preservar banco e imagens.

Consulte [arquitetura](docs/architecture.md) e [operação](docs/operations.md).
