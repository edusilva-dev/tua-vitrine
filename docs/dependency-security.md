# Segurança das dependências

O projeto usa PostgreSQL por meio de `pg` e `@prisma/adapter-pg`. O pacote `mysql2` presente no
lockfile não é usado pela aplicação: ele é instalado transitivamente pelo ecossistema Prisma e
também aparece como integração opcional do Better Auth.

O override de `mysql2` em `package.json` mantém essa dependência indireta em uma versão corrigida,
mesmo sem existir banco ou serviço MySQL na arquitetura. O override de `deepmerge-ts` corrige outra
dependência transitiva de configuração do Prisma. Ambos devem ser removidos quando as dependências
diretas passarem a resolver versões igualmente seguras sem override.

O CI executa `bun audit` logo após a instalação congelada. Uma atualização do lockfile só deve ser
aceita quando auditoria, lint, TypeScript, testes e build continuarem passando.
