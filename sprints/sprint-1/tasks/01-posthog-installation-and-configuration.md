# 01 — Instalar e configurar o PostHog

## Objetivo

Preparar os SDKs web e servidor, as variáveis por ambiente e a inicialização segura do PostHog, sem
instrumentar eventos de produto ainda.

## Contexto

O projeto usa Next.js 16 App Router e Bun. A documentação oficial atual recomenda
`instrumentation-client.ts` para inicialização no browser. Eventos confirmados no servidor exigirão o
SDK Node. O recurso deve ser opcional localmente e nunca enviar dados durante testes automatizados.

## Implementação esperada

- instalar versões fixadas de `posthog-js` e `posthog-node` com Bun;
- criar `instrumentation-client.ts` com configuração explícita e sem autocapture;
- validar token, host, ambiente e release no contrato de ambiente;
- adicionar exemplos sem valores reais aos arquivos de ambiente;
- criar factory/singleton server-only com lifecycle adequado ao runtime;
- deixar browser e servidor em modo noop quando desabilitados;
- garantir projetos separados por ambiente ou `environment` obrigatório;
- documentar configuração necessária na Vercel/PostHog sem registrar segredos;
- confirmar CSP/firewall antes de considerar a ingestão validada.

Não habilitar replay, identificação ou eventos nesta tarefa.

## Arquivos/áreas afetadas

- `package.json`
- `bun.lock`
- `instrumentation-client.ts` (novo)
- `lib/server/env.ts`
- `.env.example`
- `.env.vercel.example`
- `modules/observability/server/posthog.ts` (novo)
- testes unitários do parser/configuração
- documentação de deploy, se necessária

## Critérios de aceite

- [ ] dependências instaladas exclusivamente com Bun e lockfile atualizado;
- [ ] app inicia e builda com PostHog configurado e sem configuração;
- [ ] ausência de token resulta em noop, não em crash;
- [ ] configuração parcial/inválida falha com mensagem clara onde apropriado;
- [ ] testes, preview e ambiente local não enviam para produção;
- [ ] `autocapture` está desabilitado;
- [ ] nenhuma chave administrativa ou pessoal aparece no bundle/browser;
- [ ] o SDK de servidor é importável somente em código server-only;
- [ ] um evento técnico temporário de smoke test pode ser visto no projeto não produtivo e depois é
  removido do código.

## Validação

- rodar testes do parser de ambiente;
- rodar lint, typecheck e build;
- inspecionar o bundle/configuração pública;
- validar uma requisição de ingestão em desenvolvimento/staging;
- repetir com as variáveis ausentes e confirmar que o produto continua funcional;
- verificar que produção não recebeu o smoke test.

## Observações

Usar o host regional fornecido pelo projeto PostHog. Não assumir região. Fixar a opção `defaults`
recomendada pela versão instalada somente após conferir a documentação oficial.
