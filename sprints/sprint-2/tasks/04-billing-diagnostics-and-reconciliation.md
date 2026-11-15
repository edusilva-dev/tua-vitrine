# 04 — Adicionar diagnóstico de cobrança e reconciliação

## Objetivo

Permitir que a equipe compare o estado local da assinatura com a Stripe e corrija divergências usando
a regra oficial de sincronização.

## Contexto

Webhooks podem atrasar ou falhar. O painel deve explicar o que está salvo e permitir uma reconciliação
intencional, sem criar uma segunda implementação das regras de cobrança.

## Implementação esperada

- mostrar plano, status, período, trial e cancelamento persistidos localmente;
- fornecer links seguros para cliente e assinatura no Dashboard da Stripe;
- mostrar o último webhook conhecido relacionado quando houver dados suficientes;
- criar ação explícita de reconciliação manual;
- consultar a Stripe somente ao executar a ação;
- extrair/reutilizar a regra central utilizada pelos webhooks;
- tratar assinatura inexistente, cancelada, incompleta e cliente sem assinatura;
- tornar a ação idempotente e exigir motivo;
- registrar resultado, diferença encontrada e auditoria sem dados de pagamento.

## Critérios de aceite

- [x] a tela diferencia estado local de informação obtida na reconciliação;
- [x] reconciliação atualiza o banco conforme a mesma regra dos webhooks;
- [x] repetir a operação sem mudança não corrompe datas ou estado;
- [x] falha da Stripe não altera parcialmente a assinatura local;
- [x] ação exige confirmação e motivo;
- [x] toda tentativa gera auditoria com sucesso ou falha;
- [x] testes cobrem assinatura ativa, cancelada, ausente e erro remoto;
- [x] nenhuma chave Stripe ou dado de pagamento chega ao cliente.

## Validação

- testar com mocks/fixtures oficiais da Stripe e eventos já suportados;
- simular divergência local e confirmar o estado reconciliado;
- simular timeout/falha da Stripe e verificar atomicidade;
- rodar lint, typecheck, testes de cobrança, suíte relacionada e build.

## Fora do escopo

- reembolso;
- criação ou troca manual de assinatura;
- edição de forma de pagamento;
- reprodução arbitrária de webhook;
- histórico financeiro completo.
