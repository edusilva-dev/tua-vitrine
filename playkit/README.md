# tua vitrine · playkit

Versão 0.2 — identidade aplicada, 17 de novembro de 2026.

Este é o ponto de partida da identidade. A paleta e as fontes vêm do produto existente;
o símbolo segue a referência escolhida pelo usuário. As combinações petróleo sobre
creme e verde claro sobre floresta foram aprovadas: devem transmitir leveza e calma.
A logo e os ícones estão aplicados no site, autenticação e painel.

## Essência

**O que fazemos:** ajudamos pequenos lojistas a apresentar produtos em uma vitrine
online e conduzir a compra pelo WhatsApp.

**Promessa:** sua loja online, simples e do seu jeito.

**Assinatura verbal:** sem slogan por enquanto. Usar apenas símbolo e nome; textos
de apresentação devem explicar concretamente a vitrine e os pedidos pelo WhatsApp.

**Valores traduzidos em comportamento:**

- Simplicidade: orientar com passos claros e linguagem cotidiana.
- Proximidade: respeitar a relação entre lojista e cliente, com atendimento pelo WhatsApp.
- Autonomia: a loja mantém sua identidade e o controle da apresentação dos produtos.
- Confiança: comunicar limites e condições com clareza, sem prometer vendas garantidas.

A marca da plataforma deve apoiar a identidade do lojista, sem competir com ela na vitrine pública.

## Nome e voz

Escrever **tua vitrine**, em minúsculas, nas assinaturas de marca. Usar frases diretas,
acolhedoras e concretas. Preferir “Adicione seu primeiro produto” a “Potencialize sua
presença digital”. Preferir “Compartilhe sua vitrine” a “Venda mais garantido”.

O ponto final que aparece nas assinaturas atuais pode continuar em frases. Nesta
proposta ele não integra o logotipo: o símbolo já fornece um elemento de reconhecimento.

## Símbolo: sacola + fachada

A alça comunica sacola. O corpo vazado sustenta um toldo de três módulos arredondados, desenhado em contorno.
A fachada remete ao pequeno comércio e a sacola remete à compra. Usar uma única
estrutura em traço uniforme, sem adicionar porta, janela, carrinho ou balão de conversa.

- [Logo nas duas combinações aprovadas](./logo.png).
- [Logo SVG flexível](./assets/logo.svg), [para fundo claro](./assets/logo-fundo-claro.svg)
  e [para fundo escuro](./assets/logo-fundo-escuro.svg).
- [Estudo do símbolo](./simbolo-02.png): símbolo redesenhado em contorno a partir da referência escolhida.
- [Prancha inicial](./conceito-01.png): exploração gerada por IA, descartada para o desenho do símbolo.
- [Símbolo vetorial](./assets/simbolo.svg): desenho geométrico editável com `currentColor`.
- [Princípios visuais](./direcao-visual.md): orientação para evolução da marca.

O SVG é a referência da geometria proposta. A imagem conceitual não é arquivo de
produção: pode conter variações de cor, textura, proporção e tipografia.

Uma alternativa futura seria um monograma “tv” dentro de uma vitrine. A direção
recomendada é sacola + fachada porque comunica a proposta sem exigir conhecimento
prévio do nome. A avaliação de reconhecimento deve acontecer com pessoas reais.

## Paleta existente

Fonte: `app/globals.css`. Os nomes abaixo organizam os tokens; não introduzem cores novas.

| Cor | Hex | Token existente | Papel na marca |
| --- | --- | --- | --- |
| Petróleo | `#245C60` | `--primary` | Símbolo e nome sobre fundos claros |
| Floresta | `#183C3D` | `--color-brand-forest` / `--sidebar` | Fundo escuro principal |
| Creme | `#F7F7F2` | `--background` | Fundo claro principal |
| Verde claro | `#D5E9BC` | `--color-brand-lime` | Símbolo e nome sobre floresta |
| Sálvia | `#598E88` | `--color-brand-sage` / `--ring` | Apoio gráfico |
| Branco | `#FFFFFF` | `--card` | Superfícies e versão monocromática clara |

