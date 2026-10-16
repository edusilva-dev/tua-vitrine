# Spec Delta

## Purpose

Permitir que o lojista personalize a aparência da vitrine com poucas decisões, acompanhe o
rascunho e acesse ajustes adicionais de acordo com seu plano, sem precisar montar uma página.

## ADDED Requirements

### Requirement: Edição em tabs em uma tela

O sistema SHALL apresentar uma única tela de personalização com tabs “Básico” e “Avançado”.
“Básico” SHALL iniciar ativa e reunir logo, cor da marca, galeria/lista e frase de apresentação,
conforme o plano. “Avançado” SHALL reunir fundo, texto, fontes e arredondamento para o Profissional.
Somente o painel ativo SHALL ser exibido, sem etapas obrigatórias adicionais. As tabs SHALL
organizar o editor sem representar configurações ou modos de aparência persistidos.

#### Scenario: Personalização rápida
- **WHEN** o lojista abre Minha vitrine e altera somente o logo
- **THEN** encontra “Básico” ativa e consegue salvar sem acessar “Avançado” ou preencher novos campos
- **AND** os demais controles mantêm os valores salvos ou seus padrões

#### Scenario: Separação dos controles
- **WHEN** o lojista Profissional seleciona “Avançado”
- **THEN** vê os controles avançados no lugar dos controles básicos
- **AND** a prévia e o botão Salvar compartilhados permanecem disponíveis

#### Scenario: Tab avançada sem permissão
- **WHEN** o lojista Free ou Essencial seleciona “Avançado”
- **THEN** vê uma indicação de que os recursos exigem Profissional, sem controles avançados utilizáveis
- **AND** pode retornar a “Básico” sem perder alterações

#### Scenario: Informações e recursos existentes
- **WHEN** um lojista de qualquer plano acessa Minha vitrine
- **THEN** pode editar nome e WhatsApp e usar a organização por categorias já disponível
- **AND** a ordenação das categorias, a cópia do link e o QR code continuam acessíveis

### Requirement: Aparência permitida por plano

O sistema SHALL permitir logo e aparência padrão no Free; logo, cor da marca, frase e
galeria/lista no Essencial; e os mesmos recursos mais fundo, texto, fontes e arredondamento no
Profissional. As restrições SHALL ser aplicadas no servidor tanto ao salvar quanto ao ler a
aparência pública e administrativa. Campanhas permanecem exclusivas do Profissional.

#### Scenario: Essencial salva identidade visual
- **WHEN** uma loja Essencial salva uma cor válida, uma frase de até 160 caracteres e o modelo lista
- **THEN** os três valores são persistidos e exibidos na vitrine
- **AND** configurações avançadas permanecem nos padrões

#### Scenario: Requisição direta não contorna o plano
- **WHEN** uma loja Free envia aparência paga ou uma loja Essencial envia ajustes avançados pela API
- **THEN** os campos sem permissão são normalizados para seus padrões no salvamento e na resposta
- **AND** a vitrine não exibe os valores proibidos mesmo que já existam em registros antigos

#### Scenario: Profissional com edição simplificada
- **WHEN** uma loja Profissional altera somente a cor da marca
- **THEN** consegue salvar sem configurar qualquer campo avançado
- **AND** mantém acesso às mesmas escolhas simples do Essencial

### Requirement: Ajustes avançados limitados

O sistema SHALL oferecer no Profissional apenas cor de fundo, cor de texto, duas combinações
predefinidas de fontes e três opções de arredondamento dos cards. Os valores padrão SHALL
preservar a aparência atual. A interface SHALL informar o plano necessário sem apresentar
formulários avançados utilizáveis aos demais planos.

#### Scenario: Refinamento de aparência
- **WHEN** o lojista Profissional escolhe um par legível de fundo e texto, uma fonte e um arredondamento
- **THEN** a prévia e, após salvar, a vitrine aplicam essas escolhas em galeria e lista
- **AND** a identidade visual do painel administrativo permanece a mesma

