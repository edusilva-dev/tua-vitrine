# Implantação de referência em uma VPS

Esta referência executa uma única instância do app, PostgreSQL e Caddy no mesmo host. Somente
as portas 80 e 443 ficam públicas. O app é acessível apenas pelo Caddy e o banco permanece em
uma rede Docker interna. Caddy emite e renova certificados TLS e substitui os cabeçalhos de IP
encaminhados pelo endereço real da conexão.

## Pré-requisitos

- VPS Linux com Docker Engine e Compose v2 atualizados;
- DNS A/AAAA de `APP_DOMAIN` apontando para a VPS;
- portas TCP 80/443 e UDP 443 liberadas;
- SMTP com TLS e remetente validado;
- diretório externo ao repositório para backups, idealmente replicado para outro host;
- imagem revisada ou capacidade de construí-la na VPS.

O arquivo `.env.production` contém segredos e não deve ser versionado. Copie o exemplo, restrinja
suas permissões e substitua todos os valores de exemplo:

```sh
cp .env.production.example .env.production
chmod 600 .env.production
```

Gere `POSTGRES_PASSWORD` e `BETTER_AUTH_SECRET` com uma fonte criptograficamente segura. A senha
na `DATABASE_URL` precisa de percent-encoding quando contiver caracteres reservados de URL. O
host do banco na URL é `db`, nunca `localhost`.

## Primeira implantação

Execute a partir da raiz do projeto:

```sh
docker compose --env-file .env.production -f compose.production.yml config --quiet
docker compose --env-file .env.production -f compose.production.yml build app migrate
docker compose --env-file .env.production -f compose.production.yml up -d --wait db
docker compose --env-file .env.production -f compose.production.yml --profile tools run --rm migrate
docker compose --env-file .env.production -f compose.production.yml up -d --wait app caddy
curl --fail --show-error "https://SEU_DOMINIO/api/health/ready"
```

O serviço `migrate` pertence ao profile `tools`: migrações nunca rodam automaticamente ao subir
ou reiniciar o app. Não execute `migrate dev`, `db push` ou seed de demonstração em produção.
Confira também cadastro, confirmação de e-mail, recuperação de senha, upload e uma vitrine pública.

## Atualização e rollback

Antes de atualizar, gere e verifique um snapshot:

```sh
./scripts/backup-production.sh /srv/backups/tua-vitrine
./scripts/restore-verify.sh /srv/backups/tua-vitrine/AAAAmmddTHHMMSSZ
```

Depois obtenha/construa a nova imagem, aplique as migrações uma única vez e recrie o app:

```sh
docker compose --env-file .env.production -f compose.production.yml build app migrate
docker compose --env-file .env.production -f compose.production.yml --profile tools run --rm migrate
docker compose --env-file .env.production -f compose.production.yml up -d --wait app caddy
```

Use tags imutáveis em um registry quando houver pipeline de publicação. Para rollback de código,
restaure a tag anterior em `APP_IMAGE` e recrie `app`. Rollback de imagem não reverte o schema;
migrações precisam permanecer compatíveis com a versão anterior ou ter plano específico de
restauração.

## Backup e recuperação

`backup-production.sh` exige um diretório absoluto. Ele para o app por alguns instantes para
impedir escritas, captura banco e uploads no mesmo snapshot, valida os arquivos, grava checksums e
reinicia o app inclusive quando há falha. O script não remove backups antigos. Defina retenção e
copie snapshots para armazenamento criptografado fora da VPS.

`restore-verify.sh` exige o caminho absoluto de um snapshot. Ele confere checksums e caminhos do
arquivo de uploads, extrai em diretório temporário e restaura o dump em um contêiner PostgreSQL
efêmero. Ele não acessa nem altera o banco de produção. Execute o ensaio periodicamente; existência
de um arquivo sem restauração comprovada não constitui backup confiável.

## Saúde e operação

- `/api/health/live` confirma que o processo responde;
- `/api/health/ready` confirma acesso ao banco;
- `docker compose --env-file .env.production -f compose.production.yml ps` mostra a saúde;
- logs de Caddy e app vão para stdout e devem ser coletados pelo sistema do host;
- monitore disponibilidade, expiração TLS, uso de disco, falhas SMTP, PostgreSQL e idade do último
  backup verificado.

Os volumes `db-data`, `uploads`, `caddy-data` e `caddy-config` sobrevivem à recriação dos
contêineres, mas permanecem no mesmo host e não substituem backups. O volume local de uploads
impõe uma única réplica do app. Escala horizontal exige storage de objetos compartilhado, rate
limiting compartilhado e revisão das tarefas operacionais antes de adicionar réplicas.

Não exponha a porta 3000 nem a 5432 no firewall ou no Compose. O proxy é a única entrada pública.
Não aceite cabeçalhos de IP enviados diretamente por clientes; o Caddy desta referência os
sobrescreve antes de encaminhar a requisição.
