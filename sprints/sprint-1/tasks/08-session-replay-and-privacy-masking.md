# 08 — Habilitar Session Replay e validar privacy masking

## Objetivo

Disponibilizar replay consentido para diagnóstico de UX, aplicar mascaramento conservador e aprovar a
segurança das gravações antes da produção.

## Contexto

Replay reconstrói a interface e pode revelar dados sensíveis mesmo sem eventos customizados. A tarefa
05 já estabelece o consentimento do browser; esta tarefa conecta replay a esse controle, classifica
as telas e executa uma auditoria bloqueante.

## Implementação esperada

- habilitar replay primeiro no projeto PostHog não produtivo;
- iniciar gravação somente quando analytics estiver autorizado;
- configurar `maskAllInputs: true` e mascaramento de texto por padrão;
- aplicar `ph-no-capture` em auth, suporte, feedback, billing, dados pessoais e conteúdo livre;
- liberar texto apenas em elementos estáticos classificados como seguros;
- desabilitar captura de console, rede, bodies, headers e canvas;
- remover query string e fragmentos das URLs de replay;
- impedir gravação em preview;
- associar replay a usuário apenas no admin autenticado e a grupo de loja quando disponível;
- definir amostragem inicial baixa e ajustável, retenção e responsáveis de acesso;
- auditar eventos e replays com dados sentinela em todos os fluxos críticos.

## Arquivos/áreas afetadas

- `instrumentation-client.ts`
- provider/módulo de consentimento e observability
- layouts e marcadores de rota necessários
- telas de auth, onboarding, settings, support, feedback e billing
- componentes de storefront e carrinho
- testes unitários e E2E de replay/privacidade
- configuração de replay, retenção e permissões no PostHog

## Critérios de aceite

- [ ] replay só inicia após consentimento aceito;
- [ ] rejeição ou revogação impede novos snapshots;
- [ ] inputs e textos ficam mascarados por padrão;
- [ ] URLs não exibem query string, hash, token ou `session_id`;
- [ ] console e tráfego de rede não são capturados;
- [ ] auth, billing, suporte, feedback e preview não vazam conteúdo;
- [ ] sem token/consentimento, nenhum snapshot é enviado;
- [ ] acesso, amostragem e retenção estão documentados;
- [ ] um replay de teste pode ser localizado por evento consentido;
- [ ] nenhum dado proibido aparece em payload ou replay.

## Validação

- gravar sessões sintéticas em desktop e 390 px;
- preencher valores falsos exclusivos em e-mail, senha, telefone, nome, suporte, produto e busca e
  procurar por eles no replay;
- navegar com query params sentinela e confirmar redaction;
- verificar requests de ingestão antes/depois do consentimento e após revogação;
- assistir replays de cadastro, login, onboarding, produtos, settings, suporte, billing, vitrine e
  carrinho;
- lint, typecheck, testes e build.

## Observações

Começar com máscara máxima é intencional. Conteúdo só pode ser liberado seletivamente depois de ser
classificado como público/seguro. Qualquer dado proibido visível bloqueia o rollout.

## Decisão de implementação em 04/11/2026

- Replay permanece desligado na inicialização do SDK e indisponível em produção. Em desenvolvimento
  ou staging, inicia apenas após a preferência de analytics aceita e em rotas classificadas.
- A amostragem inicial é 10% em staging e 100% no desenvolvimento local para permitir a auditoria.
  Rotas de autenticação, cobrança, suporte, configurações, preview e
  páginas não classificadas ficam sem replay. A vitrine pública e as telas administrativas de
  catálogo, métricas e campanhas são as superfícies iniciais.
- O SDK mascara todos os inputs, textos e atributos; bloqueia campos ocultos/arquivo, carrinho e
  formulário de feedback. URLs de replay perdem query e fragmento; metadados de rede são recusados.
  Console, bodies, headers, canvas e JSON-LD ficam desabilitados no adaptador.
- O projeto PostHog de desenvolvimento `710815` já permite gravação e está configurado com retenção
  de 30 dias. Acesso, política final e auditoria de sentinelas ainda dependem de validação.
- A ativação em produção continua bloqueada pela decisão da tarefa 05 e pela auditoria desta tarefa.

## Evidência local inicial

- Playwright em desktop e 390 px interceptou o host PostHog de teste: sem snapshot antes do aceite;
  FullSnapshot e Mutation após aceite/interação; sem novos snapshots no preview ou após revogação.
- O teste descompactou o request e os campos gzip internos dos snapshots antes de procurar sentinelas
  de query string, texto, atributo e campo oculto. Nenhuma sentinela apareceu no payload decodificado.
- Lint, typecheck, testes e build passaram. A auditoria manual de todas as telas e a inspeção da
  gravação no PostHog de desenvolvimento ainda são pendentes e bloqueiam a conclusão da tarefa.
