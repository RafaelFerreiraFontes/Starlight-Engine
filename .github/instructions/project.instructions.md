---
description: "Especificação arquitetural normativa da Starlight Engine (project.md). Define os contratos fechados dos ADRs 001 a 022, fronteiras entre Editor Tauri/React, Host .NET e Runtime MonoGame, formatos JSON canônicos, ciclo de vida de 9 fases, compilador de Event Sheets e Decision Gates pendentes (ADRs 023 a 027)."
applyTo: "**"
---

# Starlight Engine — Especificação Arquitetural Normativa (`project.md`)

Este documento consolida os **Contratos Normativos Imutáveis** da Starlight Engine derivados dos [Objetivos com a engine](../../docs/Objetivos%20com%20a%20engine.md), das decisões aprovadas em [Registro de Decisões Arquiteturais (ADRs 001 a 022)](../../docs/Quest%C3%B5es%20em%20Aberto%20-%20Decis%C3%B5es.md), das erratas de coerência de 14 de outubro de 2026 e do corpo técnico dos documentos de arquitetura [00](../../docs/00_Starlight_Architecture_Definitions_Index.docx) a [09](../../docs/09_Starlight_Event_Sheet_and_CSharp_Compilation_Pipeline.docx).

---

## 1. Visão da Engine e Hierarquia Normativa

A **Starlight Engine** é uma game engine 2D com foco primordial em fluxo visual (*visual-first*) e autoria de scripts em C# nativo (*C#-native*), operando sobre o runtime do MonoGame. A engine combina a intuitividade de autoria e o sistema de eventos de ferramentas consagradas (Construct 3, GDevelop, GameMaker) com o rigor arquitetural e a tipagem estática de ambientes profissionais modernos (Godot, FlatRedBall/Gum, LDtk e Tiled).

> [!IMPORTANT]
> **Intenção de Autoria vs. Linguagem de Runtime:**
> As menções ao Construct 3 ou JavaScript presentes em [Objetivos com a engine.md](../../docs/Objetivos%20com%20a%20engine.md) (como `runtime.callFunction`) expressam estritamente a **intenção funcional de autoria** (seleção de objetos, contêineres, camadas, variáveis, folhas de eventos).
> O runtime, os scripts do usuário e as chamadas geradas na Starlight Engine são **100% C# nativo**. Não há engine de JavaScript, nem interpretador embutido, nem suporte binário a plugins de outras ferramentas.

### Ordem Estrita de Precedência Documental
Qualquer agente, implementador ou revisor deve obedecer à seguinte hierarquia de autoridade:
1. [docs/Objetivos com a engine.md](../../docs/Objetivos%20com%20a%20engine.md) — Intenção funcional e conceitos de produto originais.
2. [docs/Questões em Aberto - Decisões.md](../../docs/Quest%C3%B5es%20em%20Aberto%20-%20Decis%C3%B5es.md) — Contratos normativos fechados dos ADR-SL-001 a ADR-SL-022 e erratas de 14/10/2026.
3. [Documentos Técnicos 00 a 09](../../docs/00_Starlight_Architecture_Definitions_Index.docx) — Especificações de engenharia por subsistema.
4. Estudos Comparativos (MonoGame, FlatRedBall/Gum, GDevelop/Construct) — Apenas suporte histórico e referências conceituais.
5. Instruções de Agentes e Skills — Subordinadas a todos os contratos acima.

---

## 2. Arquitetura em 3 Camadas e a Lei da Build Boundary

A Starlight organiza-se em três camadas estritamente isoladas por processos e dependências ([01_Starlight_Technology_Stack_and_Architecture.docx](../../docs/01_Starlight_Technology_Stack_and_Architecture.docx)):

