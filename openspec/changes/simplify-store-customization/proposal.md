# Proposal

## Why

O lojista precisa dar identidade à loja com poucas decisões e sem aprender um editor complexo.
A tela atual reúne controles e utilidades com o mesmo peso, enquanto os planos pagos oferecem
poucas diferenças de aparência; uma edição progressiva torna esse benefício mais claro.

## What Changes

- Manter uma única tela em Minha vitrine, começando por logo, cor da marca, galeria/lista e frase
  de apresentação, com padrões preenchidos e um botão para salvar as alterações de aparência.
- Manter nome, WhatsApp e organização por categorias disponíveis em todos os planos; preservar
  a ordenação existente e seu salvamento próprio sem alongar o percurso principal.
- Ampliar o Essencial para incluir frase personalizada e galeria/lista, além da cor da marca.
- Reservar ao Profissional uma seção recolhida de Ajustes avançados, com cores de fundo e texto,
  duas combinações de fontes e três opções de arredondamento dos cards.
- Exibir uma prévia representativa que acompanha o rascunho, sem publicar nem gerar métricas.
- Compartilhar as configurações entre os controles básicos e avançados: recolher a seção ou
  editar a cor da marca não apaga os demais ajustes.
- Aplicar as permissões no servidor e atualizar downgrade, textos dos planos e documentação
  para a nova distribuição. Campanhas continuam exclusivas do Profissional.

### Critérios de aceite

- O lojista consegue alterar logo e salvar sem abrir controles avançados ou escolher um modo.
- Essencial e Profissional podem salvar cor, frase e modelo; Free mantém aparência padrão e logo.
- Somente Profissional pode persistir e exibir os novos ajustes avançados, inclusive via API.
- A prévia mostra o rascunho antes de salvar; a vitrine pública só muda após o salvamento.
- Profissional para Essencial preserva cor, frase e modelo, reseta apenas a aparência avançada
  e mantém o tratamento vigente de campanhas; para Free, toda aparência paga volta ao padrão.
- Tela e vitrine permanecem utilizáveis em 390 px e desktop, por teclado e leitor de tela,
  com erros úteis, contraste legível e preservação do formulário em falhas.

### Exclusões

- Editor de blocos, arrastar e soltar, reordenar áreas, capa ou banners novos.
- Controles por seção, espaçamentos, quantidade de colunas, proporção de fotos ou CSS livre.
- Catálogo de temas, upload de fontes, novas dependências, infraestrutura ou mudanças de preço.
- Alterações nas demais permissões dos planos, duração/ativação do trial ou regras de compra.
- Autosave, publicação em duas etapas, histórico de temas ou restauração de ajustes após downgrade.

## Capabilities

### New Capabilities

- `store-customization`: edição concisa da aparência, prévia do rascunho, distribuição por plano,
  aplicação na vitrine e compatibilidade/reset das configurações.

### Modified Capabilities

Nenhuma. O projeto ainda não possui capacidades duráveis em `openspec/specs/`; esta especificação
delimita apenas a personalização discutida, sem migrar os demais domínios para OpenSpec.

## Impact

- Contratos/DTOs e serviços em `modules/stores`, permissões em `modules/billing` e o PATCH existente
  de `/api/admin/store`; sem nova API pública ou alteração da seleção/autorização de loja.
- `modules/stores/components/store-settings.tsx`, aparência compartilhada com `modules/storefront`,
  tokens semânticos e fontes existentes. A identidade visual do painel permanece preservada.
- Resets em `modules/billing/server/service.ts`, comunicação de downgrade e documentação de planos.
- O JSON `Store.customization` será estendido de forma compatível; não há alteração planejada do
  schema Prisma. Caso a implementação necessite alterá-lo, deverá incluir uma nova migração.
- Regressões de contrato, isolamento, planos, downgrade, prévia sem métricas e fluxo visual.

Esta entrega contém somente proposta, design, especificação e tarefas; código e documentação
operacional serão alterados na etapa de implementação.
