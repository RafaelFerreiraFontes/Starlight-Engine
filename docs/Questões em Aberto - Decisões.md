
# Starlight Engine — Registro de Decisões Arquiteturais (ADRs) e Contratos Fechados

**Status:** Normativo (Fonte da Verdade para geração do `project.md` e `mvp.md`)
**Data de Consolidação:** Outubro de 2026

> **Instrução para o Orquestrador:** Este documento resolve as questões de design cobertas expressamente pelos ADR-SL-001 a ADR-SL-022. Lacunas estruturais adicionais permanecem propostas pendentes, identificadas nos documentos 00–09; não são decisões automaticamente aprovadas. 
> - Use as seções **"Contrato Normativo (project.md)"** para definir as regras imutáveis da arquitetura.
> - Use as seções **"Recorte de Implementação (mvp.md)"** para delimitar o escopo mínimo implementável sem violar os contratos de longo prazo.

---

## EIXO 1: Editor, Interface (UI) e Comunicação Interprocessos (IPC)

### ADR-SL-001: Biblioteca de Componentes React e Sistema de Docking

- **Status:** Decidido
- **Contexto:** A interface da engine exige alta densidade de informação estilo IDE, suporte a múltiplas janelas encaixáveis (docking), painéis retráteis, árvores virtualizadas e integração nativa com o Monaco Editor.
- **Contrato Normativo (`project.md`):**
  - **Sistema de Docking:** `dockview-react` (`dockview`), garantindo suporte a divisão de painéis (split), abas agrupadas, painéis flutuantes (popout) e serialização completa do layout em JSON.
  - **Design System e Componentes:** `Shadcn UI` (Radix UI + Tailwind CSS), operando nativamente em *dark mode* com controle denso de espaçamento.
  - **Complementos Obrigatórios:** `@monaco-editor/react` para edição de C# e expressões; `@tanstack/react-virtual` para virtualização da árvore de assets e nós do Event Sheet; `Zustand` exclusivamente para estado efêmero de UI (nunca como verdade do projeto).
- **Recorte de Implementação (`mvp.md`):** Implementar o layout base com Dockview (Scene/Layout View, Event Sheet View, Project Explorer, Inspector e Console/Logs) e salvar a disposição das janelas apenas nas preferências locais do usuário (`.starlight/editor/`).

### ADR-SL-002: Transporte de IPC (Tauri 2 ↔ Host .NET) e Ciclo de Vida

- **Status:** Decidido
- **Contexto:** O Tauri 2 atua apenas como casca nativa (*desktop shell*), enquanto o `Starlight.Editor.Host` (.NET) detém toda a regra de negócio, modelo do projeto, Roslyn e pipeline de build.
- **Contrato Normativo (`project.md`):**
  - **Gerenciamento de Processo:** O Tauri inicializa o `Starlight.Editor.Host` como um processo filho (*Sidecar*) via Standard I/O (`stdin`/`stdout`) para controle estrito de ciclo de vida (bootstrap, handshake de porta/token e encerramento determinístico caso a janela feche).
  - **Transporte de Dados:** Comunicação principal via **WebSockets / HTTP Local Direto** (hospedado via Kestrel/Minimal APIs no processo .NET em `127.0.0.1:<porta_dinamica>`) utilizando **Typed JSON-RPC**, protegido por um token de sessão único gerado no bootstrap.
  - **Responsabilidade do Rust:** Mínima. O código Rust no Tauri não deve intermediar ou desserializar payloads do modelo do projeto, limitando-se a janelas, diálogos nativos de sistema operacional e gerenciamento do processo sidecar.
- **Recorte de Implementação (`mvp.md`):** Bootstrap do sidecar .NET pelo Tauri, conexão WebSocket direta do React com autenticação por token de sessão e geração automatizada de interfaces TypeScript a partir dos DTOs C# (`Starlight.Editor.Protocol`).

### ADR-SL-003: Fluxo Transacional Ponta a Ponta (UI ↔ Host .NET)

- **Status:** Decidido
- **Contrato Normativo (`project.md`):**
  - A UI em React nunca muta arquivos diretamente. Toda alteração durável despacha um comando transacional (`IProjectCommand` via RPC `project/applyCommand`) para o Host .NET.
  - O Host .NET valida a mutação contra o `ProjectModel`, gera o registro de Undo/Redo, persiste nos arquivos correspondentes e emite eventos de atualização para sincronizar o estado transitório no Zustand.

~~~

┌─────────────────────────────────────────────────────────────────┐

│ TAURI 2 (Shell Nativo) │

│ - Gerencia ciclo de vida do processo filho .NET (Sidecar) │

