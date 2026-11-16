# Sprint 3 — Observabilidade mínima com Sentry

> **Documento mestre do sprint.** Este arquivo registra por que o Sentry foi adotado, quais dados
> podem ser enviados e onde termina o escopo inicial.

## Estado do sprint

- **Status:** implementação em andamento.
- **Tema:** detecção e diagnóstico de erros em produção.
- **Produto:** Tua Vitrine.
- **Plataforma:** Next.js na Vercel.
- **Projeto Sentry:** organização `tua-vitrine`, projeto `tua-vitrine`.

## Contexto

Os Runtime Logs da Vercel permitem investigar uma falha conhecida, mas têm retenção curta e não
agrupam exceções recorrentes como um problema operacional. Antes deste sprint, a equipe precisava
saber que o erro ocorreu, localizar o horário e procurar manualmente a execução correspondente.

O Sentry entra como complemento aos logs da Vercel. Ele deve avisar sobre exceções, agrupar falhas
iguais, relacioná-las ao ambiente e ao release e manter stack traces legíveis. Os logs da Vercel
continuam sendo a fonte para examinar toda a execução da Function.

## Objetivo

Ao final do sprint, a equipe deve conseguir:

- receber e localizar erros inesperados do browser e do servidor;
- separar eventos de produção, staging, preview e desenvolvimento;
- consultar stack trace ligada ao código-fonte publicado;
- relacionar erros ao deployment e ao release;
- consultar logs `warn`, `error` e `fatal` já emitidos pelo Pino;
- validar a integração com uma exceção real disparada pela aplicação;
- receber alerta quando surgir um erro novo em produção.

## Escopo inicial

### Incluído

- SDK oficial `@sentry/nextjs` no cliente, Node.js e Edge;
- captura de erros do App Router, React e APIs;
- tracing com amostragem de 10% em produção e 100% fora dela durante esta fase inicial;
- integração dos níveis `warn`, `error` e `fatal` do Pino com Sentry Logs;
- source maps enviados durante o build da Vercel;
- ambiente derivado das variáveis de sistema da Vercel;
- remoção de cookies, autorização, corpos de requisição, e-mail, usuário e IP dos eventos;
- alerta por e-mail para novos erros em produção;
- runbook curto para consulta e resposta a incidentes.

### Fora do escopo

- Session Replay;
- captura automática de dados pessoais;
- métricas de produto, funis ou analytics;
- profiling contínuo;
- uptime sintético;
- dashboard executivo de observabilidade;
- substituição dos logs da Vercel;
- envio de erros esperados de validação, autenticação e regras de negócio como issues.

## Decisões

### Um projeto para frontend e backend

O Next.js entrega browser e servidor como uma única aplicação e um único ciclo de deploy. Um projeto
Sentry facilita a correlação entre navegação, requisição e exceção. Tags de runtime, ambiente e rota
continuam permitindo filtrar cada origem.

### Privacidade por padrão

As opções de `dataCollection` permanecem restritas. Antes de enviar um evento, a aplicação remove cookies,
cabeçalhos de autorização, corpo da requisição, e-mail, nome de usuário e IP. IDs internos de loja e
usuário só devem ser adicionados de forma deliberada quando forem necessários ao diagnóstico.

### Erros esperados não viram issues

Respostas controladas como validação, conflito, não encontrado e acesso negado continuam retornando
seus códigos normais. Apenas exceções inesperadas são capturadas como issues. Falhas operacionais
tratadas podem aparecer como logs estruturados sem gerar uma nova issue.

### Custo controlado

Produção começa com 10% dos traces. Erros continuam sendo capturados independentemente dessa taxa.
Session Replay fica desativado até existir uma necessidade concreta e uma revisão de privacidade.

## Configuração

| Variável | Visibilidade | Finalidade |
| --- | --- | --- |
| `NEXT_PUBLIC_SENTRY_DSN` | Pública | Destino dos eventos no projeto Sentry |
| `SENTRY_AUTH_TOKEN` | Secreta, somente build | Envio de source maps |
| `VERCEL_ENV` | Sistema da Vercel | Separação dos ambientes no servidor |
| `NEXT_PUBLIC_VERCEL_ENV` | Sistema da Vercel | Separação dos ambientes no browser |
| `VERCEL_GIT_COMMIT_SHA` | Sistema da Vercel | Associação do release ao commit |

O DSN não concede acesso à conta e pode estar no bundle do navegador. O token de autenticação
concede acesso operacional e nunca deve ser salvo no repositório ou exposto ao runtime do cliente.

## Ordem de execução

| Ordem | Tarefa | Status |
| --- | --- | --- |
| 01 | [Instrumentar e validar o Sentry](./tasks/01-sentry-foundation.md) | Concluída |
| 02 | [Preparar produção e alertas](./tasks/02-production-rollout.md) | Em andamento |

## Definição de pronto

- lint, typecheck, testes e build passam;
- uma exceção real da aplicação aparece no projeto Sentry;
- o evento de teste apresenta stack trace legível;
- DSN está disponível nos ambientes necessários da Vercel;
- source maps são enviados pelo build sem publicar o token;
- alerta de erro novo em produção está configurado;
- o gatilho temporário de teste é removido;
- a documentação operacional está atualizada.
