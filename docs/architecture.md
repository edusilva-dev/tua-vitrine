# Decisões da fundação

Este documento preserva decisões e contexto da fundação; não é um inventário
completo do estado atual. As descrições de sequência em ADR 001 e de autenticação
e mídia em ADR 003 são históricas e foram substituídas pela implementação atual
e pelos documentos de domínio correspondentes. Para comportamento vigente, consulte
`AGENTS.md`, `docs/authentication.md` e `docs/storage.md`.

## ADR 001 — Monólito modular e sequência

Um único app Next.js reduz custo operacional e mantém a interface próxima das regras de negócio, sem exigir um serviço HTTP adicional. Route Handlers são adaptadores HTTP: validam entrada compartilhada com Zod, traduzem erros e chamam serviços. Serviços coordenam regras/transações; repositórios concentram consultas Prisma. Componentes nunca importam Prisma ou módulos server-only.

Na fundação, a sequência prevista era implementar gestão antes de ampliar a vitrine, validar CRUD/onboarding e só depois adicionar landing page e cobrança. Essa sequência e o contexto local de loja descrevem o protótipo; o produto atual já tem painel autenticado, vitrine pública multi-tenant e cobrança. O `storeId` continua sem representar autorização por si só.

## ADR 002 — Estado e contratos

Banco é fonte de verdade para catálogo, personalização e métricas. Formulários mantêm apenas rascunho/erros de campo no cliente e enviam DTOs JSON à API; resposta normalizada atualiza a interface. Valores monetários atravessam a API em centavos inteiros. Likes/carrinho persistem no navegador com chave por loja e versão; dados inválidos ou produtos removidos devem ser reconciliados sem apagar seleções válidas.

Contratos e validações ficam em modules, componentes de domínio em components e infraestrutura em lib/server. shadcn fornece Dialog/AlertDialog para criar, editar e confirmar exclusão, com foco e fechamento acessíveis.

## ADR 003 — Banco e mídia

PostgreSQL e Prisma oferecem transações e migrações rastreáveis. Store possui produtos/categorias/ativos; imagens referenciam assets; variantes pertencem a produtos. Sessões anônimas servem à deduplicação de métricas, não à autenticação; a autorização atual de lojistas é descrita em `docs/authentication.md`.

Fotos ficam fora do build. A decisão original de armazenamento local limitava escalabilidade horizontal; hoje o armazenamento local é usado em desenvolvimento e o R2 em produção, conforme `docs/storage.md`.

## ADR 004 — Reprodutibilidade e qualidade

Bun 1.3.14 em desenvolvimento e CI; versões de dependências fixadas e bun.lock rastreado. CI usa instalação congelada. Biome é autoridade de formatação e lint geral; ESLint cobre somente lacunas de espaçamento/early returns. TypeScript strict reforça nulabilidade e acessos por índice. Regras não substituem revisão: ausência de código morto e limites entre módulos devem ser revisados.

O arquivo prisma7.config.ts é reconhecido pela versão instalada; scripts passam --config explicitamente, evitando dependência de descoberta implícita.

## ADR 005 — Local agora, ambientes depois

Decisão original da fundação. A implementação de contas e os requisitos atuais substituem o bloqueio absoluto de staging/produção; consulte ADR 006 em [autenticação](authentication.md). O modo sem contas continua estritamente local.

O painel sempre usa autenticação. `DATABASE_URL` e `BETTER_AUTH_SECRET` são obrigatórios também no desenvolvimento. O Compose vincula o PostgreSQL ao loopback; os requisitos atuais de R2, Resend e Stripe em produção estão nos documentos de storage e operação.

A mesma imagem deve ser promovida entre ambientes. A configuração privada é validada no runtime. `NEXT_PUBLIC_*` é congelado no build, portanto `APP_URL` permanece configuração de servidor.
