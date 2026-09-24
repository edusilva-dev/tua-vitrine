# Decisões da fundação

## ADR 001 — Monólito modular e sequência

Um único app Next.js reduz custo operacional e mantém a interface próxima das regras de negócio, sem exigir um serviço HTTP adicional. Route Handlers são adaptadores HTTP: validam entrada compartilhada com Zod, traduzem erros e chamam serviços. Serviços coordenam regras/transações; repositórios concentram consultas Prisma. Componentes nunca importam Prisma ou módulos server-only.

Implementar gestão primeiro; validar CRUD/onboarding antes de ampliar a vitrine. Validar vitrine e persistência local antes de disponibilizar roteamento público multi-tenant. Landing page e cobrança ficam depois. O protótipo mantém contexto local de loja; storeId nas entidades prepara isolamento futuro, mas não representa autorização.

## ADR 002 — Estado e contratos

Banco é fonte de verdade para catálogo, personalização e métricas. Formulários mantêm apenas rascunho/erros de campo no cliente e enviam DTOs JSON à API; resposta normalizada atualiza a interface. Valores monetários atravessam a API em centavos inteiros. Likes/carrinho persistem no navegador com chave por loja e versão; dados inválidos ou produtos removidos devem ser reconciliados sem apagar seleções válidas.

Contratos e validações ficam em modules, componentes de domínio em components e infraestrutura em lib/server. shadcn fornece Dialog/AlertDialog para criar, editar e confirmar exclusão, com foco e fechamento acessíveis.

## ADR 003 — Banco e mídia

PostgreSQL e Prisma oferecem transações e migrações rastreáveis. Store possui produtos/categorias/ativos; imagens referenciam assets; variantes pertencem a produtos. Sessões anônimas servem à deduplicação de métricas, não à autenticação. A implementação futura de autenticação deverá resolver loja autorizada no servidor antes de consultas administrativas.

Fotos ficam fora do build, em volume local. Uma interface de storage isola escrita/leitura/exclusão, permitindo adapter S3 sem reescrever os fluxos de produtos. Este armazenamento local limita escalabilidade horizontal; migrar objetos antes de adicionar réplicas.

## ADR 004 — Reprodutibilidade e qualidade

Bun 1.3.14 em desenvolvimento, CI e Docker; versões de dependências fixadas e bun.lock rastreado. CI usa instalação congelada. Biome é autoridade de formatação e lint geral; ESLint cobre somente lacunas de espaçamento/early returns. TypeScript strict reforça nulabilidade e acessos por índice. Regras não substituem revisão: ausência de código morto e limites entre módulos devem ser revisados.

O arquivo prisma7.config.ts é reconhecido pela versão instalada; scripts passam --config explicitamente, evitando dependência de descoberta implícita.

## ADR 005 — Local agora, ambientes depois

Decisão original da fundação. A implementação de contas e os requisitos atuais substituem o bloqueio absoluto de staging/produção; consulte ADR 006 em [autenticação](authentication.md). O modo sem contas continua estritamente local.

A versão sem autenticação só pode funcionar com LOCAL_ONLY=true e APP_ENV development/test. Compose vincula portas ao loopback. Staging/produção estão documentados, mas sua ativação depende de autenticação/autorização e testes de isolamento; não relaxar o bloqueio apenas para publicar.

A mesma imagem deve ser promovida entre ambientes. Configuração privada é validada no runtime. NEXT_PUBLIC_* é congelado no build, portanto APP_URL é configuração de servidor. NODE_ENV=production também vale para staging; APP_ENV representa o ambiente de negócio.
