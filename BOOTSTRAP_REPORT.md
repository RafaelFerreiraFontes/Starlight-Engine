# Starlight — configuração multiagente e bloqueio do bootstrap

Inspeção em 2026-10-14 no workspace `C:/Users/fedet/OneDrive/Documentos/Web Projects/Starlight-Engine`.

Resultado: configuração estática criada; bootstrap de código **BLOCKED** por ausência das especificações. O critério global de sucesso ainda não foi atingido. O usuário autorizou explicitamente configurar agentes nessa situação e proibiu inventar contratos.

## Inspeção e preservação

Inicialmente existiam somente `.github/agents/` e `.github/instructions/`, vazias. `Get-ChildItem -Force -Recurse` não encontrou código, documentos, instruções originais ou `.git`. Nenhum arquivo preexistente foi sobrescrito.

`git status --short`, `git branch --show-current`, `git rev-parse HEAD`, `git log -1 --oneline` e `git show --no-patch --oneline f5f4401` falharam com `fatal: not a git repository (or any of the parent directories): .git`. Branch, HEAD inicial/final e working tree Git não estão disponíveis. O commit informado `f5f4401 — docs: consolida arquitetura Starlight e revisao dos ADRs` não foi confirmado. Não se pode concluir que ele inexista em outro checkout.

Não houve git init, reset, clean, commit, push, instalação de provedores ou alteração global do VS Code. O estado final continua sem repositório Git, agora com os arquivos listados abaixo.

Fontes ausentes e não lidas:

- `docs/` inteiro, incluindo `Objetivos com a engine.md`.
- `00_Starlight_Architecture_Definitions_Index.docx` e documentos 01–09.
- `Questões em Aberto - Decisões.md`, ADRs e `Starlight_Architecture_Review_Report.md`.
- `instruções-de-gente-csharp-starlight-engine.md` e `instruções-de-agente-monogame-starlight-engine.md`; nenhum nome alternativo foi encontrado no workspace.

As instruções geradas derivam do pedido do usuário, não de leitura dos documentos ausentes. Não foi possível preservar ou converter integralmente as diretrizes originais C#/MonoGame. Seus arquivos de destino estão identificados como parciais, com bloqueio explícito até incorporação dos originais.

## Arquivos entregues

Todos os oito agentes estão em `.github/agents/`, com extensão `.agent.md`:

| Arquivo (sem extensão) | Nome exato | model provisório | Ferramentas |
|---|---|---|---|
| starlight-coordinator | Starlight Coordinator | GPT 6 Sol | read, search, edit, execute, agent |
| starlight-architecture-reviewer | Starlight Architecture Reviewer | GPT 6 Astra | read, search |
| starlight-csharp-core | Starlight CSharp Core Engineer | GPT 6 Sol | read, search, edit, execute |
| starlight-monogame-runtime | Starlight MonoGame Runtime Engineer | GPT 6 Sol | read, search, edit, execute |
| starlight-event-compiler | Starlight Event Compiler Engineer | GPT 6 Sol | read, search, edit, execute |
| starlight-editor-frontend | Starlight Editor Frontend Engineer | Gemini 3.8 Flash | read, search, edit, execute |
| starlight-documentation-researcher | Starlight Documentation Researcher | Gemini 3.8 Flash | read, search |
| starlight-qa | Starlight QA Engineer | GPT 6 Luna | read, search, execute |

`target: vscode` em todos. Architecture Reviewer e Documentation Researcher ficam ocultos do seletor principal, mas disponíveis para subagentes. Coordinator é invocável pelo usuário, não deve ser chamado como subagente e permite somente os sete especialistas. Os workers não recebem a ferramenta `agent`. QA pode executar builds/testes, mas não editar fonte; terminal não constitui uma barreira técnica contra escrita e exige as permissões adequadas do harness.

As oito instruções estão em `.github/instructions/`, com extensão `.instructions.md`:

