#!/bin/sh
set -eu

if [ "$#" -ne 1 ]; then
  echo "Uso: $0 /diretorio/absoluto/de/backups" >&2
  exit 2
fi

backup_root=$1
case "$backup_root" in
  /*) ;;
  *) echo "O diretório de backup deve ser um caminho absoluto." >&2; exit 2 ;;
esac

if [ "$backup_root" = "/" ]; then
  echo "A raiz do sistema não pode ser usada como diretório de backup." >&2
  exit 2
fi

script_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
project_dir=$(dirname -- "$script_dir")
env_file="$project_dir/.env.production"
compose_file="$project_dir/compose.production.yml"

if [ ! -f "$env_file" ]; then
  echo "Arquivo ausente: $env_file" >&2
  exit 1
fi

mkdir -p -- "$backup_root"
chmod 700 -- "$backup_root"

timestamp=$(date -u +%Y%m%dT%H%M%SZ)
snapshot="$backup_root/$timestamp"
partial="$snapshot.incomplete"

if [ -e "$snapshot" ] || [ -e "$partial" ]; then
  echo "O snapshot já existe: $snapshot" >&2
  exit 1
fi

mkdir -m 700 -- "$partial"
app_stopped=false

compose() {
  docker compose --env-file "$env_file" -f "$compose_file" "$@"
}

restart_app() {
  if [ "$app_stopped" = true ]; then
    compose start app >/dev/null
  fi
}

trap restart_app EXIT INT TERM

if ! compose ps --status running --services db | grep -qx db; then
  echo "O serviço db precisa estar em execução." >&2
  exit 1
fi

if ! compose ps --status running --services app | grep -qx app; then
  echo "O serviço app precisa estar em execução." >&2
  exit 1
fi

compose stop app >/dev/null
app_stopped=true

compose exec -T db sh -c 'exec pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' \
  > "$partial/database.dump"
compose run --rm --no-deps --entrypoint tar app -C /data/storage -cf - . \
  > "$partial/uploads.tar"

compose exec -T db sh -c 'exec pg_restore -l' < "$partial/database.dump" >/dev/null
tar -tf "$partial/uploads.tar" >/dev/null

(
  cd "$partial"
  sha256sum database.dump uploads.tar > sha256sums.txt
)

cat > "$partial/metadata.txt" <<EOF
created_at=$timestamp
compose_project=tua-vitrine-production
postgres_image=postgres:16.10-alpine
EOF

chmod 600 "$partial"/*
mv -- "$partial" "$snapshot"

restart_app
app_stopped=false
trap - EXIT INT TERM

echo "Backup concluído: $snapshot"
