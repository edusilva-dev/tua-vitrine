# 02 — Criar a busca e a listagem de lojas

> **Status:** concluída em 13 de novembro de 2026.

## Objetivo

Permitir que a equipe encontre rapidamente a loja correta a partir das informações recebidas em uma
solicitação de suporte ou cobrança.

## Contexto

A busca é a entrada principal do Super Admin. Ela precisa resolver casos reais sem carregar todas as
lojas ou expor mais dados do que o necessário.

## Implementação esperada

- criar consulta paginada e server-only de lojas;
- aceitar busca por nome, slug, e-mail do lojista, UUID da loja, cliente Stripe e assinatura Stripe;
- permitir filtros de estado operacional, plano efetivo e assinatura;
- colocar busca, filtros e página na URL;
- retornar DTO específico com loja, slug, proprietário, plano, estado e criação;
- criar tabela responsiva com estados de vazio, carregamento e erro;
- manter consultas indexáveis e limitar o tamanho da página;
- não executar busca ampla com entrada vazia além da paginação padrão.

## Critérios de aceite

- [x] todos os identificadores previstos encontram a loja correta;
- [x] busca parcial por nome, slug e e-mail é normalizada de forma segura;
- [x] UUID ou ID Stripe inexistente retorna estado vazio, sem erro técnico;
- [x] resultados são paginados e preservados ao navegar para o detalhe e voltar;
- [x] plano e estado exibidos correspondem às regras reais da aplicação;
- [x] a API não retorna telefone, conteúdo do catálogo ou outros campos desnecessários;
- [x] usuário sem permissão não acessa a consulta;
- [x] testes cobrem busca, filtros, paginação e autorização.

## Validação

- testar buscas com lojas de nomes semelhantes e múltiplos membros;
- verificar paginação e URL em mobile e desktop;
- revisar o plano de consulta para evitar varreduras desnecessárias;
- rodar lint, typecheck, testes relacionados e build.

## Fora do escopo

- exportação de lojas;
- ações em massa;
- ordenação arbitrária por todas as colunas;
- métricas agregadas da plataforma.