│ - Janelas nativas, menus de SO e diálogos de arquivo │

└────────────────────────────────┬────────────────────────────────┘

│ Bootstrap (Stdin/Stdout + Token)

┌──────────────────────┴──────────────────────┐

▼ ▼

┌───────────────────────────────────┐ ┌───────────────────────────────────┐

│ FRONTEND (WebView) │ │ Starlight.Editor.Host │

│ │ │ (.NET) │

│ • Layout: Dockview │ IPC │ • ProjectModel & ProjectGraph │

│ • Componentes: Shadcn UI │ WS │ • AssetDatabase & Importers │

│ • Estado transitório: Zustand │◄─────►│ • Roslyn & Event Compiler │

│ • Editores: Monaco / Event Sheets │ JSON │ • Servidor IPC (Kestrel Local) │

│ • Cliente: Typed JSON-RPC Client │ RPC │ • Transações & Undo/Redo │

└───────────────────────────────────┘ └───────────────────────────────────┘

~~~
  

---

## EIXO 2: Armazenamento, Arquivos e Metadados

### ADR-SL-004: Estratégia de Metadados de Assets (Sidecars)

- **Status:** Decidido
- **Contexto:** Recursos precisam manter identidade por GUID estável independente do caminho de arquivo no sistema operacional.
- **Contrato Normativo (`project.md`):**
  - Adoção obrigatória de **Arquivos Sidecar (`.meta`)** adjacentes a cada arquivo fonte importado (ex: `player.png` -> `player.png.meta`).
  - O arquivo `.meta` armazena o `Asset GUID`, o ID e versão do importador, configurações de importação (ex: `sampling: point`), hash de conteúdo e dependências.
  - Movimentações ou renomeações via editor ou sistema de arquivos preservam o GUID quando o `.meta` correspondente é preservado. Sem sidecar, a identidade pode ser ambígua: emitir diagnóstico e usar recuperação assistida, sem gerar novo GUID silenciosamente.
- **Recorte de Implementação (`mvp.md`):** Suporte completo a `.meta` para texturas, áudios e fontes no `AssetDatabase`, com detecção de arquivos movidos/renomeados.

### ADR-SL-005: Granularidade da Serialização do Projeto

- **Status:** Decidido
- **Contexto:** Evitar arquivos monolíticos que causam conflitos severos de merge no controle de versão (Git).
- **Contrato Normativo (`project.md`):**
  - **Separação Granular por Entidade e Diretório:**
    - `MyGame.starlight`: Manifesto raiz do projeto (configurações globais, versão da engine, perfis de build, dependências de addons).
    - `Layouts/*.layout`: Composição de cenas/salas, camadas e instâncias posicionadas.
    - `Levels/*.level`: Mapas espaciais/grids semânticos reutilizáveis.
    - `Objects/*.object`: Definições de `Object-Refs` (componentes, behaviors, variáveis e vínculos de família).
    - `Events/*.event`: Árvores Sintáticas Abstratas (AST) das Event Sheets.
    - `Assets/*.tileset`: Definições de tilesets, colisões e regras de auto-tile.
- **Recorte de Implementação (`mvp.md`):** Implementar serialização determinística (chaves ordenadas) para `.starlight`, `.layout`, `.object`, `.event` e `.meta`.

### ADR-SL-006: Política de Compatibilidade e Campos Desconhecidos (Unknown-Fields)

- **Status:** Decidido
- **Contrato Normativo (`project.md`):**
  - **Preservação de Dados Opacos (Opaque Data):** O desserializador do `ProjectModel` deve capturar propriedades JSON não reconhecidas ou pertencentes a plugins ausentes/desativados (utilizando `[JsonExtensionData]` no `System.Text.Json`) e reescrevê-las intactas ao salvar o documento.
  - Metadados opcionais desconhecidos são preservados silenciosamente; capacidades obrigatórias ausentes (`missing required capabilities`) emitem erro de validação impeditivo para o Build, mas nunca destroem o arquivo em disco ao abrir no editor.

### ADR-SL-007: Padronização de Schemas JSON e Versionamento

- **Status:** Decidido
- **Contrato Normativo (`project.md`):**
  - O Host .NET é a única autoridade de serialização/desserialização via `System.Text.Json`.
  - Todos os documentos persistidos devem conter um envelope padrão raiz com `"schema"` (ex: `"starlight.layout"`), `"schemaVersion"` (inteiro sequencial iniciando em `1`), `"id"` (GUID prefixado imutável) e `"name"`.
  - Schemas JSON formais devem ser gerados a partir dos DTOs em C# para validação de contrato com o frontend TypeScript.

---

