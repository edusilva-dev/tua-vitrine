# tua-vitrine

SaaS de vitrines digitais para pequenos negócios, com catálogo, campanhas promocionais, fechamento
pelo WhatsApp e assinaturas Stripe.

## Stack

- Bun 1.3.14
- Next.js 16, React 19 e TypeScript strict
- Prisma 7 e PostgreSQL
- shadcn/ui
- Vercel, Neon e Cloudflare R2

## Desenvolvimento local

O Compose existe somente para fornecer o PostgreSQL local usado pelo app e pelos testes de
integração. A aplicação roda diretamente com Bun.

~~~sh
bun install --frozen-lockfile
cp -n .env.example .env.local
bun run db:up
docker compose exec db createdb -U tuavitrine tuavitrine_test
bun run db:generate
bun run db:deploy
DATABASE_URL=postgresql://tuavitrine:tuavitrine_local@localhost:55432/tuavitrine_test bun run db:deploy
bun run db:seed
bun run dev
~~~

Antes de iniciar, substitua `BETTER_AUTH_SECRET` em `.env.local` por um segredo aleatório com pelo
menos 32 caracteres. Abra http://localhost:3000. Se `tuavitrine_test` já existir, ignore o erro de
criação. Arquivos reais de ambiente são ignorados pelo Git.

## Qualidade

~~~sh
bun run check
bun run build
bunx --bun playwright install chromium
bun run test:e2e
bun run test:auth
~~~

O CI usa um PostgreSQL isolado e executa instalação congelada, auditoria, geração do Prisma, migrações,
lint, TypeScript, testes, build e Playwright.

## Produção

A produção oficial usa Vercel, Neon PostgreSQL, Cloudflare R2, Resend e Stripe. Consulte:

- [Arquitetura](docs/architecture.md)
- [Deploy na Vercel](docs/vercel-deployment.md)
- [Operação](docs/operations.md)
- [Armazenamento](docs/storage.md)
- [Autenticação](docs/authentication.md)
- [Planos](docs/plans.md)
- [Feedback](docs/feedback.md)
