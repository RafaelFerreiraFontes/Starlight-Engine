---
name: starlight-ipc-command
description: Padroniza o fluxo de comandos transacionais (IProjectCommand) e comunicação JSON-RPC via WebSocket entre o frontend React (Tauri 2) e o Starlight.Editor.Host (.NET) conforme ADR-SL-001 a 003. Use ao criar comandos no editor, ações de UI com Undo/Redo ou handlers IPC.
---

# Starlight IPC Command

Esta skill padroniza a criação de comandos transacionais e o fluxo de mutação de dados entre o frontend React e o Host .NET, em estrita conformidade com os **ADR-SL-001**, **ADR-SL-002** e **ADR-SL-003**.

## Quando Usar Esta Skill

Carregue esta skill quando:
- Implementar novas interações de usuário no frontend que alterem o estado persistente do projeto (ex.: mover instâncias, renomear objetos, alterar propriedades no Inspector, editar nós de eventos).
- Criar novos comandos em C# (`IProjectCommand<T>`) no `Starlight.Editor.Host` ou novos DTOs em `Starlight.Editor.Protocol`.
- Adicionar ou debugar operações que devam participar do histórico de **Desfazer / Refazer (Undo/Redo)**.
- Implementar clientes de WebSocket / Typed JSON-RPC para o protocolo do editor.

## Princípios Arquiteturais Obrigatórios

### 1. Separação Estrita de Responsabilidades (`ADR-SL-002` / `ADR-SL-003`)
- **UI React (WebView):** Mantém apenas estado transitório de interface (layouts de painéis, seleção visual, arrastos/drags em andamento) via **Zustand**. **Nunca acessa ou grava arquivos em disco diretamente.**
- **Casca Rust (Tauri 2):** Inicializa o processo filho .NET (`Starlight.Editor.Host`) via `stdin`/`stdout`, fornece diálogos nativos de SO e gerencia janelas. **O código Rust nunca intercepta, desserializa ou valida payloads do modelo de projeto.**
- **Host .NET (`Starlight.Editor.Host`):** É o único detentor do `ProjectModel`, validador de integridade e autoridade de persistência atômica em disco.

### 2. Ciclo de Vida do Comando Transacional (`ADR-SL-003`)
Toda mutação durável deve seguir estritamente o ciclo de 6 etapas:

1. **Ação na UI:** O usuário conclui uma interação (ex.: solta o mouse após arrastar uma entidade no canvas). Interações contínuas (*drags*) são locais/transitórias até o commit.
2. **Despacho JSON-RPC:** A UI envia uma chamada `project/applyCommand` via WebSocket local (`127.0.0.1:<porta>`) contendo:
   - `sessionToken`: Token de autenticação seguro obtido no handshake inicial.
   - `commandId`: GUID gerado pelo cliente para garantia de **idempotência**.
   - `commandType`: Identificador da ação (ex.: `"layout/setInstanceTransform"`).
   - `expectedRevision`: Número de revisão do projeto conhecido pelo cliente no momento da ação.
   - `payload`: DTO com os parâmetros da modificação.
3. **Validação no Host (`Validate`):** O Host verifica se a revisão informada coincide com a revisão atual do projeto e valida as regras de negócio contra o modelo em memória.
4. **Aplicação em Staging e Inversão (`Apply` / `Invert`):** O Host aplica a alteração no staging em memória e captura o estado anterior, gerando a operação inversa.
5. **Gravação Atômica em Disco:** O Host persiste atomicamente os arquivos afetados (via gravação em arquivo temporário + *atomic replace*).
6. **Histórico e Notificação:** O Host registra a unidade de Undo/Redo, incrementa a revisão do projeto e emite uma mensagem `project/changeSetApplied` notificando o frontend para atualizar o Zustand.

### 3. Tratamento de Conflitos e Desconexão
- Se a revisão enviada pela UI for anterior à revisão atual do Host, o comando é rejeitado com status `Conflict`. A UI deve recarregar a visualização com base na revisão vigente.
- Em caso de falha de conexão no WebSocket, a UI congela operações de escrita até que a reconexão e a reautenticação com o Host sejam restabelecidas.

## Exemplo Completo Passo a Passo

Consulte a implementação completa de ponta a ponta (DTO em C#, comando com Undo/Redo no Host e hook React com Zustand):
[transactional-command-flow.md](./examples/transactional-command-flow.md)