| Arquivo (sem extensão) | applyTo |
|---|---|
| starlight-architecture | `**` |
| starlight-csharp | `**/*.cs` |
| starlight-monogame | `src/Starlight.Runtime*/**` |
| starlight-frontend | `editor/**` |
| starlight-editor-protocol | `src/Starlight.Editor.*/**` |
| starlight-events-compiler | `src/Starlight.Events*/**` |
| starlight-testing | `**` |
| starlight-documentation | `docs/**` |

Os globs de área usam a árvore-alvo autorizada, ainda inexistente. `testing` é transversal de propósito: critérios de teste também se aplicam a mudanças de produção e configuração. `frontend` cobre frontend e shell; `monogame` cobre runtime portável e adaptador, com distinção explícita no texto. Reavaliar os globs se as pastas reais forem alteradas.

Também criados: `.github/copilot-instructions.md`, `scripts/validate_agent_config.py` e este relatório. Total: 19 arquivos. Não foram criados `project.md`, `mvp.md`, documentos arquiteturais substitutos ou projetos vazios.

## Delegação e revisão

Selecionar Starlight Coordinator no VS Code. Uma tarefa deve incluir objetivo e critérios de aceitação. Ele consulta fontes, delega somente quando útil, envia contexto autossuficiente e arquivos/permissões delimitados ao especialista e solicita revisão independente ao QA. Handoffs de Coordinator e implementadores para QA usam `send: false`. São sugestões manuais, não uma pipeline automática.

QA retorna PASS, FAIL ou BLOCKED ao Coordinator. Correções são atribuídas ao implementador, seguidas de nova revisão quando necessário. Astra fica reservado para arquitetura crítica. Não há arestas de delegação de volta ao Coordinator nem recursão entre workers. Editores não devem escrever simultaneamente nos mesmos arquivos sem isolamento e integração definidos.

A revisão independente desta entrega foi feita por um subagente nativo da sessão atual, somente leitura. Ela não executou o arquivo starlight-qa.agent.md no VS Code e não comprova disponibilidade do GPT 6 Luna.

## Modelos e diferenças de harness

Inspeção somente leitura dos manifests instalados confirmou:

- `grikomsn.openai-oauth-copilot-chat-1.1.1`: provedor `openai-codex`, nome exibido Codex Bridge.
- `husamettinulutas.antigravity-maestro-1.3.2`: provedor `antigravity-maestro`, nome exibido Antigravity Maestro.

A configuração local consultada não comprovou os quatro modelos solicitados. Menções em código/changelog ou presença de extensão não demonstram catálogo autenticado nem acesso. Não foram acessados tokens ou alteradas contas. Os campos `model` usam os rótulos fornecidos pelo usuário; nenhum ID interno foi inventado, e não há listas de fallback.

