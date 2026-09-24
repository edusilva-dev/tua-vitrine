# Armazenamento e limpeza de uploads

O adapter local guarda imagens fora de `public/`. Banco e diretório `STORAGE_DIR` formam um conjunto: app no WSL e app no Docker só podem compartilhar o banco se também enxergarem os mesmos arquivos. Faça backup e restauração de ambos juntos. Uma instância com volume persistente é o limite deste adapter; múltiplas réplicas exigem storage compartilhado ou um adapter de objetos.

## Paridade WSL e Docker

O Compose padrão mantém o volume `uploads` existente. Ao alternar entre Bun no WSL e Docker contra o mesmo banco, use `compose.wsl.yml`, que monta `./work/storage` nos dois ambientes. Não aponte o app para um diretório vazio quando o banco já contém fotos.

Antes de mudar uma instalação com uploads no volume Docker, pare apenas o app e preserve uma cópia do volume. Copie seus arquivos para uma pasta temporária, por exemplo `work/uploads-export`, sem apagar o volume original. O importador compara conteúdo dos nomes coincidentes e recusa conflitos antes de copiar:

```sh
bun scripts/import-storage.ts work/uploads-export work/storage
bun scripts/import-storage.ts work/uploads-export work/storage --apply
docker compose -f compose.yml -f compose.wsl.yml --profile app up -d --build --wait
```

O importador copia somente imagens WebP com chaves geradas pelo app; não sobrescreve arquivos nem remove a origem. Manifestos de limpeza, quando existentes, precisam permanecer junto do volume antigo até sua rotina terminar. Verifique fotos de lojas existentes após a mudança. O diretório do host deve permitir escrita pelo UID do usuário `bun` do contêiner. Nunca execute simultaneamente limpeza com configurações de armazenamento divergentes.

## Uploads abandonados

Execute com Bun e a condição `react-server`, que permite importar módulos `server-only` em scripts:

```sh
bun --env-file=.env.local --conditions=react-server scripts/cleanup-assets.ts --dry-run
bun --env-file=.env.local --conditions=react-server scripts/cleanup-assets.ts --apply
```

Sem argumentos, o comando apenas lista candidatos. `--apply` remove até 100 registros por execução, exclusivamente uploads com mais de 24 horas sem nenhuma referência de produto ou logo. Produtos arquivados continuam protegendo suas imagens. Execute a simulação no ambiente alvo e confirme que o diretório corresponde ao banco antes da aplicação. Agende novas execuções se houver mais de um lote.

A seleção é revalidada no `DELETE` e as foreign keys protegem contra associação concorrente a produtos ou logos. Um conflito é reportado, preservando o arquivo. A aplicação não remove um arquivo antes da exclusão confirmada no PostgreSQL.

Para recuperar falhas entre banco e filesystem, cada exclusão escreve primeiro um manifesto em `STORAGE_DIR/.cleanup`. Se a exclusão física falhar ou o processo parar, a próxima execução com `--apply` verifica que o registro já não existe e tenta remover o arquivo novamente. O diretório de manifestos deve permanecer no mesmo volume persistente das imagens. Erros resultam em código de saída 1 e logs estruturados; arquivos ausentes são tratados como exclusão já concluída pelo adapter.

Limitações: essa rotina não varre arquivos sem registro no banco e sem manifesto (por exemplo, queda do processo durante o upload antes da criação do registro). Esses resíduos exigem reconciliação específica futura. Manifestos criados antes de uma exclusão recusada permanecem para a próxima execução; são inofensivos e nunca autorizam remoção de um arquivo ainda registrado. A garantia cobre interrupção do processo e falhas de I/O reportadas; recuperação de perda total do volume depende de backup. Não expor essa rotina como endpoint público.
