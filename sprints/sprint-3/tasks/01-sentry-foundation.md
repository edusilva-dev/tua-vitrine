# 01 — Instrumentar e validar o Sentry

**Status:** concluída.

## Objetivo

Adicionar a instrumentação oficial do Sentry ao Next.js e comprovar o fluxo completo com uma
exceção gerada pela aplicação em execução.

## Implementação

- instalar `@sentry/nextjs`;
- inicializar browser, Node.js e Edge somente quando o DSN estiver configurado;
- capturar erros do App Router, React e APIs;
- integrar logs relevantes do Pino sem transformar falhas tratadas em issues;
- aplicar os filtros de privacidade definidos no documento mestre;
- configurar tracing por ambiente;
- criar um gatilho temporário de erro e removê-lo após a confirmação.

## Critérios de aceite

- [x] erro de browser é capturado pelos limites de erro do App Router;
- [x] erro de servidor é capturado;
- [x] erros esperados não geram issues;
- [x] logs estruturados enviam somente os níveis `warn`, `error` e `fatal`;
- [x] evento real chega ao projeto `tua-vitrine`;
- [x] gatilho temporário é removido;
- [x] suíte de qualidade e build passam.

## Evidência

Em 16 de novembro de 2026, uma exceção controlada atravessou o `handle` das APIs, retornou a resposta
genérica esperada ao cliente e apareceu no Sentry como `TUA-VITRINE-1`. O evento identificou a rota e
o arquivo TypeScript de origem. A rota usada para o teste foi removida em seguida.
