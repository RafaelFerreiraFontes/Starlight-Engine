---
description: "Plano de execução, escopo normativo do MVP (mvp.md), marcos verticais verificáveis (Milestones), critérios de aceitação ponta a ponta e lista de funcionalidades bloqueadas/adiadas (Post-MVP) da Starlight Engine."
applyTo: "**"
---

# Starlight Engine — Plano Executivo de Marcos e Escopo do MVP (`mvp.md`)

Este documento consolida o **Recorte de Implementação do Produto Mínimo Viável (MVP)** da Starlight Engine, com base nas seções `"Recorte de Implementação (mvp.md)"` dos [ADRs 001 a 022](../../docs/Quest%C3%B5es%20em%20Aberto%20-%20Decis%C3%B5es.md) e no marco de integração vertical documentado em [00_Starlight_Architecture_Definitions_Index.docx](../../docs/00_Starlight_Architecture_Definitions_Index.docx) e [03_Starlight_Project_Resource_and_Build_Pipeline.docx](../../docs/03_Starlight_Project_Resource_and_Build_Pipeline.docx).

---

## 1. Diretriz de Execução Incremental e Integridade de Código

### Princípios de Implementação
1. **Construção Fatiada e Real:** É expressamente proibido tentar implementar todos os subsistemas da engine em uma única iteração massiva. O desenvolvimento deve avançar em pequenos incrementos verticais comprovados.
2. **Proibição de Código Falso (*No Fake Code*):**
   - É **proibido** utilizar `throw new NotImplementedException()`, métodos vazios ou simulações cosméticas para fingir a conclusão de um marco.
   - Qualquer contrato entregue deve conter lógica funcional real e testável.
3. **Validação Obrigatória em Três Níveis:**
   - **Build Real:** Compilação com zero erros via `dotnet build` e `pnpm build`.
   - **Baterias de Testes Automatizados:** Testes unitários e de integração em `xUnit` (.NET), testes de componentes em `Vitest` (React) e testes ponta a ponta em `Playwright`.
   - **Revisão Independente de QA:** Todo incremento deve ser auditado pelo agente `Starlight QA Engineer` antes de ser declarado aceito.

---

## 2. Marco Vertical 1 (M1) — Primeiro Projeto Jogável Ponta a Ponta

O **Marco 1** é o primeiro recorte vertical funcional da Starlight Engine. Ele prova a viabilidade da cadeia completa de ferramentas — da criação do projeto em disco até a execução de um jogo independente do editor ([00_Starlight_Architecture_Definitions_Index.docx](../../docs/00_Starlight_Architecture_Definitions_Index.docx), §"Milestone").

### Os 11 Passos Obrigatórios do Marco 1
1. **Criar e Salvar Projeto:** O Host .NET cria e salva em disco o manifesto do projeto (`MyGame.starlight`) utilizando serialização determinística JSON com envelope raiz padrão (`schema`, `schemaVersion`, `id`, `name`).
2. **Importação de Textura e Sidecar `.meta`:** Importar uma imagem `.png` para a pasta de assets e emitir seu arquivo sidecar canônico adjacente `.meta` contendo o `AssetGuid` (`asset:f54d0e9a-...`), ID do importador, opções de amostragem e hash de conteúdo.
3. **Indexação no `AssetDatabase`:** O `AssetDatabase` do Host .NET indexa o arquivo `.meta` como fonte da verdade, permitindo resolução estável por GUID.
4. **Criação de `Object-Ref`:** Criar uma definição de objeto (`Objects/Player.object`) contendo um componente visual `Sprite` que referencia o `AssetGuid` da textura importada.
5. **Posicionamento de Instância em Layout:** Criar uma cena (`Layouts/Main.layout`), adicionar uma camada e posicionar uma `Instance` com `Instance UID` estável e transformação 2D (`x`, `y`, `z=0`, `angle=0`).
6. **Autoria de Event Sheet Simples:** Criar uma folha de eventos (`Events/PlayerMovement.event`) contendo uma AST tipada que vincula uma entrada de teclado a uma ação (ex.: ação `Move` ou `Jump`).
7. **Validação e Emissão de C#:** O `Starlight.Events.Compiler` valida a AST contra o `CapabilityRegistry`, monta a representação intermediária (`SelectionFrame`) e emite o código C# gerado em `.starlight/generated/` com probes de `SourceId`.
8. **Compilação do Development Player:** O Host orquestra o Roslyn para compilar o assembly de jogo incrementalmente, combinando o runtime base e o código gerado.
9. **Execução do Development Player Isolado:** O `Development Player` é iniciado em um processo externo separado do processo do editor.
10. **Telemetria e Logs Estruturados:** O `Development Player` estabelece conexão com o Host via `RuntimeDebugProtocol`, transmitindo logs, métricas e mapeamento de exceções vinculadas ao `SourceId` para exibição no Console do Editor.
11. **Exportação de Build Release Desktop:** O exportador empacota um executável `Release` Desktop (`DesktopGL` ou `WindowsDX`) totalmente independente do editor, rodando de forma autônoma fora da árvore do repositório.

