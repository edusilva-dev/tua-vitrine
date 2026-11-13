# QA — público e autenticação

Use este documento para landing, estados globais e ciclo completo de identidade.

## `/` — landing page

- [ ] Desktop: header, hero, mockup, recursos, passos, planos, CTA final e rodapé.
- [ ] 390 px: sem overflow; CTAs e cards legíveis; navegação móvel compreensível.
- [ ] CTAs mantêm `plano=free|essencial|profissional` até o cadastro.
- [ ] Âncora “Ver como funciona” move foco/viewport corretamente.
- [ ] Tabulação segue a ordem visual; links têm nomes acessíveis e foco visível.
- [ ] Texto e preços coincidem com `docs/plans.md`.
- [ ] Zoom 200% e textos longos não sobrepõem conteúdo.

Primeira observação em staging: a dobra inicial a 390 x 844 px não apresentou overflow ou
sobreposição visível; a navegação de seções some no mobile e permanece apenas o CTA, ponto a ser
avaliado durante o teste de descoberta.

## Estados globais

- [ ] Loading anuncia progresso sem prender foco.
- [ ] Erro global comunica falha e “Tentar novamente” recupera a página.
- [ ] Erro é anunciado pelo leitor de tela.
- [ ] 404 de loja inexistente/inativa explica o problema e retorna ao início.
- [ ] `/vitrine` trata anônimo, sem loja, loja inativa e múltiplas lojas.

## `/cadastro`

- [ ] Validar nome, e-mail, senha e confirmação no cliente e servidor.
- [ ] Bloquear dupla submissão e preservar campos após erro recuperável.
- [ ] Conta existente recebe mensagem segura e acionável.
- [ ] Plano inválido cai em Free; os três planos válidos preservam a intenção.
- [ ] Sucesso orienta confirmação de e-mail sem vazar dados sensíveis.
- [ ] Autofill, Enter, foco no primeiro erro e anúncio de erros funcionam.

## Confirmação de e-mail

- [ ] E-mail chega no provedor de staging com remetente, assunto e links corretos.
- [ ] Link confirma apenas uma vez e redireciona para o destino esperado.
- [ ] Link expirado, inválido e reutilizado apresentam recuperação clara.
- [ ] Reenvio aplica rate limit e não permite enumeração de contas.
- [ ] `/verificar-email?error=...` mantém navegação acessível.

## `/entrar`

- [ ] Credenciais válidas levam ao admin/onboarding correto.
- [ ] Credenciais incorretas não revelam se a conta existe.
- [ ] E-mail não verificado oferece reenvio.
- [ ] Sessão expirada volta ao login sem loop.
- [ ] Logout revoga a sessão e impede acesso pelo botão Voltar.
- [ ] Erro de rede preserva e-mail e permite nova tentativa.

## Recuperação e redefinição

- [ ] `/recuperar-senha` sempre responde de forma neutra.
- [ ] E-mail e link de recuperação funcionam no domínio de staging.
- [ ] Token ausente, inválido, expirado e reutilizado bloqueiam alteração.
- [ ] Senha respeita 6–128 caracteres e confirmação.
- [ ] Sucesso revoga ou preserva sessões conforme contrato documentado.
- [ ] O usuário conclui a etapa final de troca de senha manualmente.

## Segurança e isolamento

- [ ] Conta A não acessa loja, produto, asset ou métricas da conta B.
- [ ] Cookie de seleção nunca autoriza loja sem membership.
- [ ] Rotas administrativas anônimas redirecionam sem expor dados.
- [ ] Mensagens e logs não contêm senha, token, cookie ou conteúdo de e-mail.
