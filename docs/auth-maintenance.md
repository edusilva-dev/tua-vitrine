# Manutenção dos dados de autenticação

O Better Auth mantém sessões, verificações temporárias e contadores de limite de requisições no
PostgreSQL. A rotina `scripts/cleanup-auth.ts` remove somente registros operacionais antigos. Ela
nunca exclui usuários, contas, vínculos com lojas ou dados comerciais.

## Política de retenção

- sessões: sete dias depois de `expiresAt`;
- verificações: sete dias depois de `expiresAt`;
- limites de requisição: sete dias depois de `lastRequest`, armazenado em milissegundos Unix.

Cada execução processa no máximo 1000 registros por tabela. A exclusão repete o critério de
expiração dentro da transação; se uma sessão ou limite for renovado após a seleção, o registro é
ignorado. Execuções concorrentes são idempotentes e podem selecionar os mesmos registros sem
causar falha.

## Execução

O modo padrão apenas lista os candidatos no log estruturado:

```sh
bun --env-file=.env.local --conditions=react-server scripts/cleanup-auth.ts
```

Para excluir os candidatos elegíveis:

```sh
bun --env-file=.env.local --conditions=react-server scripts/cleanup-auth.ts --apply
```

Agende a execução diária fora do processo web. Em produção, envie o log estruturado para o destino
de observabilidade e alerte quando o processo terminar com código diferente de zero. O script deve
receber a mesma `DATABASE_URL` da aplicação e ser executado uma vez por ambiente.

Script sugerido para `package.json`:

```json
"auth:cleanup": "bun --env-file=.env.local --conditions=react-server scripts/cleanup-auth.ts"
```
