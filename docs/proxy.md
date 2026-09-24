# Proteção antecipada do painel

O `proxy.ts` atua somente nas páginas sob `/admin`. Em `AUTH_MODE=session`, uma requisição sem
cookie de sessão do Better Auth é redirecionada para `/entrar`, com o caminho interno original no
parâmetro `callbackURL`. Esse destino é construído exclusivamente a partir de `pathname` e `search`
da requisição recebida; URLs externas fornecidas pelo cliente nunca são usadas como destino do
redirecionamento.

Em `AUTH_MODE=local`, o proxy não muda o comportamento do protótipo em localhost. O matcher não
inclui `/api/admin`: consumidores da API continuam recebendo a resposta JSON `401` produzida pelos
Route Handlers, em vez de HTML ou redirecionamento. Arquivos estáticos, rotas públicas e vitrines
também não passam pelo proxy.

## Limite de segurança

O helper oficial `getSessionCookie` do Better Auth verifica apenas se o cookie existe. Ele reconhece
o prefixo padrão `better-auth` e sua variante segura `__Secure-`, mas não consulta o banco nem valida
a sessão. Portanto, o proxy melhora a navegação e evita renderização desnecessária para visitantes
claramente desconectados; ele não concede acesso.

As verificações reais permanecem nos Server Components e nas APIs administrativas. Elas validam a
sessão no Better Auth, a confirmação do e-mail e o vínculo do usuário com a loja. Qualquer nova rota
ou mutação administrativa deve manter essa validação, mesmo quando estiver coberta pelo matcher do
proxy.

## Convenção do Next.js

O projeto usa a convenção `proxy.ts` do Next.js 16, com a função nomeada `proxy` e o objeto exportado
`config`. O Proxy usa o runtime Node.js padrão; o Next.js não permite definir `runtime` nesse arquivo.