```text
┌────────────────────────────────────────────────────────────────────────┐
│ CAMADA 1: Starlight Editor (Tauri 2 + React + TypeScript)               │
│ - dockview-react | Shadcn UI (Tailwind dark) | Monaco Editor           │
│ - Zustand (apenas UI efêmera) | Visualização/Gizmos de Layout         │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ WebSocket Local / JSON-RPC (127.0.0.1:<porta>)
                                    ▼ (Token de Sessão / Stdin-Stdout Bootstrap)
┌────────────────────────────────────────────────────────────────────────┐
│ CAMADA 2: Starlight.Editor.Host (.NET Sidecar Process)                 │
│ - ProjectModel autoritativo | AssetDatabase & Sidecars (.meta)         │
│ - Compilador de Event Sheets | Roslyn | Grafo de Build & Transações   │
└────────────────────────────────────────────────────────────────────────┘
══════════════════════════════════════════════════════════════════════════
  LEI DA BUILD BOUNDARY (ADR-SL-012, ADR-SL-016, ADR-SL-018)
══════════════════════════════════════════════════════════════════════════
┌────────────────────────────────────────────────────────────────────────┐
│ CAMADA 3: Starlight.Runtime + MonoGame (Standalone Player / Release)   │
│ - ZERO dependência de Tauri, React, WebView, Rust, Roslyn ou Editor    │
│ - Loop de 9 fases com FrameTime | MonoGame apenas na borda do host    │
└────────────────────────────────────────────────────────────────────────┘
```

### Detalhamento das Camadas
- **Camada 1 — Interface do Editor (Authoring):**
  - **Shell:** Tauri 2 mínimo em Rust, encarregado apenas do ciclo de vida do sidecar (.NET) e janelas nativas. O Rust **nunca** desserializa payloads do modelo do projeto.
  - **Componentes e Layout:** `dockview-react` para docking e abas (`ADR-SL-001`), com disposição salva nas preferências locais do usuário (`.starlight/editor/`). `Shadcn UI` (Radix + Tailwind CSS) em *dark mode* nativo com densidade de IDE.
  - **Editores e Listas:** `@monaco-editor/react` para C# e expressões; `@tanstack/react-virtual` para virtualização de listas e nós de eventos.
  - **Estado:** `Zustand` restrito a estado transitório de UI (seleção ativa, arrastos em andamento, zoom). O estado persistente reside exclusivamente no Host .NET.
  - **Layout Editor:** Renderiza apenas projeções de cena para autoria e previews seguros; **nunca executa gameplay**, física real ou scripts C# arbitrários (`ADR-SL-021`).
- **Camada 2 — Host do Editor (`Starlight.Editor.Host`):**
  - Processo filho inicializado pelo Tauri via `stdin`/`stdout` com emissão de porta dinâmica e token aleatório de sessão (`ADR-SL-002`).
  - Comunicação bidirecional via **WebSocket loopback direto (`127.0.0.1:<porta>`)** utilizando **Typed JSON-RPC**.
  - Detém o `ProjectModel` autoritativo, motor de Undo/Redo, gravação atômica, indexador de assets, compilador de Event Sheets e orquestrador do Roslyn.
- **Camada 3 — Runtime e Player Exportado (`Starlight.Runtime`):**
  - O executável do jogo (`Development Player` ou `Release Build`) é 100% independente do editor.
  - Nenhuma assembly de runtime exportada referencia pacotes de desenvolvimento ou ferramentas de autoria.

---

## 3. Persistência Transacional, Identidade e Formatos Canônicos

### Mutação por Comandos e Undo/Redo (`ADR-SL-003`)
- Toda alteração durável é solicitada pela UI através do método JSON-RPC `project/applyCommand`.
- O Host .NET valida a revisão informada contra a revisão atual (`Validate`), aplica a alteração no staging e calcula a operação inversa (`Apply` / `Invert`), persiste os arquivos afetados de forma atômica (arquivo temporário + *atomic replace*) e registra uma unidade no histórico de Undo/Redo antes de emitir a notificação `ChangeSet`.