#### Scenario: Padrões suficientes
- **WHEN** o lojista deixa os ajustes avançados nos padrões
- **THEN** a loja permanece pronta para uso sem escolhas extras
- **AND** não precisa definir cores individuais para áreas, botões ou cards

### Requirement: Rascunho único e salvamento explícito

O sistema SHALL manter um único rascunho para controles básicos e avançados. Trocar de tab
e editar um campo básico SHALL preservar os demais valores. O botão Salvar compartilhado SHALL
salvar o rascunho completo, inclusive os campos da tab inativa. A aparência publicada
SHALL mudar somente após salvar com sucesso, e falhas SHALL preservar o formulário e permitir
nova tentativa sem envio duplicado.

#### Scenario: Trocar de tab não apaga ajustes
- **WHEN** o lojista altera a fonte em “Avançado”, volta a “Básico” e altera a frase
- **THEN** o salvamento inclui ambas as alterações

#### Scenario: Erro em outra tab
- **WHEN** a validação local ou a resposta do servidor indica erro em um campo da tab inativa
- **THEN** a interface ativa a tab do primeiro campo inválido antes de focá-lo e anunciar o erro
- **AND** preserva os valores de ambas as tabs para correção e nova tentativa

#### Scenario: Falha ao salvar
- **WHEN** o salvamento falha por validação ou indisponibilidade
- **THEN** a tela mostra uma mensagem útil e mantém as alterações para correção ou nova tentativa
- **AND** nenhum sucesso é anunciado nem a aparência pública é alterada por esse salvamento

#### Scenario: Retorno normalizado
- **WHEN** o servidor conclui o salvamento
- **THEN** a tela usa os valores normalizados retornados para atualizar formulário e prévia
- **AND** o botão de salvar permanece protegido contra envios simultâneos

### Requirement: Prévia local representativa

O sistema SHALL mostrar uma prévia identificada como exemplo, com identidade, frase e produto
ilustrativo, que acompanha o rascunho sem salvar. Ela SHALL usar as mesmas regras visuais da
vitrine e não gerar métricas, curtidas analíticas, mensagens de WhatsApp ou alterações no carrinho
e favoritos. A prévia completa existente SHALL continuar disponível com a aparência salva.

#### Scenario: Conferir antes de salvar
- **WHEN** o lojista altera cor, logo, modelo ou um ajuste avançado permitido
- **THEN** a prévia representativa acompanha a alteração sem escrever configurações no servidor
- **AND** a vitrine pública conserva a aparência salva até a confirmação de sucesso

#### Scenario: Prévia sem efeitos de compra ou análise
- **WHEN** o lojista usa a prévia representativa ou abre a prévia completa existente
- **THEN** nenhuma visita ou curtida é registrada nas métricas da loja
- **AND** a prévia representativa não dispara WhatsApp nem altera carrinho ou favoritos

### Requirement: Validação e legibilidade

O sistema SHALL validar cores e opções no servidor e aceitar somente as fontes e os
arredondamentos oferecidos. Novas escolhas de fundo e texto SHALL manter contraste mínimo de
4,5:1 para texto normal nas superfícies afetadas, com cores auxiliares legíveis derivadas pelo
sistema. Combinações inválidas SHALL produzir erro associado ao campo e preservar o rascunho.

#### Scenario: Par de cores ilegível
- **WHEN** uma loja Profissional tenta salvar fundo e texto iguais ou com contraste insuficiente
- **THEN** o salvamento falha com erro útil de contraste nos campos correspondentes
- **AND** os dados anteriormente salvos permanecem intactos

#### Scenario: Opção ou valor inválido
- **WHEN** uma requisição contém cor malformada, fonte não oferecida ou arredondamento fora das opções
- **THEN** o servidor rejeita a entrada sem persistir parcialmente as configurações

### Requirement: Isolamento da loja

O sistema SHALL resolver identidade e loja autorizada no servidor para qualquer salvamento de
personalização. Um identificador de loja enviado pelo cliente SHALL NOT escolher a loja afetada,
e um logo pertencente a outra loja SHALL ser recusado sem alterar nenhuma das lojas.

