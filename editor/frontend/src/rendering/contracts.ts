/** Candidate editorial DTOs, not generated Host ABI. ADR-SL-023 remains Proposed. */
export type InstanceUid = `instance:${string}`;
export type AssetGuid = `asset:${string}`;
export type Support = 'Supported' | 'Approximate' | 'UnsupportedFallback' | 'MissingAssetPlaceholder' | 'LoadingAssetPlaceholder';
export interface Point { readonly x: number; readonly y: number }
export interface Transform extends Point { readonly rotation: number; readonly scaleX: number; readonly scaleY: number }
export interface Rect extends Point { readonly width: number; readonly height: number }
export interface AssetRef { readonly guid: AssetGuid; readonly revision: string }
export interface AtlasRegion extends Rect { readonly asset: AssetRef }
export interface Layer { readonly id: string; readonly name: string; readonly order: number }
export interface Material { readonly kind: 'base' | 'pulse' | 'mgfx' | 'csharp'; readonly blend: 'normal' | 'add'; readonly opacity: number }
export interface Representation {
  readonly uid: InstanceUid;
  readonly slotId: string;
  readonly name: string;
  readonly layerId: string;
  readonly z: number;
  readonly local: Transform;
  readonly world: Transform;
  /** Presence means composition; root-only prototype gestures reject this explicitly. */
  readonly parent?: Hit;
  readonly bounds: Rect;
  readonly kind: 'sprite' | 'tileChunk' | 'particles' | 'nonvisual' | 'text';
  readonly material: Material;
  readonly atlas?: AtlasRegion;
  readonly animation?: { readonly frames: readonly AtlasRegion[]; readonly fps: number };
  readonly chunk?: { readonly x: number; readonly y: number; readonly columns: number; readonly rows: number; readonly cellSize: number; readonly cells: readonly number[]; readonly regions: readonly AtlasRegion[] };
  readonly particles?: { readonly count: number; readonly radius: number };
  readonly text?: string;
}
export interface Overlay { readonly kind: 'bounds' | 'collider' | 'camera'; readonly target: { readonly uid: InstanceUid; readonly slotId: string }; readonly rect: Rect }
export interface EditorialSceneSnapshot {
  readonly schemaVersion: 1;
  readonly sceneId: string;
  readonly revision: number;
  readonly label: string;
  readonly extent: Rect;
  readonly layers: readonly Layer[];
  readonly representations: readonly Representation[];
  readonly overlays: readonly Overlay[];
}
export interface Diagnostic { readonly uid?: InstanceUid; readonly slotId?: string; readonly status: Support; readonly code: string; readonly message: string }
export interface Hit { readonly uid: InstanceUid; readonly slotId: string }
export interface PreviewState { readonly frame: number; readonly seconds: number; readonly seed: number; readonly maxParticles: number; readonly particles: boolean; readonly shaders: boolean; readonly screenEffects: boolean }
export interface ViewState {
  readonly camera: { readonly x: number; readonly y: number; readonly zoom: number };
  readonly grid: boolean;
  readonly hiddenLayers: readonly string[];
  readonly lockedLayers: readonly string[];
  readonly selection?: Hit;
  readonly transient?: { readonly target: Hit; readonly world: Transform };
  readonly overlays: boolean;
  readonly sampling: 'point' | 'linear';
}
export interface RenderReport { readonly diagnostics: readonly Diagnostic[]; readonly context: 'ready' | 'lost' | 'restored' | 'failed' }
export interface EditorialRendererTelemetry {
  readonly mountDurationMs: number;
  readonly firstInteractiveFrameMs: number;
  readonly assetDecodeDurations: ReadonlyMap<string, number>;
  readonly contextLostCount: number;
  readonly contextRestoredCount: number;
  readonly lastHitTestDurationMs: number;
  readonly activeTexturesCount: number;
  readonly activeRegionsCount: number;
}
export interface IEditorialSceneRenderer {
  mount(canvas: HTMLCanvasElement): Promise<void>;
  resize(width: number, height: number): void;
  render(snapshot: EditorialSceneSnapshot, view: ViewState, preview: PreviewState): RenderReport;
  hitTest(screen: Point): Hit | undefined;
  screenToWorld(screen: Point): Point;
  dispose(): void;
  getTelemetry?(): EditorialRendererTelemetry;
}
export type RendererFactory = (onDiagnostic: (diagnostic: Diagnostic) => void) => IEditorialSceneRenderer;
