# Design

## Context

Ver `proposal.md` para motivação e escopo. O design é necessário porque a mudança atravessa
contratos, edição, vitrine e enforcement de planos/downgrade.

- `store-settings.tsx` já usa React Hook Form e o PATCH `/api/admin/store`, mas descarta o DTO de
  sucesso e apenas chama `router.refresh()`. Trocar de tab não pode criar outro formulário.
- O contrato atual guarda `primaryColor` e `template` em colunas e `customization` como JSON
  `{ version: 1, tagline }`. A organização e ordenação de categorias já têm implementação própria.
- `effectiveStoreAppearance` e `saveSettings` condicionam modelo/frase ao Profissional.
- `applyStripeSubscription` e `changePlan` resetam modelo e frase junto dos recursos profissionais.
  `tests/integration/plan-enforcement.test.ts` afirma esse comportamento antigo: o teste terá que
  passar a exigir preservação desses campos no Essencial, sem perder a cobertura de Free/campanhas.
- A prévia em `/admin/preview` lê a configuração salva; não acompanha o formulário. Os testes em
  `tests/e2e/storefront.spec.ts` já cobrem sua ausência de métricas.
- `storefront.tsx` define cor primária/contraste localmente e renderiza os cards diretamente.
  `app/globals.css` contém os tokens; `app/layout.tsx` já carrega Inter e Montserrat com `next/font`.
- Foram consultados os guias locais de CSS e fontes do Next instalado: estilos de aparência
  devem ser escopados e fontes podem ser reutilizadas sem requisições externas do navegador.

## Goals / Non-Goals

**Goals:**

- Compartilhar normalização e resolução visual entre servidor, formulário, prévia e vitrine.
- Evoluir o JSON existente sem migração de dados obrigatória nem novos serviços.
- Separar permissões de aparência básica e avançada sem alterar a resolução de assinatura/trial.
- Manter a tela organizada em tabs “Básico” e “Avançado”, sem fluxo de publicação adicional.

**Non-Goals:**

- Criar um construtor genérico de páginas, mecanismo de temas ou renderizador de blocos.
- Refatorar todo o catálogo/carrinho ou tornar a amostra uma segunda vitrine funcional.
- Reprocessar retroativamente cores primárias existentes, alterar a paleta do painel ou adicionar
  modo de tema claro/escuro ao produto nesta mudança.

## Decisions

### 1. Contrato compatível e pequeno

Preservar `primaryColor`, `template`, `catalogGrouping` e `customization.version: 1`. Acrescentar
ao JSON campos opcionais na entrada e normalizados na saída:

| Campo | Valores | Padrão |
| --- | --- | --- |
| `tagline` | texto de até 160 caracteres | string vazia, mantendo a apresentação padrão |
| `backgroundColor` | hexadecimal de seis dígitos ou `null` | `null`, aparência atual |
| `textColor` | hexadecimal de seis dígitos ou `null` | `null`, aparência atual |
| `fontPreset` | `brand`, `simple` | `brand` |
| `cardRoundness` | `square`, `subtle`, `default` | `default` |

`brand` mantém Montserrat nos títulos e Inter no texto; `simple` usa Inter em ambos. Arredondamento
vale apenas para o contorno dos cards: reto, discreto e atual, sem modificar botões ou diálogos.
As opções exatas são defaults de projeto para concretizar o conjunto pequeno aprovado.

Campos ausentes recebem defaults, preservando a frase de JSONs válidos antigos. Dados armazenados
inválidos usam o fallback seguro existente para o bloco. Entradas HTTP inválidas recebem erro;
não usar o fallback de leitura para aceitar uma escrita inválida. Manter tipos de entrada e saída
coerentes com defaults Zod e com o resolver do formulário.

Concentrar constantes, enums e resolução pura de aparência em um módulo compartilhável de
`modules/stores`, sem Prisma ou `server-only`. DTOs continuam explícitos; não criar colunas novas
nem mudar o default Prisma do JSON, pois a leitura normalizada já supre os campos ausentes.

Alternativa descartada: JSON v2 com migração em massa. Não há mudança estrutural que a justifique.

### 2. Permissões e resets por grupo de recursos