### Granularidade dos Arquivos Canônicos (`ADR-SL-005`)
Para garantir compatibilidade com Git e evitar conflitos de merge, o projeto é particionado em arquivos textuais focados:
- `MyGame.starlight`: Manifesto raiz do projeto (versão, configurações globais, addons declarados).
- `Layouts/*.layout`: Composições de cenas, camadas e instâncias posicionadas.
- `Levels/*.level`: Mapas espaciais e grids semânticos reutilizáveis baseados em Chunks.
- `Objects/*.object`: Definições de `Object-Ref` (componentes, behaviors, variáveis e vínculos de família).
- `Events/*.event`: ASTs tipadas das folhas de eventos.
- `Assets/*.tileset`: Definições de fatiamento de tiles, colisões e regras de auto-tiling.
- `Scripts/*.cs` + `Scripts/*.cs.meta`: Scripts C# autorais do usuário e seus respectivos sidecars.
- `Addons/*.addon`: Manifestos declarativos de extensões locais.
- `Assets/**/*.meta`: Sidecars obrigatórios adjacentes a cada asset importado.

**Diretórios Reconstruíveis / Descartáveis (ignorados no Git):**
- `.starlight/cache/`: Caches de importadores e hashes de dependência.
- `.starlight/imports/`: Assets intermediários processados.
- `.starlight/generated/`: Código C# emitido pelo compilador de Event Sheets e registros estáticos de tipos.
- `.starlight/editor/`: Preferências locais de layout do usuário (Dockview).
- `Build/`: Binários compilados e artefatos de publicação.

### Política de Metadados e Sidecars (`ADR-SL-004`)
- Todo arquivo de asset fonte (ex.: `player.png`) possui obrigatoriamente um arquivo adjacente `player.png.meta`.
- O `.meta` é a autoridade canônica do `AssetGuid`, ID e versão do importador, opções de importação, hash dos bytes fonte e dependências.
- O `AssetDatabase` do Host .NET é um **índice derivado e reconstruível** a partir da leitura dos `.meta`.
- **Movimentação Externa:** Movimentar arquivos preservando o `.meta` adjacente preserva a identidade. Movimentações sem `.meta` geram estado de diagnóstico assistido — **nunca** geram novo GUID silenciosamente em caso ambíguo.

### Envelope Canônico e Preservação de Dados Opacos (`ADR-SL-006`, `ADR-SL-007`)
- Todo documento persistido possui na raiz os 4 campos obrigatórios do envelope:
  ```json
  {
    "schema": "starlight.layout",
    "schemaVersion": 1,
    "id": "layout:00000002-1a2b-4c3d-8e9f-0123456789ab",
    "name": "Forest",
    "data": { }
  }
  ```
- **Preservação de Dados Opacos (`[JsonExtensionData]`):** DTOs raiz e objetos aninhados devem preservar intactas propriedades desconhecidas ou originadas de plugins ausentes, prevenindo corrupção de dados ao abrir e salvar projetos.
- Serialização padronizada com `System.Text.Json` no Host .NET, com ordenação estável de chaves e sem valores proibidos (`NaN`, `Infinity`).

### Matriz Estrita de Identificadores
- **`AssetGuid` (`.meta`):** Identifica o arquivo fonte (`asset:f54d0e9a-...`).
- **`ResourceGuid` (Documentos):** Identifica Layouts, Levels, Objects, Events, Tilesets (`layout:...`, `object:...`).
- **`Instance UID` (Layout/Level):** Prefixo `instance:` + UUID persistido no layout, único no documento autoral.
- **`EntityId` (Gameplay Runtime):** Identificador efêmero em memória (índice + geração) da sessão de jogo. **Nunca serializado em disco.**
- **`packageId`:** Namespace do pacote em domínio reverso (`com.example.addon`).
- **`Plugin/Behavior ID`:** Identificador estável da capacidade (`com.starlight.standard:sprite`).
- **`ACE ID`:** Identificador de operação (`com.starlight.platformer:jump`).
- **`SourceId`:** UUID atribuído a cada nó da AST para vinculação de probes e diagnósticos.

---

## 4. Modelo de Domínio, Composição e Precedência

