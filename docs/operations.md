# Operação e recuperação

## Ambientes

| Recurso | Local e testes | Produção |
| --- | --- | --- |
| Aplicação | Bun no WSL | Vercel |
| PostgreSQL | Compose em localhost:55432 | Neon |
| Imagens | STORAGE_DRIVER=local | Vercel Blob |
| E-mail | arquivo local | Resend |
| Cobrança | desabilitada ou Stripe test | Stripe |

Arquivos .env reais nunca são versionados. .env.example documenta o ambiente local e
.env.vercel.example documenta as variáveis da Vercel. Nenhuma credencial pode chegar ao cliente.

## Saúde e deploy

- /api/health/live confirma que o processo responde.
- /api/health/ready confirma acesso ao banco.
- Migrações usam bun run db:deploy com a conexão direta do Neon.
- migrate dev, db push e o seed demonstrativo não devem rodar em produção.
- Prefira migrações compatíveis com a versão anterior; reverter um deployment não reverte o schema.

Depois de cada deploy, valide cadastro, confirmação de e-mail, login, painel, upload de imagem,
vitrine pública, checkout e portal de cobrança. Consulte os logs da Vercel para falhas de runtime.

## Backup e restauração

O Neon é a fonte do catálogo e o Vercel Blob é a fonte das imagens. A política de recuperação deve
cobrir os dois serviços:

1. confirme a retenção e o point-in-time restore do branch de produção no Neon;
2. mantenha inventário dos objetos do Blob e uma rotina de exportação independente;
3. ensaie a restauração em um branch Neon e ambiente Vercel separados;
4. valide contagens, variantes, campanhas e renderização das imagens antes de considerar o ensaio
   concluído.

Nunca teste restauração sobre o branch de produção. Antes de uma migração destrutiva, crie um ponto de
recuperação e registre o procedimento de rollback.
