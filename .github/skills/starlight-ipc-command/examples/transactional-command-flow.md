# Exemplo Prático de Fluxo Transacional Ponta a Ponta (UI ↔ Host .NET)

Este exemplo demonstra a implementação de um comando transacional completo (`SetInstanceTransformCommand`) seguindo rigorosamente os **ADR-SL-001**, **ADR-SL-002** e **ADR-SL-003**.

---

## 1. Contrato de DTO em C# (`Starlight.Editor.Protocol`)

Arquivo: `src/Starlight.Editor.Protocol/Commands/SetInstanceTransformDto.cs`

```csharp
using System.Text.Json.Serialization;

namespace Starlight.Editor.Protocol.Commands;

/// <summary>
/// DTO enviado pelo frontend via JSON-RPC 'project/applyCommand'.
/// </summary>
public sealed record SetInstanceTransformDto
{
    [JsonPropertyName("layoutId")]
    public required string LayoutId { get; init; }

    [JsonPropertyName("instanceUid")]
    public required string InstanceUid { get; init; }

    [JsonPropertyName("newPosition")]
    public required Vector2Dto NewPosition { get; init; }

    [JsonPropertyName("newAngle")]
    public double NewAngle { get; init; }
}

public sealed record Vector2Dto(
    [property: JsonPropertyName("x")] double X,
    [property: JsonPropertyName("y")] double Y
);
```

---

## 2. Contrato TypeScript Gerado para o Frontend

Arquivo: `editor/frontend/src/types/protocol/commands.ts`

```typescript
export interface Vector2Dto {
  x: number;
  y: number;
}

export interface SetInstanceTransformDto {
  layoutId: string;
  instanceUid: string;
  newPosition: Vector2Dto;
  newAngle: number;
}

export interface ApplyCommandRequest<T = unknown> {
  commandId: string;        // UUID gerado pelo cliente para idempotência
  sessionToken: string;     // Token de autenticação da sessão do bootstrap
  commandType: string;      // ex: "layout/setInstanceTransform"
  expectedRevision: number; // Revisão conhecida pelo frontend
  payload: T;
}

export interface ApplyCommandResponse {
  success: boolean;
  newRevision: number;
  undoId: string;
  error?: string;
}
```

---

## 3. Implementação do Comando no Host .NET (`Starlight.Editor.Host`)

Arquivo: `src/Starlight.Editor.Host/Commands/SetInstanceTransformCommand.cs`

```csharp
using System;
using System.Threading;
using System.Threading.Tasks;
using Starlight.Editor.Host.Transactions;
using Starlight.Editor.Protocol.Commands;
using Starlight.ProjectModel;
using Starlight.ProjectModel.Layouts;

namespace Starlight.Editor.Host.Commands;

public sealed class SetInstanceTransformCommand : IProjectCommand<SetInstanceTransformDto>
{
    private Vector2Dto? _previousPosition;
    private double _previousAngle;
    private LayoutDocument? _targetLayout;
    private LayoutInstance? _targetInstance;

    public string CommandType => "layout/setInstanceTransform";

    /// <summary>
    /// Fase 1: Validação síncrona contra a revisão atual do modelo.
    /// Garante que o recurso e a instância existem antes de alterar staging.
    /// </summary>
    public CommandValidationResult Validate(
        IProjectContext context, 
        SetInstanceTransformDto payload, 
        long expectedRevision)
    {
        if (context.CurrentRevision != expectedRevision)
        {
            return CommandValidationResult.Conflict(
                $"Revisão divergente: esperada {expectedRevision}, atual {context.CurrentRevision}");
        }

        _targetLayout = context.Project.GetLayout(payload.LayoutId);
        if (_targetLayout == null)
        {
            return CommandValidationResult.Failed($"Layout '{payload.LayoutId}' não encontrado.");
        }

        _targetInstance = _targetLayout.FindInstance(payload.InstanceUid);
        if (_targetInstance == null)
        {
            return CommandValidationResult.Failed(
                $"Instância '{payload.InstanceUid}' não encontrada no layout.");
        }

        return CommandValidationResult.Success();
    }

    /// <summary>
    /// Fase 2: Aplica no modelo em staging e captura dados para a operação inversa.
    /// </summary>
    public void Apply(IProjectContext context, SetInstanceTransformDto payload)
    {
        // Salva estado anterior para Undo
        _previousPosition = new Vector2Dto(_targetInstance!.Transform.X, _targetInstance.Transform.Y);
        _previousAngle = _targetInstance.Transform.Angle;

        // Aplica nova transformação
        _targetInstance.Transform.X = payload.NewPosition.X;
        _targetInstance.Transform.Y = payload.NewPosition.Y;
        _targetInstance.Transform.Angle = payload.NewAngle;

        // Marca documento como dirty para persistência atômica
        context.StageChange(_targetLayout!);
    }

    /// <summary>
    /// Fase 3: Gera o comando inverso para ser registrado na pilha de Undo.
    /// </summary>
    public IProjectCommand CreateInverseCommand()
    {
        return new SetInstanceTransformCommand(); // configurado com _previousPosition e _previousAngle
    }
}
```

---

## 4. Despacho no Frontend React (Zustand & JSON-RPC Client)

Arquivo: `editor/frontend/src/features/layout/useLayoutStore.ts`

```typescript
import { create } from 'zustand';
import { rpcClient } from '@/services/rpcClient';
import type { SetInstanceTransformDto } from '@/types/protocol/commands';

interface LayoutState {
  // Estado transitório durante o arrasto (Gizmo Drag)
  transientTransform: { x: number; y: number; angle: number } | null;
  currentRevision: number;

  // Atualização transitória (apenas visual, sem IPC)
  setDragTransform: (transform: { x: number; y: number; angle: number }) => void;

  // Commit da transação ao soltar o mouse (despacha comando com Undo/Redo)
  commitTransform: (layoutId: string, instanceUid: string) => Promise<void>;
}

export const useLayoutStore = create<LayoutState>((set, get) => ({
  transientTransform: null,
  currentRevision: 1,

  setDragTransform: (transform) => set({ transientTransform: transform }),

  commitTransform: async (layoutId, instanceUid) => {
    const { transientTransform, currentRevision } = get();
    if (!transientTransform) return;

    const payload: SetInstanceTransformDto = {
      layoutId,
      instanceUid,
      newPosition: { x: transientTransform.x, y: transientTransform.y },
      newAngle: transientTransform.angle,
    };

    // Despacha request RPC para o Host .NET
    const response = await rpcClient.request('project/applyCommand', {
      commandId: crypto.randomUUID(),
      sessionToken: rpcClient.getSessionToken(),
      commandType: 'layout/setInstanceTransform',
      expectedRevision: currentRevision,
      payload,
    });

    if (response.success) {
      set({ 
        transientTransform: null, 
        currentRevision: response.newRevision 
      });
    } else {
      console.error('Falha ao aplicar comando:', response.error);
      set({ transientTransform: null }); // Reverte estado visual transitório
    }
  },
}));
```
