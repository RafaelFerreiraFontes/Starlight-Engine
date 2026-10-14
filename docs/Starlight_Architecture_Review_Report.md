# Relatório de revisão arquitetural da Starlight Engine

Data: 14 de outubro de 2026. Natureza: auditoria documental, subordinada aos objetivos e ADRs; não constitui nova fonte normativa superior. Nenhuma engine foi implementada ou testada.

## 1. Resumo executivo

Os dez documentos 00–09 foram revisados e consolidados com os ADR-SL-001 a ADR-SL-022. Foram corrigidas escolhas já resolvidas, exemplos de identidade/JSON, isolamento de MonoGame, regras absolutas de portabilidade, instruções dos agentes e lacunas operacionais. Os documentos mantêm seu conteúdo técnico anterior válido, tabelas, diagramas textuais e organização; foram feitas substituições locais e acrescentadas seções de aprofundamento por domínio.

A arquitetura está pronta para produzir **rascunhos rastreáveis de project.md e mvp.md**, com gates explícitos para cinco propostas estruturais. Não está declarada 100% fechada para implementar todos os contratos avançados. A primeira demonstração integrada foi separada do restante do MVP, mantendo Level Editor nativo, tilesets e auto-tiling 16/47 no planejamento posterior do MVP.

Validação estrutural automatizada e exemplos JSON: aprovados. Revisão semântica documental: realizada, com pendências identificadas abaixo. **Gate visual não executado**: o renderer empacotado falhou por ausência de LibreOffice. Não foi verificada abertura em Word nem apresentação/paginação por imagens; a integridade comprovada é OOXML e reabertura por python-docx.

## 2. Inventário e condições iniciais

Git: branch `master`; working tree limpa antes da tarefa. O Git inicialmente recusou a leitura por diferença de proprietário do sandbox; foi usada exceção `safe.directory` somente por comando, sem alterar configuração global. Não houve commit, push, merge, rebase ou descarte de alterações.

Foram inspecionados os dez DOCX, registro de decisões, objetivos, duas instruções e três estudos. O arquivo adicional `MonoGame - Best Practices.md` foi identificado/consultado como referência auxiliar, mantido intacto e não elevado a contrato. Nenhum AGENTS.md foi localizado no conjunto listado do workspace.

Nomes solicitados ausentes e equivalentes efetivamente presentes:

| Nome solicitado | Arquivo usado |
|---|---|
| instruções-de-agente-csharp-starlight-engine.md | instruções-de-gente-csharp-starlight-engine.md |
| MonoGame_Runtime_Architecture_Study_for_Starlight_Engine(1).docx | MonoGame_Runtime_Architecture_Study_for_Starlight_Engine.docx |
| FlatRedBall_Gum_Architecture_Study_for_Starlight_Engine(1).docx | FlatRedBall_Gum_Architecture_Study_for_Starlight_Engine.docx |
| GDevelop5_Construct3_Architecture_Study_for_Starlight_Engine(1).docx | GDevelop5_Construct3_Architecture_Study_for_Starlight_Engi.docx |

Não se presumiu conteúdo de arquivos inexistentes. As referências nos DOCX agora apontam aos nomes reais; nenhum original foi renomeado ou movido para docs/.

Preservação: os 18 arquivos originais DOCX/MD foram copiados byte a byte para `.architecture-review/originals/`, com SHA-256 em `.architecture-review/baseline.json`. Plano anterior à edição: `.architecture-review/plan.md`. Alterações foram elaboradas em staging e os hashes dos originais conferidos antes da substituição. Esses arquivos são evidências auxiliares locais, não novas especificações de arquitetura.

## 3. Arquivos alterados