O modelo de domínio da Starlight harmoniza a facilidade do Construct com a robustez composicional de Godot e GameMaker ([05_Starlight_Project_Model.docx](../../docs/05_Starlight_Project_Model.docx)):

### Entidades e Papéis Semânticos (`ADR-SL-008`, `ADR-SL-011`)
- **`Object-Ref`:** Definição abstrata reutilizável de um tipo de objeto (ex.: `Player`, `TrollEnemy`). Define slots de componentes visuais, comportamentos, variáveis padrão e vínculos de família. Não possui posição ou tamanho no mundo.
- **`Instance`:** Ocorrência concreta posicionada em um `Layout` ou `Level`. Possui `Instance UID`, transformação espacial (`x`, `y`, `z`, `angle`) e um dicionário de *overrides* de propriedades.
- **`Family`:** Agrupamento lógico de múltiplos `Object-Refs` que compartilham um contrato de propriedades, variáveis de instância e eventos. **Não é herança de classes da CLR**.
- **`Container`:** Composição estrutural onde objetos são criados, destruídos e co-selecionados juntos (ex.: tanque composto por base + torre). Um personagem na Starlight **não precisa ser um Sprite**; `Sprite` é apenas um componente visual em um contêiner composicional.
- **`Behavior`:** Lógica de comportamento com estado mutável por instância (ex.: `Platformer`, `8Direction`).
- **`Plugin`:** Unidade de extensão declarada que pode ser visual (ex.: `Sprite`), oculta (ex.: `Array`) ou de escopo de projeto (ex.: `Mouse`, `Audio`).

### Ordem Estrita de Precedência de Propriedades (`ADR-SL-011`)
A resolução do valor de qualquer propriedade ocorre de forma determinística por presença de chave:

$$\mathbf{Instance\ Override} \longrightarrow \mathbf{Object\text{-}Ref} \longrightarrow \mathbf{Family} \longrightarrow \mathbf{Default\ do\ Plugin/Behavior}$$

### Isolamento 2D e Preparação para 3D (`ADR-SL-022`)
- A coordenada `z` em transformações 2D representa a ordem de desenho (*draw order / z-index*), sem afetar a física de colisão.
- Os modelos centrais (`Starlight.Core`, `Starlight.ProjectModel`) mantêm suporte opcional a `z` e rotações espaciais, e componentes gráficos são isolados em pacotes dedicados (`Starlight.Standard.Sprite2D`), garantindo que o escopo 2D do MVP não bloqueie futura expansão 3D.

---

## 5. Loop de Runtime em 9 Fases e Tempo Portável

O runtime do jogo executa sob um contrato fixo, imutável e determinístico de **9 fases sequenciais** ([05_Starlight_Project_Model.docx](../../docs/05_Starlight_Project_Model.docx), [09_Starlight_Event_Sheet_and_CSharp_Compilation_Pipeline.docx](../../docs/09_Starlight_Event_Sheet_and_CSharp_Compilation_Pipeline.docx)):

```text
  [1] Input Snapshot       -> Normaliza estados de dispositivos e botões
  [2] Service PreUpdate    -> Atualiza serviços centrais do runtime
  [3] Behavior PreEvents   -> Executa PreEvents(FrameTime) nos Behaviors ativos
  [4] Event Sheet & Triggers -> Processa fila de gatilhos e folhas de eventos compiladas
  [5] Behavior PostEvents  -> Executa PostEvents(FrameTime) reagindo a eventos
  [6] Physics & Late Sys   -> Passo da simulação física, colisões e juntas
  [7] Render Prepare       -> Atualiza matrizes, câmeras, culling e ordenação
  [8] MonoGame Draw        -> Submissão ao SpriteBatch e GraphicsDevice
  [9] Debug & Telemetry    -> Coleta de métricas e streaming de logs via IPC
```

> [!CAUTION]
> **Proibição Absoluta:**
> É expressamente proibido injetar fases intermediárias, alterar a ordem ou inserir uma "segunda passagem" de Event Sheets após a física. O contrato é rigorosamente limitado a 9 fases (`ADR-SL-010`).