O formato aceita nomes de modelos, ferramentas, allowlist de subagentes e handoffs. A sintaxe estática não valida disponibilidade em sessão. [Custom agents — documentação oficial](https://code.visualstudio.com/docs/agent-customization/custom-agents).

Local executa no extension host; Copilot usa Agent Host. Ferramentas e modelos dependem do harness, portanto a presença de extensões locais não prova compatibilidade no Agent Host. [Harnesses — documentação oficial](https://code.visualstudio.com/docs/agents/concepts/agent-harnesses).

No Local, habilitar Run Subagent e conferir a allowlist. Chamadas são independentes e não recebem automaticamente o histórico; podem existir limites de custo ao selecionar Astra a partir de Sol. Não habilitar recursão é suficiente para este fluxo. Codex usa subagentes nativos, não presume execução destas definições. [Subagents — documentação oficial](https://code.visualstudio.com/docs/agents/run/subagents).

As instruções por `applyTo` destinam-se aos harnesses VS Code compatíveis. Codex usa `AGENTS.md`; não foi criada uma configuração nativa Codex nem prometida carga automática dos arquivos `.github`. [Custom instructions — documentação oficial](https://code.visualstudio.com/docs/agent-customization/custom-instructions).

### Validação manual necessária

1. Abra este workspace no VS Code e selecione o harness pretendido. Em Agent Customizations/Diagnostics, confirme os oito agentes e oito instruções sem erros.
2. Abra o seletor de modelo de cada agente e selecione o modelo exato do provedor pretendido. Use o nome que o editor reconhecer/gravar no frontmatter; não derive IDs por concatenação. Se não disponível, mantenha BLOCKED em vez de trocar silenciosamente de modelo.
3. Confira as ferramentas efetivas, inclusive Run Subagent no Coordinator, ausência de edição nos revisores e permissões do terminal do QA.
4. Peça uma pesquisa somente leitura ao Coordinator e acompanhe nome/modelo real do subagente. Verifique também se o handoff para QA permanece aguardando envio.
5. Em tarefas representativas, confira References para confirmar aplicação das instruções às pastas previstas. Faça isso novamente no Agent Host se esse for o destino, sem pressupor equivalência com Local.

## Ferramentas e gates

| Verificação | Estado | Evidência ou bloqueio |
|---|---|---|
| Inventário do workspace | PASS | Listagem recursiva, inclusive arquivos ocultos; somente pastas .github vazias antes da criação |
| Comandos de inspeção Git | FAIL | Executados; fatal: not a git repository |
| Branch/HEAD/commit documental | BLOCKED | Nenhum .git no workspace |
| Documentos normativos e originais | BLOCKED | Ausentes; código dependente não gerado |
| .NET instalado | PASS | `dotnet --list-sdks`: 7.0.410 |
| Node/pnpm instalados | PASS | `node --version`: v24.19.0; `pnpm --version`: 12.8.1 |
| Rust/Cargo/Tauri CLI | BLOCKED | Não encontrados via Get-Command; ~/.cargo/bin não encontrado na inspeção |
| Parser YAML | PASS | Python 3.10 e PyYAML 6.0.2 disponíveis |
| Validação estática das configurações | PASS | `python scripts/validate_agent_config.py`, exit 0; oito agentes e oito instruções |
| Revisão independente | PASS | Revisão somente leitura dos arquivos; sem achado substantivo após criação deste relatório |
| Modelos/ferramentas/aplicação real no VS Code | MANUAL VALIDATION REQUIRED | Não houve sessão executando essas definições |
| Conversão integral C#/MonoGame | BLOCKED | Originais ausentes; arquivos de destino parciais |
| dotnet restore/build/test | NOT RUN | Sem solução; bootstrap BLOCKED por normas ausentes |
| pnpm install/typecheck/build/test | NOT RUN | Sem package.json; bootstrap BLOCKED por normas ausentes |
| Tauri dev/build e janela desktop | NOT RUN | Sem projeto e sem Rust/Cargo detectados |
| Grafo real, serialização, IPC, runtime | BLOCKED | Nenhum código de produto gerado; não há comportamento a validar |

O validador verifica YAML, campos utilizados, roteamento declarado, nomes, allowlist, ferramentas, links internos de agentes, handoffs e casos positivos/negativos dos globs. Usa uma implementação limitada de glob para os padrões deste repositório; não substitui o mecanismo VS Code. A primeira execução encontrou o relatório ainda não criado (exit 1); após sua criação, a execução final passou. Referências aos documentos ausentes nas instruções estão explicitamente marcadas como ausentes e não contam como fontes lidas.

## Código e próximo incremento

Nenhum projeto .NET, componente React, shell Tauri, contrato de domínio ou teste de produto foi criado. O único código executável entregue é o validador da configuração. Não foi escolhida baseline .NET a partir do único SDK instalado; compatibilidade/suporte e dependências precisam ser verificados no incremento de código.

ADRs 023–027 continuam pendentes. Nenhuma foi aprovada ou implementada. Não há PixiJS obrigatório, semântica de colisão nova, persistência especial do ADR-026 ou seleção avançada do ADR-027.

Próximo incremento: disponibilizar o checkout correto e os documentos normativos/originais; confirmar branch/HEAD e commit documental; incorporar as instruções C#/MonoGame integralmente; validar modelos no VS Code; selecionar baseline suportada e compatível; então implementar contratos mínimos aprovados e executar gates .NET antes de avançar ao frontend e desktop. O bootstrap continua pendente, não concluído.
