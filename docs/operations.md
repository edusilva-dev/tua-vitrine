# Operação e recuperação

## Ambientes

| Recurso | Local e testes | Produção |
| --- | --- | --- |
| Aplicação | Bun no WSL | Vercel |
| PostgreSQL | Compose em localhost:55432 | Neon |
| Imagens | filesystem local automático | Cloudflare R2 público com URL direta |
| E-mail | arquivo local | Resend |
| Cobrança | desabilitada ou Stripe test | Stripe |

Arquivos .env reais nunca são versionados. .env.example documenta o ambiente local e
.env.vercel.example documenta as variáveis da Vercel. Nenhuma credencial pode chegar ao cliente.

## Saúde e deploy

- /api/health/live confirma que o processo responde.
- /api/health/ready confirma acesso ao banco.
- Antes de compilar cada deploy, a Vercel executa bun run vercel-build; esse comando aplica
  bun run db:deploy com a conexão direta do Neon e só então gera o build da aplicação.
- migrate dev, db push e o seed demonstrativo não devem rodar em produção.
- Prefira migrações compatíveis com a versão anterior; reverter um deployment não reverte o schema.

Depois de cada deploy, valide cadastro, confirmação de e-mail, login, painel, upload de imagem,
vitrine pública, checkout e portal de cobrança. Consulte os logs da Vercel para falhas de runtime.

## Backup e restauração

O Neon é a fonte do catálogo e o Cloudflare R2 é a fonte das imagens. A política de recuperação deve
cobrir os dois serviços:

1. confirme a retenção e o point-in-time restore do branch de produção no Neon;
2. mantenha inventário dos objetos do R2 e uma rotina de exportação independente;
3. ensaie a restauração em um branch Neon e ambiente Vercel separados;
4. valide contagens, variantes, campanhas e renderização das imagens antes de considerar o ensaio
   concluído.

Nunca teste restauração sobre o branch de produção. Antes de uma migração destrutiva, crie um ponto de
recuperação e registre o procedimento de rollback.
## Retenção da auditoria administrativa

Os eventos de auditoria do Super Admin são imutáveis pela aplicação e devem ser mantidos por, no
mínimo, 24 meses. Não existe limpeza automática nesta sprint. Qualquer política futura de expurgo
deve preservar esse prazo, ser executada por uma rotina interna controlada e registrar a quantidade
e o intervalo removidos fora da própria tabela de auditoria.