### Tempo Portável (`FrameTime`) vs. `GameTime` (`ADR-SL-010`, `ADR-SL-016`)
- As assinaturas portáveis do SDK recebem o struct imutável:
  ```csharp
  public readonly record struct FrameTime(System.TimeSpan Delta, System.TimeSpan Total, long FrameIndex);
  ```
- `Delta` representa o tempo da simulação, `Total` o tempo acumulado e `FrameIndex` (`long`) o contador ordinal de passos de atualização (`Update`).
- **Nenhum contrato portável expõe `Microsoft.Xna.Framework.GameTime`**. A conversão ocorre unicamente dentro do adaptador `Starlight.Runtime.MonoGame`.

---

## 6. Compilador de Event Sheets, Catálogo ACE e Diagnósticos

O compilador de eventos (`Starlight.Events.Compiler`) opera como um gerador de código que converte a lógica visual em C# fortemente tipado ([09_Starlight_Event_Sheet_and_CSharp_Compilation_Pipeline.docx](../../docs/09_Starlight_Event_Sheet_and_CSharp_Compilation_Pipeline.docx)):

### Pipeline de Compilação
1. **Event AST (JSON Tipado):** Representa condições, ações, subeventos, variáveis e expressões tipadas. Proibido armazenar C# cru como expressão canônica.
2. **Validação Semântica:** Checagem de assinaturas, tipos, ciclos de includes e existência de identificadores contra o `CapabilityRegistry`.
3. **Event IR (SelectionFrame / SOL):** Representação intermediária que modela o contexto de seleção de instâncias (*Selected Object List*). Condições filtram conjuntos de instâncias; ações afetam apenas as instâncias selecionadas.
4. **C# Gerado (`.starlight/generated/`):** Código C# emitido com cabeçalho `// <auto-generated />`, `#nullable enable` e instrumentação de probes de `SourceId`.
5. **Roslyn Compilation:** Compilação das classes geradas em conjunto com os scripts do projeto, produzindo o assembly do jogo.

### Catálogo ACE e Convergência de APIs (`ADR-SL-009`)
- Actions, Conditions e Expressions referenciam IDs estáveis (`pacote:ace-id`).
- Event Sheets e scripts C# do usuário chamam exatamente os mesmos serviços e capacidades expostos pelo `CapabilityRegistry`.
- Código gerado consome exclusivamente interfaces portáveis do `Starlight.Runtime` (ex.: `Input.IsActionPressed`), sendo vedado o acesso direto ao MonoGame.

### Compilação Incremental e Invalidação por Hashes Independentes (`ADR-SL-015`)
O grafo de compilação mantém 3 subgrafos com hashes criptográficos independentes:
1. **Assets + `.meta`:** Alterações acionam importadores e processamento MGCB.
2. **Event ASTs:** Alterações recompilam apenas a folha alterada para C#.
3. **Scripts C# do usuário:** Alterações acionam o Roslyn.
*Regra fundamental:* Alterar nós de lógica ou scripts C# **jamais reprocessa o pipeline de assets (MGCB)**.

---

## 7. Level Editor Nativo, Addons e Portabilidade/Consoles

### Level Editor Nativo 2D e Endereçamento por Chunks (`ADR-SL-019`)
- O documento `.level` é estruturado em uma coleção de **Chunks** espaciais endereçáveis por coordenadas inteiras (`x`, `y`), metadados de orientação e tamanho do chunk.
- Os grids mantêm camadas semânticas (`IntGrid`) separadas das camadas visuais de tiles, permitindo que a lógica de jogo avalie regras como `GetCellType(x, y) == Water` em vez de depender de IDs arbitrários de imagens.
- Presets de Auto-Tiling de **16 tiles** e **47 tiles** são compilados sobre um motor de regras genérico (*Tile Rule Engine*).
- Importadores de LDtk e Tiled são tradutores de pipeline diferidos para pós-MVP (`ADR-SL-020`).

