# Armazenamento de imagens

Em desenvolvimento, STORAGE_DRIVER=local grava fora de public/, no diretório definido por
STORAGE_DIR. Em produção, STORAGE_DRIVER=vercel-blob grava no Vercel Blob e entrega imagens pelo CDN.
O banco guarda a referência do objeto; não armazena os bytes.

## Upload e entrega

O app aceita JPEG, PNG e WebP de até 5 MB, valida o conteúdo com Sharp, converte para WebP e grava sob
stores/{storeId}/. O Blob de produção deve ser público porque as fotos pertencem à vitrine. O token
BLOB_READ_WRITE_TOKEN fica somente no servidor.

A rota /api/assets/[id] atende arquivos locais e referências legadas. URLs diretas só são aceitas em
HTTPS sob *.blob.vercel-storage.com.

## Limpeza

~~~sh
bun --env-file=.env.local --conditions=react-server scripts/cleanup-assets.ts --dry-run
bun --env-file=.env.local --conditions=react-server scripts/cleanup-assets.ts --apply
~~~

O modo padrão apenas lista candidatos. --apply remove até 100 uploads com mais de 24 horas que não
estão ligados a produto, logo ou campanha. A seleção é revalidada no banco antes da exclusão.

No armazenamento local, falhas físicas ficam registradas em STORAGE_DIR/.cleanup para nova
tentativa. No Vercel Blob, execute a rotina por um operador controlado; não exponha a limpeza como
endpoint público. Falha na remoção de imagem nunca deve bloquear catálogo ou venda.