## EIXO 3: Arquitetura de Runtime (Tempo de Execução)

### ADR-SL-008: Modelo de Objetos em Runtime (GameObject + Behaviors vs. ECS)

- **Status:** Decidido
- **Contrato Normativo (`project.md`):**
  - A superfície pública da API (SDK, C# Scripts e Event Sheets) adota o modelo composicional clássico de **Entidade + Componentes/Behaviors (`GameObject` identificado por `EntityId` + `IBehavior`)**.
  - O layout de memória interno permanece encapsulado: o runtime pode otimizar o armazenamento internamente (usando registros empacotados/arrays contíguos para sistemas críticos) sem expor semânticas de ECS puro no contrato público de plugins.
- **Recorte de Implementação (`mvp.md`):** Implementação direta baseada em `Entity`, `Transform2D`, componentes visuais (`Sprite`) e coleção de `Behaviors` com ciclo de vida explícito.

### ADR-SL-009: Linguagem de Expressões de Eventos e Catálogo ACE

- **Status:** Decidido
- **Contrato Normativo (`project.md`):**
  - Expressões em Event Sheets são persistidas como uma **AST de Expressão Tipada** (com operadores estilo C#), nunca como strings de código C# cruas.
  - Todas as Actions, Conditions e Expressions (ACEs) referenciam IDs estáveis registrados no `CapabilityRegistry` (ex: `com.starlight.platformer:jump`), garantindo que renomeações visuais ou refatorações não quebrem a lógica do projeto.

### ADR-SL-010: Contrato Fixo de Fases do Loop de Runtime

- **Status:** Decidido
- **Contrato Normativo (`project.md`):**
  - Plugins e Behaviors não podem injetar ganchos arbitrários no loop do MonoGame. A execução por frame segue estritamente 9 fases determinísticas e contratuais:
    1. `Input Snapshot`: Captura e normalização de estado de dispositivos em ações.
    2. `Service PreUpdate`: Atualização inicial de serviços globais do runtime.
    3. `Behavior PreEvents`: Execução de `PreEvents(FrameTime)` em todos os Behaviors ativos.
    4. `Event Sheet & Triggers`: Entrega da fila de gatilhos e execução do código compilado das Event Sheets.
    5. `Behavior PostEvents`: Execução de `PostEvents(FrameTime)` em todos os Behaviors ativos.
    6. `Physics & Late Systems`: Sincronização de física, colisões e sistemas tardios.
    7. `Render Prepare`: Atualização de transformações, câmeras, visibilidade e ordenação do grafo de cena.
    8. `MonoGame Draw`: Submissão de passes de renderização (`SpriteBatch`/`GraphicsDevice`).
    9. `Debug & Telemetry`: Coleta e envio de métricas/logs para o protocolo de desenvolvimento.

### ADR-SL-011: Ordem de Resolução de Herança, Famílias e Overrides

- **Status:** Decidido
- **Contrato Normativo (`project.md`):**
  - Instâncias posicionadas em `Layouts` ou `Levels` armazenam apenas seu `Instance UID`, transformação espacial e um dicionário de *overrides* em relação ao seu `Object-Ref`.
  - A resolução de propriedades segue a precedência estrita e determinística: **`Instance Override` → `Object-Ref` → `Family` → `Default do Plugin/Behavior`**, com detecção de ciclos em tempo de validação/compilação.
- **Recorte de Implementação (`mvp.md`):** Suporte a `Instance Override` sobre `Object-Ref` e agrupamento simples por `Family` (sem herança multinível aninhada complexa no primeiro corte).

---

## EIXO 4: Pipelines, Compilação, Hot Reload e Depuração

### ADR-SL-012: Estratégia de Build (Development vs. Release) e AOT

- **Status:** Decidido
- **Contrato Normativo (`project.md`):**
  - **Perfis Baseados em Capabilities:**
    - `Development Player`: Executável externo isolado, focado em iteração rápida, compilação incremental via Roslyn, símbolos de debug ativos, protocolo de comunicação do editor habilitado, assets soltos/cacheados e sem otimizações destrutivas de AOT/trimming.
    - `Release Build`: Event Sheets compiladas em C# estático, geração de registros estáticos de tipos (zero descoberta dinâmica em runtime), ativos processados pelo MonoGame Content Pipeline (XNB) e empacotamento restrito aos módulos/addons efetivamente referenciados pelo grafo de dependências, permitindo trimming e AOT nativo quando exigido pela plataforma.
- **Recorte de Implementação (`mvp.md`):** Focar no `Development Player` em processo separado e exportação `Release` para alvos Desktop públicos (`DesktopGL` / `WindowsDX`).

### ADR-SL-013: Política de Hot Reload Híbrido (Assets vs. Código)

- **Status:** Decidido
- **Contrato Normativo (`project.md`):**
  - **Assets e Dados Seguros (Live Reload):** Texturas, áudios e alterações simples de propriedades no Inspector são atualizados em tempo real no `Development Player` via mensagens do `Editor Protocol`.
  - **Código e Lógica (Fast Restart):** Modificações em scripts C#, estrutura de Event Sheets ou assemblies de plugins **não** utilizam recarga dinâmica via `AssemblyLoadContext` no MVP. Elas acionam compilação incremental rápida e o **reinício automático do processo do `Development Player`**, favorecendo estabilidade e isolamento de falhas, sem garantir ausência de falhas do processo.

### ADR-SL-014: Depuração Visual e Mapeamento de Fonte (SourceId Probes)

- **Status:** Decidido
- **Contrato Normativo (`project.md`):**
  - O compilador de Event Sheets (`Starlight.Events.Compiler`) deve emitir código C# em `.starlight/generated/` instrumentado com sondas (probes) e metadados contendo o `SourceId` (GUID) do nó original da AST.
  - Exceções, logs e pausas no runtime reportam o `SourceId` pelo `RuntimeDebugProtocol` via IPC, permitindo à interface React destacar visualmente o bloco exato no Event Sheet.
- **Recorte de Implementação (`mvp.md`):** Implementar o mapeamento de `SourceId` para logs estruturados, erros de compilação e destaque de exceções em tempo de execução (deixando *step-by-step breakpoints* interativos para pós-MVP).

### ADR-SL-015: Compilação Incremental e Invalidação por Hash

- **Status:** Decidido
- **Contrato Normativo (`project.md`):**
  - O grafo de build (`Starlight.Build`) mantém hashes criptográficos independentes para: (1) arquivos fonte de assets + configurações `.meta`, (2) nós da AST de Event Sheets, e (3) scripts C# do usuário.
  - Alterações em lógica (Event Sheets/C#) jamais reprocessam o MonoGame Content Pipeline (MGCB); apenas nós marcados como *dirty* no grafo de dependências são reconstruídos.

---

## EIXO 5: Isolamento de Plataforma e Preparação para Consoles (NDA-Safe)

### ADR-SL-016: Baseline de Portabilidade e Isolamento do MonoGame

- **Status:** Decidido
- **Contrato Normativo (`project.md`):**
  - O `Microsoft.Xna.Framework` público é o único contrato de baixo nível permitido, e seu acesso fica restrito aos projetos adaptadores (`Starlight.Runtime.MonoGame` / `Starlight.Rendering`).
  - `Starlight.Core`, `Starlight.ProjectModel`, contratos de plugins e código C# gerado por Event Sheets são estritamente proibidos de referenciar namespaces nativos ou de backends específicos (`SDL`, `OpenGL`, `DirectX`, `SharpDX`, `WinForms`, `DesktopGL`, `WindowsDX`).

### ADR-SL-017: Modelo de Plataforma Baseado em Capacidades (Capability-Based Model)

- **Status:** Decidido
- **Contrato Normativo (`project.md`):**
  - É proibido o uso de flags genéricas como `IsConsole` ou diretivas `#if` espalhadas pela lógica de jogo.
  - Diferenças de plataforma são modeladas por descritores de capacidades (`IPlatformCapabilities`: gráficos, limites de textura, perfis de shader, entrada, armazenamento, serviços de usuário) validados pelo exportador antes da compilação.

### ADR-SL-018: Regras de Segurança para Consoles (Console-Safety & Swap Model)

- **Status:** Decidido
- **Contrato Normativo (`project.md`):**
  - **Zero JIT / Zero Reflexão Crítica em Gameplay:** O código de Event Sheets é sempre compilado estaticamente no build, e o registro de tipos/plugins usa geradores de código em tempo de build (*generated registries*), nunca descoberta dinâmica de DLLs no startup do jogo.
  - **Proibição de Reflexão Interna:** É proibido usar reflexão para acessar membros privados do MonoGame.
  - **Swap Model:** O objetivo arquitetural da futura exportação para consoles (sob NDA) é substituir o pacote de destino do MonoGame e injetar adaptadores de serviços de plataforma, preservando o código do projeto e o runtime portável. A viabilidade depende da compatibilidade efetiva dos SDKs, APIs, serviços, conteúdo e empacotamento do target; não constitui garantia universal antes da validação autorizada.
  - **Auditoria Isolada:** Quando os SDKs privados forem autorizados, a integração ocorrerá em um workspace isolado (`Starlight.Targets.Console.*`) sem contaminar o repositório aberto.

---

## EIXO 6: Funcionalidades Diferidas e Contratos de Expansão Futura

### ADR-SL-019: Editor de Níveis (Level Editor) e Endereçamento por Chunks

- **Status:** Decidido
- **Contrato Normativo (`project.md`):**
  - `Layout` (cena completa) e `Level` (asset espacial/grid reutilizável com camadas semânticas/IntGrid e regras de auto-tile) são entidades distintas.
  - O schema de serialização do `.level` deve estruturar os dados de grid dentro de coleções endereçáveis por **Chunks** (coordenadas de bloco) e metadados de orientação, nunca como uma matriz 2D única e rígida na raiz do documento.
- **Recorte de Implementação (`mvp.md`):** Implementar apenas mapas ortogonais de tamanho fixo (1 chunk lógico) com suporte a camada semântica e regras de auto-tile (presets de 16/47 tiles compilados para o motor de regras genérico). Suporte a mapas isométricos, hexagonais, *staggered* e streaming de múltiplos chunks fica diferido para pós-MVP.

### ADR-SL-020: Importadores Externos (LDtk e Tiled)

- **Status:** Decidido
- **Contrato Normativo (`project.md`):**
  - Formatos externos nunca são o formato canônico da engine. Futuros importadores de LDtk e Tiled funcionarão como tradutores no pipeline de assets, convertendo camadas/entidades para a semântica nativa de `.level` e `.tileset` e gerando GUIDs próprios da Starlight.
- **Recorte de Implementação (`mvp.md`):** Fora do escopo do MVP (usar apenas o Level Editor nativo).

### ADR-SL-021: Segurança de Addons e Marketplace Trust

- **Status:** Decidido
- **Contrato Normativo (`project.md`):**
  - Como addons contêm assemblies C# executáveis, o editor deve realizar a descoberta inicial lendo exclusivamente os manifestos declarativos JSON (`.addon`, schemas de propriedades e ACEs), sem carregar ou executar DLLs arbitrárias automaticamente.
- **Recorte de Implementação (`mvp.md`):** Suportar apenas addons de desenvolvimento local e pacotes padrão embutidos (*First-Party Standard Library*). A infraestrutura de Marketplace online, assinatura criptográfica e UI de permissões fica diferida para pós-MVP.

### ADR-SL-022: Isolamento do Escopo 2D e Preparação para 3D

- **Status:** Decidido
- **Contrato Normativo (`project.md`):**
  - Os pacotes de domínio central (`Starlight.Core`, `Starlight.ProjectModel`, `Starlight.Events`) não devem impor restrições que impeçam coordenadas 3D (ex: manter `z` opcional nas transformações serializadas e separar componentes de renderização em pacotes específicos como `Starlight.Standard.Sprite2D`).
- **Recorte de Implementação (`mvp.md`):** Runtime, física, câmera e ferramentas de edição do MVP são **estritamente focados em 2D**.

## Erratas de coerência da revisão documental de 14/10/2026

Estas erratas preservam as 22 decisões e seus recortes. Não aprovam os candidatos ADR-SL-023 a ADR-SL-027.

- **ADR-SL-010 / 016:** `FrameTime` substitui `GameTime` nas assinaturas portáveis. É um valor imutável Starlight com `Delta` e `Total` (`System.TimeSpan`) e `FrameIndex` (`long`, índice da atualização de simulação). Apenas `Starlight.Runtime.MonoGame` converte `Microsoft.Xna.Framework.GameTime`. As nove fases permanecem inalteradas. Entrega de gatilhos e correspondência Update/Draw permanecem propostas em 09.
- **ADR-SL-004:** a preservação em movimentação externa exige sidecar preservado ou recuperação de identidade comprovada; hash igual sozinho não prova identidade. A correção impede prometer reconhecimento infalível de movimentos sem `.meta`.
- **ADR-SL-013:** Fast Restart isola falhas e evita os problemas de recarga dinâmica, mas não garante estabilidade absoluta de software arbitrário.
- **ADR-SL-018 em conjunto com 012/016/017:** o swap é objetivo sujeito à validação efetiva por target. “Zero JIT” significa não depender de compilação/geração dinâmica de gameplay ou descoberta de plugins; não obriga NativeAOT em todo Desktop. Reflexão restrita pode depender de metadados e suporte do target; reflexão privada no MonoGame continua proibida. Registros estáticos gerados continuam obrigatórios.
- **Escopo:** a introdução não declara resolvidas lacunas não cobertas pelos 22 ADRs. Propostas adicionais e seu local de aprovação estão catalogadas no documento 00; o relatório de auditoria é informativo.
