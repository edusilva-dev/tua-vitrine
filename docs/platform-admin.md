# Operação do Super Admin

O Super Admin usa uma autorização própria, separada das associações de lojas. Somente usuários com
e-mail verificado e uma concessão ativa em `PlatformAdmin` acessam `/super-admin` e
`/api/super-admin/*`.

## Conceder acesso

Execute no ambiente desejado, usando o e-mail de uma conta já cadastrada e verificada:

```bash
bun run platform-admin grant administrador@exemplo.com
```

O comando pode reativar uma concessão anteriormente revogada. Ele não associa o usuário a nenhuma
loja e não existe equivalente na interface pública.

## Revogar acesso

```bash
bun run platform-admin revoke administrador@exemplo.com
```

A revogação é consultada no banco a cada nova requisição e interrompe o acesso imediatamente, sem
remover sessões, lojas ou associações do usuário. Em caso de suspeita de comprometimento, revogue a
concessão e também encerre as sessões da conta pelo procedimento de autenticação.

## Sessão e autenticação reforçada

O acesso usa a sessão autenticada e o e-mail verificado do Better Auth. A sessão atual expira em sete
dias e é renovada após um dia de atividade, conforme a configuração geral do produto. A área interna
não reduz essa validade isoladamente porque o Better Auth não oferece uma política por rota nesta
configuração. 2FA e reautenticação específica para operações sensíveis devem ser avaliados antes de
ampliar as capacidades do Super Admin.

## Regras operacionais

- nunca conceda acesso por domínio de e-mail ou variável de ambiente;
- use contas individuais; não compartilhe credenciais administrativas;
- conceda acesso apenas no ambiente necessário;
- revogue o acesso assim que ele deixar de ser necessário;
- não edite `PlatformAdmin` por endpoints ou formulários do produto.

## Auditoria administrativa

Mutações do Super Admin registram um evento imutável com administrador, loja, ação, resultado,
motivo e snapshots operacionais mínimos. Respostas completas de integrações, mensagens de suporte,
tokens e dados de pagamento não entram nesses registros. A aplicação não oferece rotas de edição ou
exclusão da auditoria.

Os registros devem ser preservados por no mínimo 24 meses. Uma rotina de limpeza só pode ser criada
depois que a política de retenção for revisada; até lá, não há exclusão automática. A consulta e os
filtros da trilha serão entregues na tarefa 07 da Sprint 2.
