# Operação e recuperação

## Ambientes

| Variável | Local | Futuro staging/produção |
| --- | --- | --- |
| APP_ENV | development ou test | staging ou production, após auth |
| APP_URL | http://localhost:3000 | URL HTTPS canônica |
| LOCAL_ONLY | true | remover modo inseguro somente após auth |
| DATABASE_URL | PostgreSQL isolado 55432 | segredo do ambiente |
| STORAGE_DIR | ./work/storage ou /data/storage | volume único; depois adapter S3 |

Nunca versionar arquivos .env com valores reais. .env.example contém apenas valores públicos locais. Validar configuração no servidor; nenhuma URL de banco chega ao cliente. Não montar diretório de upload dentro de .next ou public.

## Saúde e implantação

/api/health/live indica processo respondendo. /api/health/ready verifica dependências necessárias, incluindo banco. Compose espera pg_isready antes de iniciar o app; readiness não aplica migrações.

Fluxo futuro: backup → migração única (bun run db:deploy) → iniciar imagem aprovada → readiness → smoke test. Não executar migrate dev, db push ou seed demonstrativo em produção. Migrações devem ser compatíveis com a versão anterior durante rollout; rollback de imagem não desfaz schema. Uma migração destrutiva exige estratégia específica de restauração.

Dockerfile separa dependências, build e runtime e executa como usuário bun. CI verifica build real; atualizar tags/digests somente com os mesmos checks. Sem segredos no build. Nenhum serviço público está sendo implantado nesta etapa.

## Backup local

Crie a pasta work/backups. Para capturar banco:

```sh
mkdir -p work/backups
docker compose exec -T db pg_dump -U tuavitrine -d tuavitrine -Fc > work/backups/store.dump
```

Para fotos no app Docker:

```sh
docker compose exec -T app tar -C /data/storage -cf - . > work/backups/uploads.tar
```

No desenvolvimento sem app Docker, faça archive de work/storage. Banco e arquivos precisam de backup conjunto: pause escritas durante captura para manter consistência. Em produção futura, manter backups criptografados fora do host, com retenção e objetivo de recuperação definidos antes do lançamento.

## Ensaio de restauração isolado

Nunca ensaiar restauração sobre o banco do usuário ou sobre a única cópia do catálogo.

```sh
docker compose exec -T db createdb -U tuavitrine tuavitrine_restore
docker compose exec -T db pg_restore -U tuavitrine -d tuavitrine_restore --no-owner < work/backups/store.dump
```

Restaure uploads em outro diretório/volume e execute app de verificação apontando para o banco de ensaio e pasta restaurada. Confira contagens, produto com variantes e renderização de fotos. Só um backup restaurado e validado demonstra recuperação. Remova recursos do ensaio apenas após conferência explícita do alvo.

## Paridade e limites

Banco host usa localhost:55432; dentro do Compose usa db:5432. Não compartilhar node_modules Windows com WSL. Portas públicas e credenciais locais deste Compose não são um template de produção. Em Docker, NODE_ENV production com APP_ENV development permite testar o build local sem afirmar que há autenticação pronta.

Volumes sobrevivem à recriação de contêineres, mas não substituem backup. Uma única instância mantém storage local; réplicas exigem storage compartilhado e revisão de cache, sessões e métricas.
