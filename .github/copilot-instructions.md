# Starlight Engine — Instruções Gerais do Projeto

A Starlight Engine é uma game engine 2D com autoria visual e scripts em C# nativo sobre o runtime do MonoGame, organizada em 3 camadas: Editor Tauri 2/React (Authoring), Host .NET (ProjectModel e Persistência) e Runtime MonoGame (Gameplay portável).

## Roteamento Obrigatório de Instruções

Antes de planejar ou modificar código, consulte as instruções canônicas correspondentes:

1. **[Especificação Arquitetural Normativa](instructions/project.instructions.md):**
   - Contratos imutáveis fechados dos **ADR-SL-001 a ADR-SL-022** e erratas de 14/10/2026.
   - **Lei da Build Boundary:** zero acoplamento do runtime de gameplay com Tauri, React, Roslyn ou Editor (`ADR-SL-012`, `016`, `018`).
   - Persistência atômica via comandos (`IProjectCommand`), formatos canônicos JSON e dados opacos (`[JsonExtensionData]`).
   - Loop determinístico de 9 fases e tempo portável com `FrameTime` (proibido `GameTime` no Core/SDK/Events).
   - Compilador de Event Sheets (`SelectionFrame` / SOL), catálogo ACE estável e instrumentação de `SourceId`.
   - **Travas de Decisão (Decision Gates):** **ADR-SL-023 a ADR-SL-027** são propostas (*Proposed / Pending Approval*), não contratos aprovados.

2. **[Plano Executivo de Marcos e Escopo do MVP](instructions/mvp.instructions.md):**
   - Execução estritamente incremental; proibição de `NotImplementedException`, métodos vazios ou mocks simulados.
   - **Marco Vertical 1 (M1):** Primeiro projeto jogável ponta a ponta (11 passos contratuais e 4 evidências de aceite).
   - **Marcos M2 a M4:** Dockview/IPC/Hot Reload Híbrido (M2), Modelo de Objetos/Overrides/Standard Library (M3), Level Editor 2D e Auto-Tiling 16/47 (M4).
   - Funcionalidades estritamente fora do MVP: 3D, importadores LDtk/Tiled, streaming multi-chunk, marketplace e recarga ALC em memória.

3. **[Índice de Arquitetura e Autoridade](instructions/starlight-architecture.instructions.md):**
   - Hierarquia documental de autoridade: [Objetivos](../docs/Objetivos%20com%20a%20engine.md) $\rightarrow$ [ADRs](../docs/Quest%C3%B5es%20em%20Aberto%20-%20Decis%C3%B5es.md) $\rightarrow$ [Documentos Técnicos 00 a 09](../docs/00_Starlight_Architecture_Definitions_Index.docx) $\rightarrow$ Instruções.

## Agent Skills Reutilizáveis (`.github/skills/`)

Carregue sob demanda a skill correspondente ao domínio da tarefa:
- **[starlight-boundary-audit](skills/starlight-boundary-audit/SKILL.md):** Auditoria de integridade de assemblies, isolamento do MonoGame, `FrameTime` e AOT/consoles.
- **[starlight-schema-serializer](skills/starlight-schema-serializer/SKILL.md):** DTOs JSON, envelopes raiz e preservação de campos desconhecidos.
- **[starlight-ipc-command](skills/starlight-ipc-command/SKILL.md):** Comandos transacionais com Undo/Redo e comunicação JSON-RPC WebSocket.
- **[starlight-addon-scaffold](skills/starlight-addon-scaffold/SKILL.md):** Addons, plugins, behaviors, catálogo ACE e discovery declarativo.
- **[starlight-event-ast-test](skills/starlight-event-ast-test/SKILL.md):** Testes de filtragem de instâncias no compilador de eventos e probes de `SourceId`.

## Diretrizes de Entrega e Preservação
- Preserve arquivos existentes; não realize commits, pushes ou resets destrutivos no Git nesta tarefa.
- Toda implementação deve ser validada por compilação real, testes automatizados e revisão independente do `Starlight QA Engineer`.
