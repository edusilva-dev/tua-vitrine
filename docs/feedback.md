# Feedback da plataforma e da vitrine

O sistema separa duas origens na mesma entidade `Feedback`:

- `PLATFORM`: opinião autenticada do lojista, enviada pela página de Suporte;
- `STOREFRONT`: avaliação anônima de um visitante da vitrine.

O feedback público guarda loja, sessão anônima, nota de 1 a 5, motivo, contexto e comentário
opcional. Não solicita nome, telefone ou e-mail. O contexto público é limitado a `GENERAL` e
`SEARCH_EMPTY`; URLs arbitrárias não são persistidas.

O lojista vê apenas o resumo da própria vitrine: total, nota média, visitantes que encontraram o
produto, visitantes que não encontraram ou tiveram problema e os cinco comentários mais recentes.
O preview administrativo não mostra nem envia feedback.

O feedback sobre a plataforma é persistido mesmo sem um e-mail de suporte configurado. Quando
`SUPPORT_EMAIL` está presente, uma cópia é enviada para a equipe; falha no e-mail não descarta o
registro salvo.

As APIs públicas exigem mesma origem, usam sessão anônima e aplicam limite por minuto. Consultas do
painel sempre usam `StoreContext`, impedindo leitura cruzada entre lojas.
