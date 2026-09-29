# Armazenamento de imagens

Em desenvolvimento, o app grava fora de `public/`, em `./work/storage`. Quando as cinco variáveis
`R2_*` estão presentes, usa o Cloudflare R2 pela API compatível com S3. O banco guarda
a chave do objeto; não armazena os bytes.

## Upload e entrega

O app aceita JPEG, PNG e WebP de até 5 MB, valida o conteúdo com Sharp, converte para WebP e grava em
`stores/{storeId}/{id}.webp`. Assets do R2 são exibidos diretamente por `R2_PUBLIC_URL`, sem passar
pela aplicação ou pelo otimizador de imagens do Next.js. A rota `/api/assets/[id]` atende somente o
armazenamento local de desenvolvimento.

As credenciais `R2_ACCESS_KEY_ID` e `R2_SECRET_ACCESS_KEY` ficam somente no servidor. Gere um token
com permissão de leitura e escrita restrito ao bucket `tua-vitrine`. A URL `r2.dev` serve para testes;
antes do lançamento, substitua `R2_PUBLIC_URL` por um domínio customizado conectado ao bucket para
usar cache e controles de produção da Cloudflare.

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