Combinações de referência, calculadas pela luminância relativa sRGB:

| Frente / fundo | Contraste aproximado |
| --- | --- |
| Petróleo / creme | 7,04:1 |
| Verde claro / floresta | 9,25:1 |
| Creme / floresta | 11,15:1 |
| Sálvia / creme | 3,46:1 |

Conferir os valores no processo de exportação. Usar as duas primeiras combinações
para assinaturas. Sálvia é cor de apoio; não usar como texto pequeno sobre creme.
Não aplicar verde petróleo sobre floresta nem verde claro sobre creme.
Na interface, referenciar os tokens semânticos em vez de repetir hex em classes.

## Tipografia e composição

Manter as famílias já usadas em `app/layout.tsx`: **Montserrat** para marca e títulos,
**Inter** para texto e interface. A logo usa Montserrat Semibold (peso 600), em
minúsculas, convertida em curvas: os SVGs não dependem de fontes instaladas.
Fonte de origem: [Google Fonts / Montserrat](https://github.com/google/fonts/tree/main/ofl/montserrat),
sob licença SIL Open Font License. O espaçamento preserva o kerning da família.

Usar o símbolo à esquerda do nome. Reservar ao menos 1/4 da largura do símbolo
ao redor da assinatura e entre símbolo e nome. Evitar sombras, contornos adicionais,
deformações, rotações e gradientes. Preservar os vazios transparentes do toldo.

Começar com 24 px para o símbolo na interface; revisar visualmente antes de usar
16 px. Favicon deve conter somente o símbolo, sem nome ou assinatura. Se o toldo
perder definição, criar uma versão óptica específica para tamanhos pequenos.

## SVG e coloração

O arquivo `assets/simbolo.svg` usa `viewBox="0 0 64 68"`, sem dimensões fixas,
dependências de fonte, imagens embutidas ou cores de fundo. O interior é
transparente (`fill="none"`) e o contorno usa `stroke="currentColor"`. O traço escala
proporcionalmente com o símbolo; não aplicar `vector-effect="non-scaling-stroke"`.

**Para herdar a cor de CSS, inserir o SVG inline**, ou converter os mesmos paths em
um componente React. No contexto claro, aplicar `color: var(--primary)` ao contêiner;
no contexto escuro, `color: var(--color-brand-lime)`.

Um SVG carregado por `<img src="...">` ou `next/image` **não herda** a cor do elemento
pai. Nesse caso, exportar uma variante de cor explícita ou usar o arquivo como máscara
CSS, com `background-color: currentColor`. O arquivo mestre continua sem cor fixa.

O SVG isolado tem nome acessível. Quando acompanhado pelo nome visível da marca,
remover seu `role`/`aria-label` e usar `aria-hidden="true"` na versão inline para evitar
leitura duplicada. Links contendo apenas o símbolo precisam de um nome acessível.

## Aplicação no produto

- `components/brand-logo.tsx`: logo e símbolo inline, com `currentColor`. A logo
  tem nome acessível; o símbolo isolado é decorativo e exige nome no controle que o contém.
- `app/icon.svg`: favicon vetorial com verde claro sobre placa floresta.
- `app/favicon.ico`: substitui o ícone anterior, com versões de 16, 32 e 48 px.
- `app/apple-icon.png`: ícone de 180 px para atalhos em dispositivos Apple.

A placa floresta preserva contraste em abas claras e escuras sem depender do tema
da página. Os ícones usam cores explícitas porque o favicon não herda CSS.
O Next.js registra os arquivos automaticamente pelas convenções de metadata.

As versões de download em `assets/` têm fundo transparente. Para uso inline,
preferir `logo.svg`; para uso como imagem externa, escolher a variante de cor adequada.
Manter a mesma geometria nos arquivos e em `components/brand-logo.tsx` ao revisar a marca.

O estudo inicial `conceito-01.png` é apenas histórico: seu desenho e slogan foram
descartados. A referência atual de composição é `logo.png`.
