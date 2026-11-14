# 01 — Criar o acesso e a segurança do Super Admin

> **Status:** concluída em 13 de novembro de 2026.

## Objetivo

Criar uma autorização de plataforma explícita e a estrutura protegida da área interna, sem implementar
a operação de lojas ainda.

## Contexto

`StoreMember` autoriza o painel de uma loja e não representa um administrador do SaaS. O Super Admin
atravessa o isolamento normal entre lojas para fins operacionais e, por isso, precisa de identidade,
verificação e rotas próprias.

## Implementação esperada

- modelar a concessão de acesso administrativo com usuário, estado e datas;
- criar migração Prisma sem promover nenhum usuário automaticamente;
- criar service server-only para resolver e exigir a identidade de plataforma;
- criar layout e rota inicial próprios para o Super Admin;
- proteger páginas e Route Handlers no servidor;
- ocultar o acesso de usuários comuns;
- criar processo interno documentado para conceder e revogar acesso;
- garantir que revogação interrompa novos acessos imediatamente;
- definir uma duração de sessão adequada às capacidades atuais do Better Auth;
- preparar a estrutura para autenticação reforçada/2FA, sem ampliar o sprint se isso exigir mudança
  ampla de autenticação.

Não usar lista de e-mails em variável de ambiente, domínio do e-mail, `isAdmin` fornecido pelo cliente
ou associação a uma loja como autorização global.

## Critérios de aceite

- [x] usuário sem permissão recebe 404 ou 403 em páginas e APIs internas;
- [x] administrador autorizado acessa o shell interno sem selecionar uma loja;
- [x] não existe fluxo público para conceder a permissão;
- [x] cliente não consegue forjar a identidade ou o papel administrativo;
- [x] revogação impede novo acesso sem alterar as associações do usuário às lojas;
- [x] testes cobrem acesso autorizado, negado, sessão ausente e permissão revogada;
- [x] nenhum dado de outra loja é carregado antes da autorização global;
- [x] concessão e revogação estão documentadas para a operação.

## Validação

- executar testes de autenticação e autorização;
- tentar acessar páginas e endpoints com usuário comum e sem sessão;
- conferir que o bundle do cliente não contém regras ou dados de autorização;
- rodar lint, typecheck e build.

## Fora do escopo

- níveis configuráveis de permissão;
- convite administrativo por interface;
- impersonação de lojista;
- gestão geral de usuários.
