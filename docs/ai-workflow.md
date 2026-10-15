# Fluxo de trabalho com Codex

Este guia descreve como conduzir mudanças neste repositório com um chat Codex
orquestrador e agentes auxiliares. A configuração é apoio ao processo; a revisão
do PR e a decisão de merge continuam humanas.

## Preparar o ambiente

Use Bun 1.3.14, a versão declarada pelo projeto. Na raiz do repositório, instale
as dependências com lockfile congelado e valide o harness:

```sh
bun install --frozen-lockfile
bun run harness:check
```

`harness:check` verifica a estrutura dos perfis TOML, frontmatter de skills e referências locais;
não comprova disponibilidade de modelos, independência de revisão nem proteção remota.
Depois de instalar ou
alterar agentes, skills ou configuração do projeto, abra um chat Codex novo ou
recarregue o projeto para que ele leia as instruções atualizadas. Confirme a
confiança no diretório do projeto quando o Codex solicitar.

Comece uma tarefa com um pedido normal ou invoque `$tua-orchestrate`. A skill de
orquestração lê `AGENTS.md` e `.agents/skills/tua-orchestrate/SKILL.md` antes de
delegar. Para desenvolvimento local, o PostgreSQL do Compose usa por padrão o
banco `tuavitrine`; testes de integração e navegador exigem o banco isolado
`tuavitrine_test`:

```sh
bun run db:up
docker compose exec -T db createdb -U tuavitrine tuavitrine_test
DATABASE_URL=postgresql://tuavitrine:tuavitrine_local@localhost:55432/tuavitrine_test \
  bun run db:deploy
```

Crie o banco uma vez por volume local; se ele já existir, pule o comando
`createdb`. Preserve a URL de desenvolvimento normal no seu arquivo local de
ambiente. Os testes validam o nome do banco e recusam outro destino.

## Papéis e delegação

O chat raiz é o orquestrador da demanda. Ele interpreta o pedido, consulta as
instruções e skills, define escopos sem sobreposição, delega trabalho e integra
os resultados. Um papel configurado não troca o modelo do chat atual: o modelo
do orquestrador continua sendo o modelo selecionado para a sessão Codex.

Os papéis definidos para dividir o trabalho são:

- `explorer` (`gpt-6-luna`, alto): investiga código, contratos, testes e
  documentação; devolve evidências e opções sem editar.
- `implementer` (`gpt-6.1-sol`, médio): implementa uma mudança delimitada e
  devolve arquivos, validações e resultado.
- `implementer-light` (`gpt-6-luna`, alto): implementa uma tarefa pequena e
  bem especificada.
- `implementer-critical` (`gpt-6.1-sol`, alto): implementa lógica sensível ou
  mudança crítica com escopo e critérios explícitos.
- `code-reviewer` (`gpt-6.1-sol`, alto): revisa de forma independente uma
  revisão concreta, sem editar arquivos.
- `orchestrator` (`gpt-6.1-sol`, alto): planeja a divisão do trabalho, integra
  entregas e conduz Git no chat raiz.

O padrão é manter até dois agentes filhos ativos; o limite rígido é três filhos
ativos além do chat raiz. Não delegue de um agente filho para outros agentes.
Cada chamada delegada recebe contexto novo e compacto, com objetivo, arquivos
sob responsabilidade, referências relevantes, contratos, critérios de
aceitação e testes esperados. Agentes compartilham o checkout: divida arquivos
com clareza e serialize trabalho que use os mesmos arquivos ou banco de dados.

O executor atual pode não oferecer o modelo pedido. Nesse caso, informe a
indisponibilidade e a substituição de papel ou modelo explicitamente no resultado;
nunca reduza silenciosamente a capacidade da revisão crítica. As definições de
agentes neste repositório não garantem descoberta automática no runtime: o chat
raiz deve confirmar quais papéis estão disponíveis na sessão e seguir as
instruções do projeto.

## Especificar, implementar e revisar

Use a dependência local OpenSpec 1.14.2 para mudanças de comportamento,
arquitetura, segurança ou trabalho dividido em várias partes. Specs descrevem o
comportamento pretendido e seus critérios de aceitação. ADRs e
`docs/architecture.md` continuam sendo a referência das decisões arquiteturais;
os documentos existentes de domínio continuam válidos e não devem ser migrados
em massa para specs.

Execute comandos OpenSpec pelo wrapper do projeto:

```sh
bun run spec -- <argumentos do OpenSpec CLI>
```

Por exemplo: `bun run spec -- list`, `bun run spec -- status --change harness` e
`bun run spec -- validate --all --strict`. No chat, `$openspec-propose` cria uma proposta;
`$openspec-apply-change` implementa uma mudança já especificada. As skills geradas mostram
comandos `openspec`; adapte-os ao wrapper local conforme AGENTS. As seis skills upstream
foram geradas pela versão fixada; sua licença está em `.agents/OPENSPEC-LICENSE`.
Ao atualizar a dependência conscientemente, execute `bun run spec -- update`, revise arquivos
gerados e repita as verificações. Não instale uma cópia global concorrente.

O wrapper força a execução com Bun e desabilita telemetria. Mudanças pequenas,
óbvias e de escopo único podem seguir diretamente para implementação; registre
no PR o comportamento esperado e como foi aceito.

O trabalho de entrega segue a skill `tua-deliver`; a revisão segue
`tua-review`. Skills geradas pelo OpenSpec podem complementar essas instruções
para uma mudança específica. O revisor recebe um contexto independente e o SHA
concreto a revisar, não altera arquivos e relata esse SHA junto aos achados, com
prioridade e evidência verificável. A revisão processual é uma instrução ao
agente, não uma barreira de sandbox do sistema operacional. Se qualquer arquivo
mudar depois da revisão, peça nova revisão do novo SHA.

## Branches, PRs e estado

Use uma branch `codex/<tarefa>` por demanda ou ID OpenSpec. Ao continuar a mesma
demanda, retome sua branch e o OpenSpec existente; não crie outro fluxo para a
mesma mudança. O chat raiz é o único papel que executa comandos Git, cria ou
atualiza PRs e integra alterações. Agentes filhos entregam mudanças e evidências
no checkout compartilhado, sem operar branches ou remotos.

O merge do PR é manual. A CLI `gh` não está disponível neste ambiente; use o
conector GitHub quando estiver conectado, ou deixe o PR pronto para ação humana.
O harness não configura regras de proteção de branches no GitHub; essa política
é gerida separadamente e não é garantida por estes arquivos.

O estado operacional fica nas tarefas OpenSpec e no PR. Não registre prompts,
logs de sessão, segredos, tokens, dados pessoais ou conteúdo de e-mails no
repositório. O fluxo não promete um custo ou tempo fixo: número de agentes,
execuções e revisões depende da demanda.
