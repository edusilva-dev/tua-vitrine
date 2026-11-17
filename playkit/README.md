# tua vitrine · playkit

Versão 0.1 — proposta inicial, 17 de novembro de 2026.

Este é o ponto de partida da identidade. A paleta e as fontes vêm do produto existente;
o símbolo segue a referência escolhida pelo usuário e as regras de composição são propostas para discussão. Esta entrega não
substitui ainda o favicon nem as assinaturas nas telas.

## Essência

**O que fazemos:** ajudamos pequenos lojistas a apresentar produtos em uma vitrine
online e conduzir a compra pelo WhatsApp.

**Promessa:** sua loja online, simples e do seu jeito.

**Assinatura:** Seu negócio mais perto.

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

- [Prévia atual](./simbolo-02.png): símbolo redesenhado em contorno a partir da referência escolhida.
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
**Inter** para texto e interface. Proposta de logotipo: Montserrat Semibold, em
minúsculas, com espaçamento ajustado visualmente. O lettering da prancha é ilustrativo;
um logotipo vetorial definitivo ainda precisa de composição e revisão.

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

## Próxima aplicação

Após escolhermos a direção, finalizar o wordmark vetorial e aplicar a assinatura no
site, autenticação e painel. Substituir `app/favicon.ico`, gerar `app/icon.svg` e
`app/apple-icon.png` a partir da geometria aprovada. O favicon deve ter cor explícita
ou estilos próprios para fundos claros/escuros: ele não herda o CSS da página.

Verificar o ícone em 16, 24, 32 e 48 px, além das telas em 390 px e desktop.
Revisar contraste, foco de links e leitura por tecnologia assistiva na integração.
A referência escolhida tem corpo vazado e traço arredondado. O SVG redesenha essa
estrutura, sem incorporar pixels do PNG. Falta revisar o desenho com o usuário e
finalizar a composição tipográfica. O nome na prévia usa fonte de sistema e não é
o wordmark definitivo.