### Evidências de Aceite Obrigatórias do M1
Para que o Marco 1 seja considerado concluído, devem ser apresentadas as seguintes evidências:
- [x] **Persistência Íntegra:** Fechar e reabrir os arquivos `.starlight`, `.layout`, `.object` e `.event` sem qualquer perda de dados ou campos desconhecidos.
- [x] **Estabilidade de GUID:** Renomear ou mover o arquivo `.png` e seu `.meta` e comprovar que o `AssetGuid` permanece intacto e a referência no `Object-Ref` não se rompe.
- [x] **Diagnóstico por SourceId:** Submeter uma Event Sheet com erro proposital e comprovar que o compilador/runtime emite diagnóstico mapeado ao `SourceId` exato do nó defeituoso.
- [x] **Independência do Release:** Executar o binário exportado em uma máquina ou pasta limpa sem as dependências do Tauri, React ou Host .NET.

---

## 3. Marco Vertical 2 (M2) — Ambiente de Autoria, IPC Transacional e Hot Reload Híbrido

O **Marco 2** estabelece a experiência operacional da IDE da engine ([ADR-SL-001, ADR-SL-002, ADR-SL-003, ADR-SL-013](../../docs/Quest%C3%B5es%20em%20Aberto%20-%20Decis%C3%B5es.md)):

### Entregas do Marco 2
1. **Workspace com `dockview-react`:**
   - Divisão de painéis flexível: *Scene/Layout View*, *Event Sheet View*, *Project Explorer*, *Inspector* (schema-driven) e *Console/Logs*.
   - Serialização do estado de painéis exclusivamente nas preferências locais do usuário (`.starlight/editor/dockview.json`).
2. **IPC Transacional Completo:**
   - Implementação do transporte Typed JSON-RPC sobre WebSocket local autenticado por token de sessão.
   - Suporte completo a `IProjectCommand` com histórico de Undo/Redo no Host .NET.
   - Arrastos no canvas gerenciados no Zustand até a conclusão da ação (commit do comando).
3. **Hot Reload Híbrido:**
   - **Live Reload (Tempo Real):** Atualização imediata de texturas, sons e propriedades simples de instâncias no Player via `Editor Protocol`, sem reiniciar o processo.
   - **Fast Restart (Reinício Rápido):** Alterações em scripts C#, folhas de eventos ou manifestos de plugins acionam compilação incremental rápida e reinício automático do processo do `Development Player`.

---

## 4. Marco Vertical 3 (M3) — Modelo de Objetos, Overrides, Famílias Simples e Standard Library

O **Marco 3** entrega os pilares de gameplay da engine ([ADR-SL-008, ADR-SL-011, ADR-SL-021](../../docs/Quest%C3%B5es%20em%20Aberto%20-%20Decis%C3%B5es.md)):

### Entregas do Marco 3
1. **Composição em Runtime:**
   - Entidades base (`Entity`), transformações 2D (`Transform2D`), componentes visuais (`Sprite`) e coleção de `IBehavior`.
   - Execução estrita no loop de 9 fases recebendo `FrameTime`.