#### Scenario: Tentativa de alterar outra loja
- **WHEN** um lojista envia um identificador de outra loja junto das configurações
- **THEN** nenhuma configuração da outra loja é lida ou alterada por essa seleção do cliente

#### Scenario: Logo de outra loja
- **WHEN** um lojista tenta salvar um logo pertencente a outra loja
- **THEN** recebe erro de logo inválido
- **AND** a aparência de ambas as lojas permanece inalterada

### Requirement: Downgrade conforme os recursos restantes

O sistema SHALL preservar cor, frase e modelo ao efetivar Profissional para Essencial, resetando
apenas a aparência avançada e mantendo o tratamento vigente de campanhas. Ao efetivar a passagem
para Free, SHALL resetar a aparência paga, preservando logo, nome, WhatsApp, catálogo e categorias.
A comunicação de downgrade SHALL descrever os efeitos da nova distribuição.

#### Scenario: Profissional para Essencial
- **WHEN** a mudança para Essencial entra em vigor
- **THEN** cor da marca, frase personalizada e galeria/lista são preservadas
- **AND** fundo, texto, fontes e arredondamento voltam aos padrões
- **AND** a campanha deixa de estar disponível conforme a regra vigente

#### Scenario: Plano pago para Free
- **WHEN** a mudança para Free entra em vigor
- **THEN** a cor da marca e o modelo voltam aos padrões, a frase volta à apresentação padrão
- **AND** os ajustes avançados voltam aos padrões e a campanha segue o tratamento vigente
- **AND** logo, identidade, dados do catálogo e categorias são preservados

#### Scenario: Cancelamento agendado
- **WHEN** o cancelamento foi agendado e o período pago ainda está vigente
- **THEN** os recursos do plano vigente continuam disponíveis até a mudança efetiva

#### Scenario: Perda de acesso sem evento de reset
- **WHEN** um trial expira ou a loja perde os recursos pagos antes de ocorrer uma escrita de reset
- **THEN** as leituras administrativas e públicas já aplicam a aparência permitida pelo plano efetivo
- **AND** um salvamento posterior persiste somente a aparência permitida

### Requirement: Compatibilidade com lojas existentes

O sistema SHALL ler configurações existentes sem os novos campos, preservando frase, cor e
modelo quando o plano permitir e aplicando padrões apenas aos ajustes ausentes. Um bloco de
aparência legado inválido SHALL usar padrões seguros sem interromper o acesso à vitrine.

#### Scenario: Configuração anterior à ampliação
- **WHEN** uma loja possui apenas a versão atual da configuração com sua frase
- **THEN** a vitrine mantém a frase se o plano permitir e usa fontes e arredondamento atuais
- **AND** nenhum recadastro é exigido

#### Scenario: Configuração inválida já armazenada
- **WHEN** uma configuração antiga de aparência não pode ser interpretada
- **THEN** a vitrine usa padrões seguros para esse bloco e continua exibindo o catálogo

### Requirement: Edição acessível em celular e desktop

O sistema SHALL manter controles rotulados, foco visível, estado de seleção das tabs anunciado e erros
acessíveis em 390 px e desktop. A prévia SHALL caber no layout sem overflow horizontal e sem
impedir o acesso ao botão de salvar ou aos controles do formulário.

#### Scenario: Uso pelo teclado e leitor de tela
- **WHEN** o lojista percorre a tela pelo teclado e alterna entre “Básico” e “Avançado”
- **THEN** identifica as tabs, a seleção e o painel associado, usando setas para navegar entre tabs
- **AND** alcança os controles permitidos do painel ativo sem focar controles do painel inativo
- **AND** consegue salvar e identificar os erros sem depender de cor ou uso do mouse

#### Scenario: Uso em tela estreita
- **WHEN** o lojista edita a aparência em uma tela de 390 px
- **THEN** formulário e prévia permanecem utilizáveis sem rolagem horizontal da página
- **AND** ambas as tabs continuam acessíveis e as alterações são preservadas ao alterná-las
