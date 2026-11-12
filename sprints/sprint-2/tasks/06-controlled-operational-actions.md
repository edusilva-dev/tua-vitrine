# 06 — Criar ações operacionais controladas

## Objetivo

Disponibilizar o conjunto mínimo de ações necessárias para resolver incidentes comuns sem edição
direta no banco.

## Contexto

Uma ação do Super Admin pode afetar acesso, publicação ou plano. Cada operação deve ser específica,
reversível quando possível, confirmada e auditada.

## Implementação esperada

- modelar separadamente bloqueio administrativo e publicação da vitrine;
- permitir bloquear e reativar o acesso administrativo de uma loja;
- permitir despublicar e republicar a vitrine;
- permitir reenviar confirmação de e-mail pelo fluxo oficial de autenticação;
- permitir encerrar um trial quando a regra de negócio aceitar a operação;
- criar concessão manual temporária de plano com plano, expiração e motivo;
- integrar a concessão à resolução central de permissões e limites;
- exigir confirmação e motivo em todas as ações;
- impedir operações redundantes ou incompatíveis com mensagem clara;
- registrar auditoria de sucesso e falha.

## Regras de segurança

- bloqueio não exclui conta, loja, catálogo, cobrança ou histórico;
- despublicação não cancela assinatura nem bloqueia o lojista;
- concessão manual não cria nem modifica objetos na Stripe;
- expiração da concessão ocorre pelas regras de leitura, sem depender de job para revogar permissões;
- reenvio de confirmação não revela se outro endereço possui conta;
- endpoints são específicos e nunca aceitam um objeto de atualização arbitrário.

## Critérios de aceite

- [ ] bloqueio impede o painel da loja e preserva seus dados;
- [ ] reativação restaura o acesso sem alterar associações;
- [ ] despublicação remove a vitrine pública e preserva o painel;
- [ ] concessão manual respeita plano e expiração em todas as verificações de limite;
- [ ] assinatura Stripe continua visível e independente da concessão;
- [ ] cada ação exige motivo e confirmação;
- [ ] ações repetidas são idempotentes ou rejeitadas de forma explícita;
- [ ] testes cobrem autorização, transições, expiração e isolamento entre lojas.

## Validação

- testar cada transição e sua reversão em uma loja de teste;
- validar painel, vitrine e limites antes e depois das ações;
- avançar o relógio nos testes para validar expiração da concessão;
- rodar lint, typecheck, testes de auth/planos, suíte relacionada e build.

## Fora do escopo

- excluir loja;
- editar conta, senha ou e-mail do lojista;
- alterar produtos pelo Super Admin;
- reembolsar ou cancelar cobrança diretamente;
- concessão permanente sem data de expiração.