2. **Resolução de Propriedades e Famílias Simples:**
   - Resolução hierárquica por presença: `Instance Override` $\rightarrow$ `Object-Ref` $\rightarrow$ `Family` $\rightarrow$ `Default`.
   - Agrupamento simples por `Family` para compartilhamento de eventos e variáveis (sem herança multinível aninhada no primeiro corte).
3. **First-Party Standard Library:**
   - Pacotes padrão embutidos: Sprite2D, Teclado/Mouse/Gamepad Input, Áudio básico e Movimentação Platformer/Top-Down.
   - Descoberta declarativa exclusivamente por manifestos JSON (`addon.manifest.json`).

---

## 5. Marco Vertical 4 (M4) — Level Editor Nativo 2D e Auto-Tiling 16/47

O **Marco 4** entrega as ferramentas de autoria de fases baseadas em grid ([ADR-SL-019, ADR-SL-022](../../docs/Quest%C3%B5es%20em%20Aberto%20-%20Decis%C3%B5es.md)):

### Entregas do Marco 4
1. **Editor de `.level` e `.tileset`:**
   - Suporte a mapas ortogonais 2D de tamanho fixo estruturados em **1 chunk lógico** endereçável.
   - Camadas semânticas (`IntGrid`) separadas de camadas de exibição gráfica.
   - Posicionamento de entidades de grid apontando para `Object-Refs`.
2. **Auto-Tiling Genérico (Presets 16 e 47):**
   - Compilação de regras de vizinhança sobre o *Tile Rule Engine*.
   - Suporte a pintura automática de terrenos com preservação de flags de override manual por célula.

---

## 6. Funcionalidades Estritamente Bloqueadas no MVP (Post-MVP)

As seguintes funcionalidades estão **formalmente fora do escopo do MVP** e não devem ser implementadas nesta etapa:

| Funcionalidade / Subsistema | ADR de Referência | Justificativa e Destino |
|---|---|---|
| **Recursos e Ferramentas 3D** | `ADR-SL-022` | O MVP é 100% 2D. Modelos centrais apenas mantêm coordenadas e contratos sem restrições impeditivas para o futuro. |
| **Importadores de LDtk e Tiled** | `ADR-SL-020` | Deferidos para pós-MVP. O foco do MVP é o formato nativo `.level` e `.tileset`. |
| **Streaming Multi-Chunk / Mapas Infinitos** | `ADR-SL-019` | O schema suporta chunks, mas o MVP implementa apenas mapas de 1 chunk ortogonal. Isométrico, hexagonal e streaming são pós-MVP. |
| **Marketplace Online e Assinaturas de Addons** | `ADR-SL-021` | O MVP suporta apenas addons locais de desenvolvimento e biblioteca first-party embutida. |
| **Recarga Dinâmica em Memória via ALC** | `ADR-SL-013` | Recarga dinâmica de DLLs em gameplay é descartada no MVP em favor da estabilidade do Fast Restart. |
| **Stepping Interativo no Depurador Visual** | `ADR-SL-014` | Breakpoints interativos linha a linha são pós-MVP. O MVP entrega logs estruturados e mapeamento de exceções por `SourceId`. |
| **Player Embutido no WebView do Tauri** | `ADR-SL-012` | O Player executa em processo e janela gráfica externos nativos do MonoGame. |

---

## 7. Referências Cruzadas de Skills dos Agentes

Para implementar os marcos definidos neste plano, utilize as seguintes Agent Skills:
- Para o Marco 1 (Pipeline de compilação, Event AST e C# gerado): [starlight-event-ast-test](../skills/starlight-event-ast-test/SKILL.md)
- Para o Marco 1 e 2 (Persistência determinística e envelopes): [starlight-schema-serializer](../skills/starlight-schema-serializer/SKILL.md)
- Para o Marco 2 (Comandos transacionais e IPC React ↔ .NET): [starlight-ipc-command](../skills/starlight-ipc-command/SKILL.md)
- Para o Marco 3 (Addons, Behaviors e ciclo de 9 fases): [starlight-addon-scaffold](../skills/starlight-addon-scaffold/SKILL.md)
- Para todos os marcos (Auditoria de pureza e Build Boundary): [starlight-boundary-audit](../skills/starlight-boundary-audit/SKILL.md)