Adicionar uma permissão de aparência básica ao contrato de entitlements, ativa no Essencial e
Profissional, para modelo/frase; manter cor na permissão existente e `canUseFullCustomization`
para os novos campos avançados. Usar a mesma matriz ao salvar, produzir DTOs e resolver a prévia.

Normalizar campos fora do plano para seus defaults, preservando a política atual de API.
Validar formato/enums no contrato e verificar contraste sobre a aparência efetivamente permitida
pelo plano; uma cor avançada descartada no Free não deve impedir uma alteração válida do logo.

Compartilhar a normalização com os resets de aparência no serviço de billing, dentro das
transações existentes. Profissional para Essencial mantém modelo, frase e cor, reseta somente os
quatro campos avançados e mantém o tratamento atual de campanhas. Para Free, também reseta cor,
modelo e frase. Não remover catálogo, logo ou categorias; limites de produtos seguem o fluxo atual.

Leituras já normalizam por entitlement efetivo mesmo sem webhook ou escrita de limpeza, cobrindo
trial expirado e perda de acesso pago. Não adicionar cron de reset nem modificar o momento em que
a assinatura perde direitos. Cancelamento agendado não antecipa o reset. No retorno a um plano
superior, não criar mecanismo de restauração de valores anteriormente resetados.

Alternativa descartada: liberar `canUseFullCustomization` no Essencial, pois liberaria também
recursos que continuam exclusivos do Profissional.

### 3. Tokens locais e combinações legíveis

Resolver a aparência em um helper puro e aplicar tokens semânticos apenas no contêiner da
vitrine e da amostra. Os novos overrides de fundo/texto também derivam superfícies e cores
auxiliares coerentes; não expor controles adicionais. Preservar defaults quando não houver
overrides e manter os ajustes avançados quando somente a cor primária mudar.

Validar no servidor o contraste das novas escolhas efetivas de fundo/texto, incluindo quando
somente uma delas for definida. Usar contraste de luminância relativa e limiar 4,5:1 para texto
normal nas superfícies afetadas. Derivar texto auxiliar e foregrounds de controles para manter
legibilidade. Reutilizar a regra no cliente para antecipar o erro, mantendo o servidor autoritativo.

Reutilizar as fontes carregadas e mapear enums para classes/tokens definidos. Não aceitar CSS,
URLs de fontes ou valores livres de raio. Evitar variáveis de fonte autorreferentes e aplicar
o tema também aos conteúdos em portais que usem as novas cores, sem atingir os diálogos do painel.

Alternativa descartada: alterar `:root` durante a edição, que mudaria o próprio painel e poderia
vazar a aparência de uma loja para outra.

### 4. Uma tela, duas tabs e um rascunho

Reorganizar `StoreSettings` preservando React Hook Form, upload, categorias, link e QR code.
Usar o primitive Tabs no padrão shadcn, criando o wrapper em `components/ui` se ainda ausente
com o `radix-ui` já instalado, sem nova dependência. Usar rótulos “Básico” e “Avançado” e “Básico” ativa
inicialmente. Exibir somente o painel ativo, com semântica de tablist/tab/tabpanel, associação
entre tab e painel, seleção anunciada e navegação por teclado. Não criar modos de aparência
persistidos: as tabs apenas organizam o editor, sem alterar permissões ou configurações.
Ambas ficam acessíveis em todos os planos; em “Avançado”, planos sem acesso veem apenas uma
indicação concisa do recurso Profissional, sem controles utilizáveis. Os controles básicos
indisponíveis também informam o plano necessário.

Logo/cor/modelo/frase ficam em “Básico”; fundo/texto/fontes/arredondamento ficam em “Avançado”.
Nome e WhatsApp permanecem acessíveis fora dos painéis de aparência. Organização
e ordem de categorias ficam em um agrupamento secundário, mantendo o salvamento próprio da ordem.
Link e QR code continuam como utilidades secundárias. Não adicionar onboarding ou etapas.
Prévia e botão Salvar ficam fora dos painéis, compartilhados e disponíveis em ambas as tabs;
salvar envia o rascunho completo, incluindo os campos da tab inativa.

Trocar de tab não deve desregistrar campos nem limpar o rascunho. Campos do painel inativo não
participam da navegação por teclado. Se a validação apontar um campo em outra tab, ativar essa
tab antes de focar o primeiro campo inválido e anunciar seu erro, inclusive em erros do servidor.
Após sucesso, usar o DTO
normalizado retornado pelo PATCH para atualizar formulário, logo e prévia e executar o refresh
necessário. Falhas preservam os valores e os erros de campo ficam associados aos controles.

