# Armazenamento de imagens

Em desenvolvimento, o app grava fora de `public/`, em `./work/storage`. Quando as quatro variáveis
`R2_*` estão presentes, usa o bucket privado Cloudflare R2 pela API compatível com S3. O banco guarda
a chave do objeto; não armazena os bytes.

## Upload e entrega

O app aceita JPEG, PNG e WebP de até 5 MB, valida o conteúdo com Sharp, converte para WebP e grava em
`stores/{storeId}/{id}.webp`. O bucket permanece privado. A rota `/api/assets/[id]` verifica se a
imagem pertence a uma vitrine ativa ou ao lojista autenticado antes de buscá-la no R2. Imagens
públicas recebem cache no CDN da Vercel; rascunhos usam `private, no-store`.

As credenciais `R2_ACCESS_KEY_ID` e `R2_SECRET_ACCESS_KEY` ficam somente no servidor. Gere um token
com permissão de leitura e escrita restrito ao bucket `tua-vitrine`.

## Migração do Vercel Blob

Referências antigas `*.blob.vercel-storage.com` continuam funcionando enquanto a migração não for
executada. Com as variáveis do R2 configuradas no ambiente que acessa o banco de produção:

~~~sh
bun run assets:migrate-r2
bun run assets:migrate-r2 --apply
~~~

O primeiro comando informa quantos registros serão migrados. `--apply` baixa cada imagem pública,
envia ao R2 e só então troca a referência no banco. Falhas permanecem apontando para o Blob e podem
ser repetidas com segurança. Depois de confirmar que não restam candidatos e validar a vitrine, o
store antigo pode ser removido pelo painel da Vercel.

## Limpeza

~~~sh
bun --conditions=react-server scripts/cleanup-assets.ts --dry-run
bun --conditions=react-server scripts/cleanup-assets.ts --apply
~~~

O modo padrão apenas lista candidatos. --apply remove até 100 uploads com mais de 24 horas que não
estão ligados a produto, logo ou campanha. A seleção é revalidada no banco antes da exclusão.

No armazenamento local, falhas físicas ficam registradas em `./work/storage/.cleanup` para nova
tentativa. No R2, execute a rotina por um operador controlado; não exponha a limpeza como endpoint
público. Falha na remoção de imagem nunca deve bloquear catálogo ou venda.
