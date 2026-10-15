---
description: "Índice de autoridade normativa e roteamento da arquitetura da Starlight Engine. Direciona para a especificação técnica completa (project.instructions.md), plano de marcos (mvp.instructions.md) e Agent Skills reutilizáveis."
applyTo: "**"
---

# Starlight Engine — Arquitetura Global e Índice de Roteamento

A Starlight Engine é uma engine 2D com fluxo visual e autoria em C# nativo sobre o runtime do MonoGame, estruturada em três camadas com isolamento estrito: Editor Tauri 2/React (Authoring), Host .NET (Regras de negócio, Roslyn e Persistência) e Runtime MonoGame (Execução de gameplay portável).

## Documentos Centrais de Instrução

Para obter as diretrizes completas de desenvolvimento, consulte os documentos normativos específicos:

1. **[Especificação Arquitetural Normativa (project.instructions.md)](./project.instructions.md):**
   - Contratos imutáveis fechados dos **ADR-SL-001 a ADR-SL-022** e erratas de 14/10/2026.
   - Arquitetura em 3 camadas e **Lei da Build Boundary** (`ADR-SL-012`, `016`, `018`).
   - Persistência transacional via comandos (`IProjectCommand`), formatos canônicos e envelopes com `[JsonExtensionData]` (`ADR-SL-003` a `007`).
   - Modelo composicional, ciclo de 9 fases e tempo portável com `FrameTime` (`ADR-SL-008`, `010`, `011`, `016`).
   - Compilador de Event Sheets, representação intermediária (`SelectionFrame`) e mapeamento por `SourceId` (`ADR-SL-009`, `014`, `015`).
   - Tabela de Decision Gates pendentes (**ADR-SL-023 a ADR-SL-027** — *Proposed / Pending Approval*).

2. **[Plano Executivo de Marcos e Escopo do MVP (mvp.instructions.md)](./mvp.instructions.md):**
   - Diretriz de execução incremental e integridade de código (zero código falso / zero mocks vazios).
   - **Marco Vertical 1 (M1):** Primeiro projeto jogável ponta a ponta em 11 passos contratuais e 4 evidências de aceite.
   - **Marco Vertical 2 (M2):** Ambiente de autoria Dockview, IPC transacional e Hot Reload Híbrido (Live Reload + Fast Restart).
   - **Marco Vertical 3 (M3):** Modelo de objetos, overrides, famílias simples e biblioteca padrão local.
   - **Marco Vertical 4 (M4):** Level Editor nativo 2D ortogonal (1 chunk lógico) e Auto-Tiling 16/47.
   - Escopo estritamente fora do MVP (3D, LDtk/Tiled, streaming multi-chunk, marketplace, recarga ALC em memória e stepping interativo).

## Documentação Normativa de Referência (`docs/`)

- [Objetivos com a engine.md](../../docs/Objetivos%20com%20a%20engine.md) — Intenção funcional e conceitos de produto originais.
- [Questões em Aberto - Decisões.md](../../docs/Quest%C3%B5es%20em%20Aberto%20-%20Decis%C3%B5es.md) — Decisões ADR-SL-001 a 022 e erratas de 14/10/2026.
- [00_Starlight_Architecture_Definitions_Index.docx](../../docs/00_Starlight_Architecture_Definitions_Index.docx) — Índice e leitura transversal dos documentos técnicos 01 a 09.
- [Starlight_Architecture_Review_Report.md](../../docs/Starlight_Architecture_Review_Report.md) — Relatório de revisão arquitetural e matriz de rastreabilidade.

## Agent Skills Reutilizáveis (`.github/skills/`)

Antes de implementar ou auditar tarefas específicas, carregue as skills dedicadas sob demanda:
- [starlight-boundary-audit](../skills/starlight-boundary-audit/SKILL.md) — Auditoria de fronteiras de assemblies, isolamento do MonoGame, `FrameTime` e AOT/consoles.
- [starlight-schema-serializer](../skills/starlight-schema-serializer/SKILL.md) — Criação de DTOs JSON, envelopes raiz e preservação de campos desconhecidos.
- [starlight-ipc-command](../skills/starlight-ipc-command/SKILL.md) — Comandos transacionais com Undo/Redo e comunicação JSON-RPC WebSocket.
- [starlight-addon-scaffold](../skills/starlight-addon-scaffold/SKILL.md) — Estruturação de plugins, behaviors, catálogo ACE e discovery declarativo.
- [starlight-event-ast-test](../skills/starlight-event-ast-test/SKILL.md) — Testes de seleção do compilador de eventos (SOL) e probes de `SourceId`.
