# Segurança das dependências

O projeto usa PostgreSQL por meio de `pg` e `@prisma/adapter-pg`. O pacote `mysql2` presente no
lockfile não é usado pela aplicação: ele é instalado transitivamente pelo ecossistema Prisma e
também aparece como integração opcional do Better Auth.

Os overrides em `package.json` mantêm dependências indiretas em versões corrigidas enquanto os
pacotes de origem ainda permitem versões vulneráveis. `mysql2` e `deepmerge-ts` vêm do ecossistema
Prisma e Better Auth; `@modelcontextprotocol/sdk` e `source-map-js` vêm das ferramentas de
desenvolvimento; `uuid` vem do ExcelJS. Cada override deve ser removido quando a dependência direta
passar a resolver uma versão igualmente segura sem intervenção.

O CI executa `bun run audit` logo após a instalação congelada. A auditoria ignora apenas
`GHSA-vfj7-8cjw-p6xm`, de `braces`, porque o registry ainda não oferece uma versão corrigida e o
pacote chega pela CLI de desenvolvimento do shadcn, sem uso na aplicação.
Remova a exceção assim que uma
versão segura estiver disponível. Uma atualização do lockfile só deve ser aceita quando auditoria,
lint, TypeScript, testes e build continuarem passando.