### Segurança e Addons Declarativos (`ADR-SL-018`, `ADR-SL-021`)
- A descoberta inicial de addons pelo editor lê exclusivamente os metadados JSON declarativos (`addon.manifest.json`).
- Assemblies executáveis de addons não são carregadas dinamicamente no processo do editor ao navegar em projetos.
- O runtime do jogo exportado não realiza escaneamento de DLLs; todos os registros de tipos são estáticos e gerados no build.

### Portabilidade e Consoles sob NDA (`ADR-SL-017`, `ADR-SL-018`)
- Plataformas são tratadas pelo modelo baseado em capacidades (`IPlatformCapabilities`).
- O futuro suporte a consoles baseia-se no **Swap Model**: substituição da assembly adaptadora do MonoGame e injeção de serviços nativos em um repositório isolado (`Starlight.Targets.Console.*`), sem expor SDKs privados no código aberto.

---

## 8. Tabela de Decision Gates Pendentes (ADR-SL-023 a ADR-SL-027)

> [!WARNING]
> **REGRA DE BLOQUEIO CRÍTICA (DECISION GATES):**
> Os 5 tópicos abaixo possuem status **`Proposed / Pending Approval`**.
> **Nenhum agente ou desenvolvedor pode tratá-los como contratos fechados ou obrigar sua implementação definitiva sem aprovação explícita.**

| Candidato | Doc | Escopo Proposto | Risco / Por que Requer Aprovação |
|---|---|---|---|
| **`ADR-SL-023`** | 02 | Renderer do Layout Editor (WebGL/PixiJS vs. WebGL próprio vs. Serviço nativo). | Fidelidade de renderização com MonoGame, perda de contexto em WebView e desempenho. Prototipar PixiJS antes de congelar decisão. |
| **`ADR-SL-024`** | 05 | Semântica avançada de composição (árvore de ownership, transformações locais, ciclo atômico de Create/Destroy em contêineres). | Conflitos em múltiplas famílias, quebra de precedência de propriedades e reparenting de física. Manter composição simples no MVP. |
| **`ADR-SL-025`** | 09 | Fila de gatilhos físicos da Fase 6 para a Fase 4 do próximo frame ($N+1$) e cadência Update/Draw. | Latência observável em colisões e divergência entre taxa de simulação física e frames de tela. Aprovar antes de travar a física. |
| **`ADR-SL-026`** | 06 | Envelopes de `.addon` (descriptor GUID vs. `packageId`) e padronização de arquivos não-nomeáveis (caches, preferências). | Ambiguidade entre nomes de pacotes legíveis e UUIDs canônicos; risco de inflar arquivos efêmeros com envelopes desnecessários. |
| **`ADR-SL-027`** | 09 | Casos avançados de seleção de eventos (união estável em blocos `OR`, inversão relacional e Create/Destroy no mesmo passo). | Risco de explosão combinatória (produto cartesiano), vazamento de escopo entre irmãos e instâncias fantasmas. Homologar antes da ABI do compilador. |

---

## 9. Referências Cruzadas de Skills dos Agentes

Para implementar código em conformidade com esta especificação, utilize as seguintes Agent Skills:
- Para auditar isolamento do MonoGame, `FrameTime` e `Build Boundary`: [starlight-boundary-audit](../skills/starlight-boundary-audit/SKILL.md)
- Para implementar DTOs JSON canônicos e envelopes com `[JsonExtensionData]`: [starlight-schema-serializer](../skills/starlight-schema-serializer/SKILL.md)
- Para criar comandos transacionais com Undo/Redo via JSON-RPC: [starlight-ipc-command](../skills/starlight-ipc-command/SKILL.md)
- Para criar manifestos de plugins, behaviors e catálogos ACE: [starlight-addon-scaffold](../skills/starlight-addon-scaffold/SKILL.md)
- Para criar testes de seleção do compilador de eventos e instrumentar `SourceId`: [starlight-event-ast-test](../skills/starlight-event-ast-test/SKILL.md)