### 5. Amostra local com a mesma aparência

Adicionar uma amostra identificada como prévia ilustrativa, contendo logo/nome, frase e produtos
de exemplo suficientes para distinguir galeria/lista. Ela recebe o rascunho permitido e o mesmo
resolvedor de aparência, reaproveitando apenas as peças visuais necessárias da vitrine.
Não carregar o catálogo inteiro nem duplicar suas interações. Em desktop, amostra ao lado;
em 390 px, abaixo do painel ativo, sem largura fixa que provoque overflow. Trocar de tab mantém
a mesma amostra, refletindo os valores básicos e avançados do rascunho.

A amostra é passiva: não instancia analytics, seleção persistente, curtidas, carrinho ou WhatsApp.
Upload pode continuar gerando um asset provisório pelo fluxo atual, mas apenas Salvar associa
o logo à loja. A rota `/admin/preview` continua sendo a prévia completa da configuração salva,
com `preview` ativo e a cobertura existente de métricas preservada.

Alternativa descartada: nova API de preview ou publicação com rascunho no banco, que acrescentaria
infraestrutura e estados sem necessidade nesta primeira versão.

### 6. Contratos primeiro e responsabilidades delimitadas

- Um implementador crítico estabiliza contratos, defaults, permissões e normalização; depois
  implementa serviços, billing e regressões de plano/downgrade/tenant.
- Após estabilizar contratos, um implementador cuida do helper visual, amostra e vitrine; o
  responsável pela tela usa esses contratos sem editar o serviço de billing.
- `store-settings.tsx`, contratos e cada helper compartilhado têm um único responsável por vez.
  Extrações visuais necessárias em `storefront.tsx` são sequenciais ao trabalho nesse arquivo.
- Documentação e mensagens dos planos são atualizadas com a matriz final, incluindo os avisos
  de downgrade e a regra de personalização do Essencial em AGENTS, preservando o bloco do Next.
- O orquestrador integra; um revisor independente analisa o SHA final e eventuais correções.
  Testes de banco e navegador são serializados no banco isolado de testes.

## Risks / Trade-offs

- Resets antigos apagarem campos agora permitidos no Essencial --> atualizar todos os caminhos
  de reset e testar tanto sincronização de assinatura quanto mudança direta para Free.
- Expiração sem webhook manter valores pagos visíveis --> normalizar também na leitura e no DTO.
- Cores tornarem texto ou controles ilegíveis --> validação efetiva de contraste, tokens derivados
  e regressões com fundos claros/escuros, erro de campo e fallback para dados antigos.
- Prévia divergir da loja publicada --> mesmo resolvedor e peças visuais compartilhadas, mais
  comparação por Playwright antes/depois de salvar em galeria e lista.
- Amostra não representar todo o catálogo --> identificação explícita como exemplo; a prévia
  completa existente permite conferir a loja com seus dados salvos.
- Defaults novos apagarem a frase antiga --> regressões de JSON legado, resposta normalizada e
  teste do downgrade Profissional para Essencial com frase/modelo não padrão.
- Alteração só visual ser tratada como baixo risco --> planos e billing exigem implementação
  crítica e revisão independente mesmo que os controles de UI sejam pequenos.

## Migration Plan

1. Entregar contrato/defaults e permissões com regressões antes de integrar a UI. Não executar
   migração de dados nem `db push`; o JSON antigo permanece legível.
2. Atualizar billing, aplicação visual, editor e textos na mesma entrega para evitar uma janela
   em que o Essencial permita salvar frase/modelo e um webhook ainda os apague.
3. Validar matriz de planos, trial expirado, cancelamento agendado, resets, isolamento, erros e
   compatibilidade; concluir checks integrados e fluxo de navegador antes da promoção.
4. Publicar pelo fluxo existente após revisão e merge manual. Reversão de código restaura a
   distribuição antiga e pode voltar a resetar frase/modelo do Essencial: preferir correção
   adiante; se rollback for necessário, comunicar a restrição e avaliar os resets antes dele.

Os artefatos desta proposta não executam nenhuma das etapas de implementação ou publicação.
