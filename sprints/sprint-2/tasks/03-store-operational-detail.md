# 03 — Criar o detalhe operacional da loja

## Objetivo

Reunir em uma única tela o contexto necessário para diagnosticar uma loja antes de executar qualquer
ação administrativa.

## Contexto

Hoje o diagnóstico exige navegar entre banco, aplicação e serviços externos. O detalhe deve explicar
o estado atual com dados locais e links úteis, sem alterar registros durante a leitura.

## Implementação esperada

- criar DTO e service de detalhe autorizados para o Super Admin;
- mostrar loja, slug, URL pública, criação, onboarding e estado operacional;
- mostrar proprietário e membros com dados mínimos de identificação;
- mostrar totais de produtos publicados, não publicados e arquivados;
- mostrar plano efetivo e sua origem: Free, trial, Stripe ou concessão manual;
- mostrar resumo da assinatura local e seus identificadores;
- reservar seções para suporte recente e auditoria recente;
- apresentar estados ausentes e inconsistentes com linguagem operacional clara;
- evitar consultas N+1 e não buscar Stripe, Resend ou outros serviços ao abrir a página.

## Critérios de aceite

- [ ] a equipe identifica a loja, o responsável e o estado do catálogo em uma tela;
- [ ] o plano exibido usa a mesma regra aplicada às permissões do produto;
- [ ] datas são apresentadas no fuso esperado e preservadas em UTC na API;
- [ ] IDs técnicos podem ser copiados sem expor segredos;
- [ ] loja inexistente retorna 404;
- [ ] usuário não autorizado não distingue loja inexistente de inacessível;
- [ ] carregamento não dispara mutações nem chamadas externas;
- [ ] testes cobrem os diferentes estados de plano, trial e assinatura.

## Validação

- montar fixtures para Free, trial, assinatura ativa, cancelada e loja sem produtos;
- conferir responsividade, teclado, overflow de IDs e textos longos;
- inspecionar quantidade de consultas do carregamento;
- rodar lint, typecheck, testes relacionados e build.

## Fora do escopo

- editar dados da loja ou do proprietário;
- navegar pelo catálogo como se fosse o lojista;
- impersonar usuário;
- calcular analytics de uso da plataforma.
