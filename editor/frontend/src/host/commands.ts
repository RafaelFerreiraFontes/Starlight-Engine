import type { Diagnostic, EditorialSceneSnapshot, Hit, Representation, Transform } from '../rendering/contracts';
/** Candidate request shape for future generated C# protocol. No fake connection. */
export interface TransformCommand {
  readonly method: 'project/applyCommand';
  readonly params: {
    readonly commandId: string;
    readonly commandType: 'layout/setInstanceTransform';
    readonly expectedRevision: number;
    readonly payload: { readonly layoutId: string; readonly target: Hit; readonly local: Transform; readonly world: Transform };
  };
}
export type HostCommandResult =
  | { readonly status: 'applied'; readonly revision: number }
  | { readonly status: 'rejected'; readonly reason: string; readonly diagnostic?: Diagnostic }
  | { readonly status: 'disconnected'; readonly reason: string; readonly delivery?: 'not-sent' }
  | { readonly status: 'transport-error'; readonly commandId: string; readonly error: string };

export interface HostCommandPort { applyCommand(command: TransformCommand): Promise<HostCommandResult> }
export class DisconnectedHostPort implements HostCommandPort {
  async applyCommand(_command: TransformCommand): Promise<HostCommandResult> {
    // No transport, no Host reply, no persistence. Explicit local connection state.
    return { status: 'disconnected', reason: 'disconnected', delivery: 'not-sent' };
  }
}
/** No inferred hierarchy math: composition is a separate pending decision (ADR-SL-024). */
export function translationGestureDiagnostic(item: Representation): Diagnostic | undefined {
  if (item.parent || (['x','y','rotation','scaleX','scaleY'] as const).some(k=>item.local[k]!==item.world[k])) {
    return {uid:item.uid,slotId:item.slotId,status:'UnsupportedFallback',code:'gesture.root-only',message:'Gesto limitado a instâncias raiz com transforms local/world idênticos. Transform de parent não resolvido; movimento bloqueado.'};
  }
}
export function createTransformCommand(scene: EditorialSceneSnapshot, target: Hit, world: Transform, commandId: string): TransformCommand {
  const item = scene.representations.find(r => r.uid === target.uid && r.slotId === target.slotId);
  if (!item) throw new Error('Unknown instance/slot');
  const diagnostic=translationGestureDiagnostic(item);
  if(diagnostic)throw new Error(diagnostic.message);
  if(!Number.isFinite(world.x)||!Number.isFinite(world.y)||(['rotation','scaleX','scaleY'] as const).some(k=>world[k]!==item.world[k]))throw new Error('Gesto permite apenas translação finita de instância raiz.');
  const local = { ...item.local, x: world.x, y: world.y };
  return { method: 'project/applyCommand', params: { commandId, commandType: 'layout/setInstanceTransform', expectedRevision: scene.revision, payload: { layoutId: scene.sceneId, target: {uid:target.uid,slotId:target.slotId}, local, world } } };
}
