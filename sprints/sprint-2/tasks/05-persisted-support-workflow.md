# 05 — Persistir o suporte e criar a caixa operacional

## Objetivo

Transformar o formulário atual em um registro confiável de suporte, mantendo o e-mail como
notificação e canal de resposta.

## Contexto

Atualmente `sendSupportRequest` valida o formulário e envia o e-mail diretamente. Não existe registro
da solicitação no banco. Uma falha do Resend perde a mensagem, e a equipe não possui histórico por
loja dentro do produto.

## Implementação esperada

- criar modelo e migração para solicitação de suporte;
- armazenar loja, solicitante, e-mail de resposta, categoria, assunto, mensagem e datas;
- adicionar estados `NEW`, `IN_PROGRESS` e `RESOLVED`;
- persistir antes de tentar a notificação por e-mail;
- registrar estado e última tentativa da notificação, sem guardar payload do provedor;
- considerar a solicitação recebida quando a persistência funcionar, mesmo se o e-mail falhar;
- manter a notificação para o endereço profissional de suporte;
- criar lista global com busca/filtros e resumo das informações;
- mostrar solicitações recentes no detalhe da loja;
- criar visualização com mensagem, contexto da loja, estado e nota interna curta;
- permitir abrir uma resposta no cliente de e-mail usando o endereço capturado;
- auditar mudança de estado e nota interna.

## Regras de dados

- a mensagem original é imutável;
- a nota interna nunca aparece para o lojista nem é enviada no e-mail;
- o e-mail do solicitante é preservado no registro para manter o contexto histórico;
- falha de notificação deve ficar visível para a equipe;
- retentativa manual de notificação pode existir se for simples e idempotente;
- conteúdo de mensagem e nota não entra no log técnico nem na trilha genérica de auditoria.

## Critérios de aceite

- [ ] cada envio válido cria exatamente uma solicitação persistida;
- [ ] falha do e-mail não apaga o registro nem mostra falso erro de perda ao lojista;
- [ ] sucesso e falha da notificação aparecem no Super Admin;
- [ ] lista filtra por estado, categoria, loja e período;
- [ ] detalhe permite mudar estado e manter uma nota interna;
- [ ] resposta ocorre pelo cliente de e-mail, sem simular thread na aplicação;
- [ ] usuário de uma loja não lê solicitações de outra loja;
- [ ] testes cobrem persistência, falha do provedor, autorização e transições de estado.

## Validação

- enviar solicitação com Resend disponível e indisponível;
- confirmar que a notificação contém o contexto atual e `replyTo` correto;
- testar textos longos, caracteres especiais e limites do contrato;
- revisar mascaramento de dados em logs e erros;
- rodar lint, typecheck, testes relacionados e build.

## Fora do escopo

- conversa ou resposta dentro do Tua Vitrine;
- anexos;
- prioridade, SLA, atribuição e filas;
- notificações no painel do lojista;
- integração com ferramenta externa de help desk.
