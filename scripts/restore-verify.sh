#!/bin/sh
set -eu

if [ "$#" -ne 1 ]; then
  echo "Uso: $0 /diretorio/absoluto/do/snapshot" >&2
  exit 2
fi

snapshot=$1
case "$snapshot" in
  /*) ;;
  *) echo "O snapshot deve ser informado por caminho absoluto." >&2; exit 2 ;;
esac

for file in database.dump uploads.tar sha256sums.txt; do
  if [ ! -f "$snapshot/$file" ]; then
    echo "Arquivo ausente no snapshot: $file" >&2
    exit 1
  fi
done

(
  cd "$snapshot"
  sha256sum -c sha256sums.txt
)

if tar -tf "$snapshot/uploads.tar" | awk '/^\// || (^|\/)\.\.($|\/)/ { bad=1 } END { exit bad }'; then
  :
else
  echo "O arquivo de uploads contém caminhos inseguros." >&2
  exit 1
fi

work_dir=$(mktemp -d /tmp/tua-vitrine-restore.XXXXXX)
case "$work_dir" in
  /tmp/tua-vitrine-restore.*) ;;
  *) echo "Diretório temporário inesperado: $work_dir" >&2; exit 1 ;;
esac
container="tua-vitrine-restore-verify-$$"

cleanup() {
  docker rm -f "$container" >/dev/null 2>&1 || true
  rm -rf -- "$work_dir"
}

trap cleanup EXIT INT TERM

tar -xf "$snapshot/uploads.tar" -C "$work_dir"

docker run -d --rm \
  --name "$container" \
  -e POSTGRES_DB=restore_verify \
  -e POSTGRES_USER=restore_verify \
  -e POSTGRES_PASSWORD=restore_verify_only \
  postgres:16.10-alpine >/dev/null

attempt=0
until docker exec "$container" pg_isready -U restore_verify -d restore_verify >/dev/null 2>&1; do
  attempt=$((attempt + 1))
  if [ "$attempt" -ge 30 ]; then
    echo "O PostgreSQL temporário não ficou pronto." >&2
    exit 1
  fi
  sleep 1
done

docker exec -i "$container" pg_restore \
  -U restore_verify \
  -d restore_verify \
  --no-owner \
  --no-privileges < "$snapshot/database.dump"

store_count=$(docker exec "$container" psql -U restore_verify -d restore_verify -Atc \
  'SELECT count(*) FROM "Store";')
product_count=$(docker exec "$container" psql -U restore_verify -d restore_verify -Atc \
  'SELECT count(*) FROM "Product";')
upload_count=$(find "$work_dir" -type f | wc -l | tr -d ' ')

echo "Restauração verificada em ambiente isolado."
echo "Lojas: $store_count; produtos: $product_count; arquivos: $upload_count"