- [00_Starlight_Architecture_Definitions_Index.docx](00_Starlight_Architecture_Definitions_Index.docx)
- [01_Starlight_Technology_Stack_and_Architecture.docx](01_Starlight_Technology_Stack_and_Architecture.docx)
- [02_Starlight_Editor_Layout_and_Development_Player.docx](02_Starlight_Editor_Layout_and_Development_Player.docx)
- [03_Starlight_Project_Resource_and_Build_Pipeline.docx](03_Starlight_Project_Resource_and_Build_Pipeline.docx)
- [04_Starlight_Asset_GUIDs_and_Asset_Database.docx](04_Starlight_Asset_GUIDs_and_Asset_Database.docx)
- [05_Starlight_Project_Model.docx](05_Starlight_Project_Model.docx)
- [06_Starlight_File_Formats_and_Metadata_Contracts.docx](06_Starlight_File_Formats_and_Metadata_Contracts.docx)
- [07_Starlight_Level_Editor_and_Tile_Rule_System.docx](07_Starlight_Level_Editor_and_Tile_Rule_System.docx)
- [08_Starlight_Addon_Plugin_and_Behavior_Architecture.docx](08_Starlight_Addon_Plugin_and_Behavior_Architecture.docx)
- [09_Starlight_Event_Sheet_and_CSharp_Compilation_Pipeline.docx](09_Starlight_Event_Sheet_and_CSharp_Compilation_Pipeline.docx)
- [Registro de decisões](Questões%20em%20Aberto%20-%20Decisões.md) — erratas locais justificadas.
- [Instruções C#](instruções-de-gente-csharp-starlight-engine.md) — nome real preservado.
- [Instruções MonoGame](instruções-de-agente-monogame-starlight-engine.md).
- Este relatório é um arquivo novo. Auxiliares de edição/validação documental estão em `.architecture-review/`; não são código da engine.

Somente leitura preservada: `Objetivos com a engine.md`, os três estudos e `MonoGame - Best Practices.md`. Nenhum project.md, mvp.md, projeto .NET/Tauri, frontend ou teste da engine foi criado.

## 4. Inconsistências encontradas e correções realizadas

| Achado | Local e correção | Base |
|---|---|---|
| UI/IPC/Host ainda como escolhas adiadas | 01 §7 substitui as alternativas por stack aprovada; lifecycle de IPC detalhado em 01 | 001–003 |
| GameTime nas interfaces portáveis | Errata no 010; FrameTime em 05/08/09 e instruções, conversão só no adaptador | 010 + 016 |
| Family descrita como herança indistinta | 05 distingue contrato, herança de definição e composição; resolve precedência e registra limites | 008/011 + objetivos |
| Containers sem identidade/lifecycle suficientemente explícitos | 05 define referências/slots/instâncias e registra proposta completa de ownership/transformação/lifecycle; 09 co-seleção | Objetivos + 008/011 |
| Preview sem limite concreto para código de terceiros | 02 define projeção editorial, relógio próprio, capacidades e fallback; 08 impede execução automática de DLLs | 021 |
| Física produz colisões depois dos eventos | 09 distingue query/trigger e propõe fila congelada por fase 4, sem adicionar fase | 010 |
| Update e Draw tratados como relação 1:1 | 09 registra múltiplos Updates por Draw e proposta explícita de cadence; instruções não prometem ciclo completo por Update | 010 + documentação MonoGame |
| Sidecar versus registro central ainda em aberto | 04 §6 agora torna .meta canônico; 03/06 e agentes coerentes | 004 |
| Move externo sem sidecar parecia sempre recuperável | 04 casos de recuperação e errata 004: diagnóstico, confirmação de associação e nenhum GUID novo silencioso | 004 |
| Identidades incompletas e misturadas | 04/06 usam UUIDs completos, distinguem asset/resource/instance/entity/package/capability/ACE/SourceId e scripts | 004–007/009/014 |
| JSON com reticências e envelope incompleto | 06 exemplos parseáveis, campos obrigatórios e fixtures de Level/tileset/Event AST; .addon e não nomeáveis marcados candidatos | 007 |
| Campos desconhecidos apenas opcionais para preservar | 05/06 tornam preservação obrigatória, incluindo níveis aninhados, migração, Undo/Redo e plugins ausentes | 006 |
| Seleção de Events apenas descrita genericamente | 09 adiciona IR explícito, inversão por conjunto, subevents, Family, Containers, OR, correlações e casos de aceitação | Objetivos + 009/011 |
| Runtime preferia, mas não exigia, registro gerado | 08 exige registro estático e discovery declarativa | 018/021 |
| AOT/console/GC descritos como garantias universais | 01/03/08, agentes e errata 018 distinguem contrato, recomendação e validação de target | 012/016–018 |
| IAssetService expunha Texture2D no gameplay | Instrução MonoGame passa a exigir handle portátil; resolução interna no adaptador | 016 |
| Chunking apenas “future-ready” | 07 e fixture 06 exigem coleção endereçável desde o schema; MVP com um chunk | 019 |
| Referências a Construct poderiam impor JS | 00/01/05/09 preservam requisitos de autoria e explicitam runtime/script C#, sem compatibilidade binária | Objetivos + 009 |
| Operações distribuídas não especificavam falhas | 01/03 detalham autenticação, revisões, replay seguro, crash/reconnect, journal, watcher e gravação atômica por arquivo | 002/003/015 |

Os exemplos antigos de APIs não implementadas foram explicitamente classificados como pseudocódigo. O exemplo de atributos em 08 agora contém IDs ACE estáveis. Os diagramas textuais e exemplos válidos anteriores foram preservados; não houve substituição de documento por resumo.

## 5. Erratas no registro normativo

Os 22 cabeçalhos e status Decidido permanecem. Mudanças pontuais:

1. Introdução deixa de prometer que toda lacuna concebível foi resolvida: apenas questões expressamente cobertas pelos 22 ADRs.
2. ADR-SL-004 condiciona preservação automática de identidade externa à presença do sidecar; recuperação ambígua é assistida.
3. ADR-SL-010 troca somente os tipos das assinaturas PreEvents/PostEvents por FrameTime; mantém as nove fases e sua ordem.
4. ADR-SL-013 substitui a promessa de “estabilidade absoluta” pelo objetivo de estabilidade e isolamento, sem revogar Fast Restart.
5. ADR-SL-018 qualifica o swap como objetivo dependente de compatibilidade efetiva, mantendo adaptação de plataforma e workspace privado sob NDA. Nota explica que Zero JIT não exige NativeAOT em todo Desktop nem autoriza descoberta dinâmica de plugins.

Essas correções foram explicitamente exigidas pela tarefa ou conciliam ADRs já aprovados. Nenhuma proposta candidata foi adicionada como ADR aprovado. A errata possui seção própria no registro para rastreabilidade.

## 6. Decisões normativas preservadas

Mantidos stack web/Tauri/.NET/MonoGame; Host autoritativo por comandos; JSON granular determinístico; .meta canônico; dados opacos; modelo composicional; AST tipada/ACEs estáveis; nove fases; precedência de overrides; Player externo; Release independente; Live Reload seguro/Fast Restart; SourceId; build incremental; isolamento/capacidades/registros estáticos; Level nativo com chunks e presets 16/47; LDtk/Tiled pós-MVP; discovery declarativa e addons locais/first-party no MVP; escopo 2D preparado para evolução.

Não foram importadas como requisitos as sugestões dos estudos de Event VM, runtime de preview dentro do editor, tipos MonoGame no SDK, ECS público ou marketplace. Herança de Object-Ref não foi confundida com Family. A intenção de Containers co-selecionados foi preservada, e sua semântica avançada foi identificada como pendente.

## 7. Propostas que exigem aprovação

Todos os identificadores abaixo são **candidatos**, com status **Proposed / Pending Approval**. A recomendação não autoriza implementação como contrato definitivo.

| Candidato | Documento/seção | Recomendação e alternativas | Risco e gate |
|---|---|---|---|
| ADR-SL-023 | 02 Candidate ADR SL 023 renderer selection | Prototipar PixiJS/WebGL atrás de interface editorial; comparar renderer WebGL próprio ou serviço nativo separado | Fidelidade de efeitos, contexto WebView e desempenho; aprovar backend após protótipo |
| ADR-SL-024 | 05 Candidate ADR SL 024 advanced composition | Herança simples; Families múltiplas apenas sem ambiguidade; árvore de ownership, transformações locais, criação atômica e destruição da composição | Alternativas de Family única/ordem explícita e attachment independente; fechar conflitos, reparent, shear/física e lifetime antes desses recursos |
| ADR-SL-025 | 09 Candidate ADR SL 025 queued triggers and loop cadence | Snapshot da fila no início da fase 4, sem reentrância; colisões de fase 6 entregues na próxima avaliação; ordenação estável; fases 1–7 por Update, 8/9 por apresentação | Latência observável e relação Update/Draw; alternativas inline/segunda passagem alteram semântica; aprovar antes de gameplay de colisões |
| ADR-SL-026 | 06 Envelope applicability and candidate ADR SL 026 | Conservar envelope; .meta name como rótulo; .addon GUID separado de packageId; explicitar escopo de caches/preferências/manifests | Alternativas de exceção ao envelope ou package UUID; fechar antes dos DTOs/schemas persistentes públicos |
| ADR-SL-027 | 09 Candidate ADR SL 027 selection edge cases | OR por ramos e união de relações, inversão relacional, co-seleção por ocorrência, snapshots e Create/Destroy explícitos | Evitar produto cartesiano, vazamento entre siblings e IDs reciclados; fechar antes da ABI do compilador e casos avançados |

Os documentos apresentam comportamento observável e casos de aceitação para transformar essas decisões em testes determinísticos posteriormente. Não foi implementada uma política ainda não aprovada. Async/continuações de seleção, regras avançadas de física/transformações e persistência de gameplay entre mundos precisam de especificação posterior; estão explicitamente fora das garantias desta consolidação.

## 8. Pendências não bloqueantes e limites de escopo

- Baselines exatas de bibliotecas, divisão fina de assemblies, orçamento de performance e ferramenta de publicação por target serão validados durante implementação.
- Formalizar JSON Schemas/DTOs e testes de round-trip é trabalho futuro; exemplos sintaticamente válidos não equivalem a um schema implementado.
- Marketplace, trust UI, assinaturas, importadores LDtk/Tiled, mapas não ortogonais, streaming multichunk, 3D e stepping interativo continuam diferidos conforme recortes dos ADRs.
- Variáveis, funções, includes, camadas globais/importadas, tags e recursos de autoria dos objetivos foram preservados como intenção; a seleção de marcos do MVP não pode apagá-los silenciosamente.
- Pendente inspeção visual de todas as páginas com renderer disponível. As tabelas/estilos originais foram preservados, mas paginação, quebras, linhas órfãs e overflow não foram comprovados visualmente.

## 9. Validações executadas

Ferramentas: Python empacotado do Codex, python-docx 1.2.0, leitura ZIP/OOXML com lxml, json e uuid. Edição em staging e comparação com backups antes de publicar. Não foram instaladas dependências da engine.

| Gate | Resultado e alcance |
|---|---|
| Git inicial | master, sem alterações preexistentes; nenhuma operação de histórico |
| ZIP/OOXML | 10/10 DOCX reabertos por python-docx; ZIP íntegro; todos os XML/rels parseáveis; sem perda de partes |
| Estrutura | Quantidade de tabelas, linhas, células e seções preservada; ordem dos blocos anteriores preservada; nenhum documento truncado |
| Conteúdo | Substituições locais registradas em changes.json; cabeçalhos mantidos/atualizados, aprofundamento acrescentado; diagramas textuais preservados |
| Índice | Referências 01–09 existentes; nomes reais dos estudos; docs/ apenas destino futuro |
| ADRs | Numeração 001–022 contínua e única; 22 decisões mantidas; matriz abaixo identifica localizadores |
| JSON | 11/11 blocos JSON parseados; envelopes presentes em todos os exemplos de documentos raiz; nested records distinguidos |
| Identificadores | 20 ocorrências de UUIDs completos nos JSONs verificadas; IDs de pacote/capacidade/ACE distintos |
| APIs C# | Inspeção documental de FrameTime, SDK e handles; pseudocódigo identificado; nenhuma compilação real alegada |
| Termos obsoletos | Busca automatizada sem GameTime em PreEvents/PostEvents, escolhas antigas de sidecar/Zustand ou garantias de compatibilidade absoluta |
| Revisão semântica | Hierarquia, dependências, seleção, runtime, persistência, build e recortes cruzados; casos estruturais não decididos isolados como propostas |
| Arquivos somente leitura | Hashes dos objetivos, três estudos e referência auxiliar preservados |
| Visual | NÃO EXECUTADO: render_docx.py falhou em _resolve_soffice: LibreOffice soffice.exe was not found on PATH; runtime empacotado sem LibreOffice; nenhum PDF/PNG produzido |
| Funcionamento da engine | NÃO APLICÁVEL: não houve implementação, compilação de jogo ou testes da engine |

Contagens de parágrafos incluem células de tabelas; não equivalem a páginas:

| Documento | Parágrafos antes → depois | Tabelas preservadas | Exemplos JSON |
|---|---:|---:|---:|
| 00 | 46 → 60 | 1 | 0 |
| 01 | 62 → 78 | 1 | 0 |
| 02 | 73 → 87 | 2 | 0 |
| 03 | 76 → 94 | 1 | 0 |
| 04 | 58 → 66 | 1 | 2 |
| 05 | 65 → 89 | 1 | 0 |
| 06 | 64 → 91 | 1 | 9 |
| 07 | 56 → 62 | 1 | 0 |
| 08 | 52 → 64 | 2 | 0 |
| 09 | 38 → 73 | 0 | 0 |

Evidências locais: `.architecture-review/validation.json`, `.architecture-review/changes.json`, `.architecture-review/baseline.json`, extrações `*.revised.txt` e scripts de revisão/validação documental. A busca automatizada é auxiliar e não prova ausência matemática de toda contradição semântica. A limitação visual impede declarar aprovação integral de apresentação.

## 10. Matriz de rastreabilidade

Todos os ADRs são localizados pelo índice 00. As instruções C# e MonoGame incorporam os contratos transversais aplicáveis, sem reescrever os recortes aprovados.

| ADR-SL | Documentos e seções de implementação documental | Contrato refletido |
|---|---|---|
| 001 | 01 §7; 02 modos e autoria | Dockview, Shadcn UI, Monaco, virtualização e Zustand definidos; preferências locais |
| 002 | 01 IPC lifecycle and authentication; 02 Player lifecycle | Sidecar filho, bootstrap, loopback, token, origem, versões, reconnect e encerramento |
| 003 | 01 IPC; 03 Transactional persistence; 05/06 serialização | Host autoritativo, comandos, revisão, Undo/Redo, salvamento e recuperação |
| 004 | 03 Canonical sources; 04 §6 e Recovery cases; 06 Identity policy | Sidecar obrigatório; índice derivado; movimentos, cópias e ambiguidades |
| 005 | 03 §2 e Canonical sources; 05 Serialization; 06 Format family | Arquivos granulares por entidade; outputs descartáveis |
| 006 | 03 Transactional persistence; 05 §8; 06 Deterministic serialization; 08 build boundary | Dados opacos preservados, inclusive aninhados, undo e plugin ausente |
| 007 | 04 exemplos; 05 §8; 06 Common envelope e Envelope applicability | Envelope e versionamento obrigatórios; casos especiais propostos separadamente |
| 008 | 01 Portable public contracts; 05 Composition; 08 Portable behavior lifecycle | Entidade + componentes/behaviors; armazenamento interno encapsulado |
| 009 | 05 Logic model; 06 Typed Event AST; 08 registro; 09 Typed compiler | AST tipada, CapabilityRegistry e ACE IDs estáveis |
| 010 | 05 Runtime phases; 08 Portable behavior lifecycle; 09 Nine phases | Nove fases preservadas; FrameTime corrige a dependência proibida |
| 011 | 05 Resolution; 06 Composition links; 09 seleção | Instance Override → Object-Ref → Family → Default preservado |
| 012 | 01 build boundary; 02 Development vs Release; 03 profiles; 08 platform; 09 compiler | Player externo, Release independente, registros estáticos, XNB e publicação por target |
| 013 | 02 Player lifecycle; 03 profiles; 09 Interpreter option e diagnostics | Live Reload seguro e Fast Restart de lógica/assemblies no MVP |
| 014 | 02 Player protocol; 06 SourceId; 09 Development diagnostics | SourceId, build/source map, logs, compilação e exceções; stepping pós-MVP |
| 015 | 03 Build keys; 04 Recovery cases; 09 incremental generation | Hashes separados e invalidação por dependência; lógica não reprocessa MGCB inalterado |
| 016 | 01 Portable public contracts; 03 platform; 05 FrameTime; 08 SDK; 09 runtime boundary | Core/SDK/Events sem tipos MonoGame; adaptadores na borda |
| 017 | 01 platform; 03 build keys/platform; 08 capability tiers | Capacidades verificáveis, sem IsConsole genérico na lógica |
| 018 | 01 platform; 03 platform; 08 Runtime registration | Registros gerados, sem reflexão privada MonoGame; swap sujeito à compatibilidade |
| 019 | 05 Layout vs Level; 06 Level fixture; 07 §10 e Approved MVP | Chunks desde o schema; um chunk ortogonal e presets 16/47 no MVP |
| 020 | 03 Canonical sources; 07 External interchange/Approved MVP | LDtk/Tiled traduzem para formatos nativos e ficam fora do MVP |
| 021 | 01 renderer boundary; 02 preview contract; 08 Security/trust | Discovery declarativa; MVP local/first-party; marketplace e trust UI diferidos |
| 022 | 01 boundaries; 05 Preserved authoring; 06 transform fixture; 07 scope | MVP 2D, sem impedir futura evolução para 3D |

## 11. Riscos restantes

1. As cinco propostas não podem ser tratadas como aprovadas por um agente implementador. Especialmente envelope, correlação de seleção e ordem de gatilhos afetam persistência/semântica pública.
2. Determinismo de entrega e serialização não garante física bit a bit entre plataformas. AOT, shaders, packaging e SDKs privados precisam de validação real.
3. Preview WebGL não prova equivalência visual com MonoGame; renderers C# e MGFX têm fallback explícito, não tradução automática prometida.
4. Atomic replace por arquivo não fornece transação multifile sozinho: o journal documentado precisa ser implementado e exercitado com falhas reais.
5. Token/origin/loopback e discovery declarativa não tornam DLLs/importadores confiáveis por si sós. O MVP de addons deve respeitar o fluxo de desenvolvimento local confiado.
6. Formatação/paginação final ainda precisa de renderização e inspeção humana/visual; abertura pelo parser OOXML não substitui esse gate.

## 12. Parecer para project.md

**Pronto para elaboração, com ressalvas explícitas.** Há uma hierarquia inequívoca, índice de contratos e 22 decisões rastreáveis. O futuro project.md deve descrever contratos aprovados e apontar para propostas pendentes, sem lhes atribuir força normativa. Antes de congelar schemas/ABI e contratos avançados, registrar a aprovação ou alternativa escolhida para ADR-SL-023–027. Não há bloqueio documental conhecido ocultado por uma declaração de arquitetura totalmente fechada.

## 13. Parecer para mvp.md

**Pronto para planejamento incremental, não para declarar todos os marcos executáveis sem decisões adicionais.** O primeiro marco de 11 passos está em 00/03, com evidência verificável de persistência, importação, Event Sheet, Player externo, diagnóstico e exportação Desktop. Planejar gates de renderer e envelope antes de consolidar autoria/schemas; de seleção e gatilhos antes dos respectivos casos avançados; de composição antes de hierarchy completa. O subset simples não pode eliminar Containers do produto nem restringir o formato contra sua evolução. Level Editor nativo, tilesets e auto-tiling 16/47 continuam no MVP posterior ao primeiro marco.

project.md e mvp.md não foram gerados nesta tarefa.

## 14. Verificações técnicas externas

Fontes primárias consultadas como suporte técnico, não como nova autoridade de produto:

- O loop fixo do MonoGame pode chamar Update novamente sem Draw intermediário; isso fundamenta a pendência de cadence, não modifica automaticamente o ADR. [MonoGame Game Loop](https://docs.monogame.net/articles/getting_to_know/whatis/game_loop/).
- Código de consoles é disponibilizado a desenvolvedores autorizados por repositórios privados com integrações de fornecedor; não se inferiu comportamento dos SDKs privados. [MonoGame Console Access](https://docs.monogame.net/articles/console_access.html).
- NativeAOT é um modelo específico de publicação com restrições de geração dinâmica e trimming; não foi imposto a todos os targets. [Microsoft Native AOT](https://learn.microsoft.com/en-us/dotnet/core/deploying/native-aot/).
- PixiJS tem renderização web com ciclo próprio; sua avaliação para Starlight é recomendação arquitetural sujeita ao protótipo, não promessa de equivalência MGFX. [PixiJS Render Loop](https://pixijs.com/8.x/guides/concepts/render-loop).
