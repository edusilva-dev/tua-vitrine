# Privacidade das métricas de produto

## Escopo atual

O PostHog recebe somente eventos enumerados em
`modules/observability/contracts/events.ts`. Payloads livres, nomes, e-mails, telefones, mensagens,
buscas e nomes de produtos ficam fora do contrato. Autocapture, pageview automático e session replay
estão desativados.

Na landing page e na vitrine pública, o navegador captura automaticamente em `cookieless_mode:
"always"`, com `person_profiles: "never"`. O SDK não usa cookies, localStorage ou sessionStorage, e o
IP é removido pelo PostHog antes do enriquecimento. O adaptador do navegador também remove
`store_id` e `product_id` antes do envio. Identificação e grupos não são executados no browser.

No painel, a preferência usa estado versionado (`unknown`, `accepted` ou `rejected`) no armazenamento
local. Eventos com superfície administrativa só são enviados em `accepted`; landing page e storefront
continuam agregadas independentemente dessa escolha. O aceite e a revogação passam a valer sem reload.

## Servidor

Não há base aprovada nem preferência consultável por webhooks e rotinas administrativas. Por isso,
`POSTHOG_SERVER_ENABLED` continua `false` em produção, independentemente da presença das credenciais.
Ativar eventos server-side exige uma decisão registrada:

- por consentimento: persistir a escolha vinculada ao usuário ou à loja e consultá-la em todo produtor
  de eventos, inclusive webhooks, com falha fechada para analytics;
- por legítimo interesse: registrar avaliação, finalidade, minimização, retenção e oposição, e aplicar
  a oposição também no servidor.

Essa decisão deve ser revisada pela pessoa responsável pelo produto antes de qualquer alteração no
gate de produção em `lib/server/env.ts`.

## Retenção e acesso

- eventos do navegador: até 90 dias;
- session replay: desativado;
- revisão de membros e retenção do projeto: mensal, pela pessoa administradora do produto;
- acesso: somente responsáveis por produto e engenharia;
- solicitações: `suporte@usetuavitrine.com.br`.

Eventos do navegador não contêm identificadores internos nem perfis e, por isso, não permitem localizar
uma pessoa específica no PostHog. Solicitações sobre coleta e retenção são registradas e respondidas
pelo suporte. Nenhum conteúdo livre deve ser usado para localizar ou enriquecer perfis.

## Limites

Esses controles técnicos não são uma declaração de conformidade legal. Textos, base aplicável,
retenção efetiva e processo de atendimento precisam de revisão periódica. A captura server-side em
produção permanece desativada enquanto essa revisão não for concluída.
