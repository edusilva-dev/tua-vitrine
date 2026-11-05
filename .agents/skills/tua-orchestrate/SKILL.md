---
name: tua-orchestrate
description: Coordena demandas de desenvolvimento do tua-vitrine com OpenSpec, agentes delimitados e revisão independente.
---

# Coordenar uma demanda

A sessão principal é o orquestrador; não crie um coordenador extra. Leia `AGENTS.md`.

## Preparar

1. Inspecione estado Git, implementação e testes afetados. Preserve trabalho alheio.
2. Defina objetivo, critérios de aceite, risco e dependências. Pergunte apenas decisões relevantes
   que não possam ser descobertas no projeto. Não implemente enquanto o ambiente estiver em Plan.
3. Antes de editar, crie `codex/<task>` a partir da base de integração acordada (padrão `origin/master`
   atualizado com fetch). Continuação reutiliza a branch da tarefa; não reutilize outra demanda.
   Não resete mudanças locais. Se houver trabalho conflitante, use um worktree isolado.
4. Para comportamento novo, arquitetura, risco crítico ou trabalho em várias partes, use OpenSpec
   com o mesmo ID: proposta, cenários, design e tarefas. Para ajustes triviais, registre aceite no PR.
   Use `bun run spec -- ...`; consulte `--help` e as skills `openspec-*` instaladas quando necessário.
   Não transforme toda a documentação de negócio em specs nesta tarefa.

## Distribuir

Use os perfis `.codex/agents/`: `explorer`, `implementer-light`, `implementer`,
`implementer-critical` e `code-reviewer`. O perfil `orchestrator` documenta a coordenação.
Risco é determinado pelo comportamento, não pelo tamanho do diff. Auth, isolamento de lojas,
planos, cobrança, migrações e exclusão/storage usam implementer-critical e revisão high.

Prefira dois subagentes ativos, no máximo três além da sessão principal. Não delegue uma busca
trivial quando o repasse custar mais que executá-la. Uma tarefa pequena pode usar somente
um implementador e, depois, o revisor. Subagentes não criam outros agentes.

Cada delegação começa em contexto novo quando a ferramenta permitir e contém:

- Objetivo e saída esperada.
- Escopo permitido (arquivos de responsabilidade) e exclusões.
- Referências mínimas: AGENTS, spec, decisões e contratos relevantes.
- Dependências prontas ou bloqueantes e critérios de aceite.
- Testes necessários e formato da resposta: resultado, caminhos, evidências e pendências.

Não copie histórico completo, logs extensos ou segredos. Se a ferramenta não expuser perfis
customizados, leia o TOML escolhido e envie suas instruções, modelo e esforço explicitamente.
Modelos do arquivo de perfil podem prevalecer sobre overrides; escolha o perfil correto.
Se um modelo estiver indisponível, informe a limitação e escolha um disponível compatível com
o risco. Não reduza silenciosamente a qualidade da revisão crítica.

Paralelize apenas escopos independentes. Estabilize contratos compartilhados antes de separar UI
e servidor. Arquivos compartilhados têm um único escritor por vez. Serializar testes e2e/auth/
integração que compartilham banco, fixtures ou servidor; worktrees não isolam esses recursos.
Após duas tentativas sem progresso, reavalie causa, escopo e modelo com evidências; não repita
indefinidamente. Mantenha tarefas concluídas e pendentes no OpenSpec ou PR, não só no chat.

## Integrar e entregar

Leia `.agents/skills/tua-deliver/SKILL.md` para a validação. Integre resultados e execute os checks
necessários no estado combinado. Somente o orquestrador opera Git mutável.

Crie commit antes da revisão. Envie base, SHA, critérios de aceite e evidências a um
`code-reviewer` novo que não implementou a mudança. Aguarde o resultado; não substitua por
autoavaliação. Leia `.agents/skills/tua-review/SKILL.md` para tratar achados.
Correções geram novos commits e nova revisão do delta e integração. Não faça amend/force push.

Faça push e abra PR (CLI GitHub ou conector disponível), vincule a mudança OpenSpec e registre
base/SHA revisado, revisor independente, testes efetivos e pendências. Não apresente revisão de
subagente como aprovação formal de outro usuário no GitHub. Achados P0/P1/P2 não resolvidos,
revisor indisponível ou checks incompletos mantêm PR em draft; P3 pode ser registrado como sugestão.
Sem achados bloqueantes, confira o CI do SHA final antes de indicar pronto para merge.
Merge permanece manual. Arquive a mudança OpenSpec somente quando implementação e verificação
estiverem concluídas; arquivamento não significa merge. Não marque evidência ausente como sucesso.

Informe resultado, validações, SHA, PR e bloqueios. Registre consumo apenas se disponível;
não estime tokens a partir de tamanho de texto nem prometa economia pelo paralelismo.
