// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PixiEditorialRenderer, type EditorialAsset } from '../src/rendering/pixi/PixiEditorialRenderer';

// Exercise the production adapter lifecycle, replacing only GPU/DOM decoding boundaries.
const gpu = vi.hoisted(() => ({
  init: vi.fn<() => Promise<void>>(),
  applications: [] as { destroy: ReturnType<typeof vi.fn>; stage: { addChild: ReturnType<typeof vi.fn> } }[],
  textures: [] as { destroy: ReturnType<typeof vi.fn> }[],
  from: vi.fn(),
  unload: vi.fn(),
}));
vi.mock('pixi.js', () => ({
  Application: class {
    destroy = vi.fn();
    stage = { addChild: vi.fn() };
    init = gpu.init;
    constructor() { gpu.applications.push(this); }
  },
  Container: class {}, Graphics: class {}, Rectangle: class {}, Sprite: class {}, Text: class {},
  Texture: { from: gpu.from },
  Assets: { unload: gpu.unload },
}));

function deferred() {
  let resolve!: () => void, reject!: (error: Error) => void;
  const promise = new Promise<void>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
const decodes: ReturnType<typeof deferred>[] = [];
const asset: EditorialAsset = { ref: { guid: 'asset:atlas', revision: 'r1' }, url: './atlas.png', width: 128, height: 32 };
const renderers: PixiEditorialRenderer[] = [];
function renderer() {
  const diagnostic = vi.fn();
  const instance = new PixiEditorialRenderer([asset], diagnostic);
  renderers.push(instance);
  return { instance, diagnostic };
}
async function start(instance: PixiEditorialRenderer) {
  const canvas = document.createElement('canvas');
  const mounted = instance.mount(canvas);
  // app.init and OwnedAssets registration each yield a microtask before decode starts.
  await Promise.resolve(); await Promise.resolve();
  return { canvas, mounted };
}
beforeEach(() => {
  gpu.init.mockResolvedValue(); gpu.from.mockReset(); gpu.unload.mockReset();
  gpu.applications.length = 0; gpu.textures.length = 0; decodes.length = 0;
  gpu.from.mockImplementation(() => {
    const texture = { destroy: vi.fn() }; gpu.textures.push(texture); return texture;
  });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
    clearRect() {}, fillRect() {}, fillStyle: '',
    getImageData: () => ({ data: [0, 0, 0, 255] }),
  } as unknown as ReturnType<HTMLCanvasElement['getContext']>);
  vi.stubGlobal('Image', class {
    src = ''; naturalWidth = 128; naturalHeight = 32;
    decode() { const pending = deferred(); decodes.push(pending); return pending.promise; }
  });
});
afterEach(() => {
  for (const instance of renderers.splice(0)) instance.dispose();
  vi.restoreAllMocks(); vi.unstubAllGlobals();
});
describe('PixiEditorialRenderer ownership regression P2 (GPU mocked)', () => {
  it('reopening the same URL before an old decode settles preserves the new texture', async () => {
    const old = renderer(), fresh = renderer();
    const first = await start(old.instance);
    expect(decodes).toHaveLength(1);
    old.instance.dispose();
    const second = await start(fresh.instance);
    decodes[1].resolve(); await fresh.instance.whenAssetsLoaded();
    const currentTexture = gpu.textures[0];
    decodes[0].resolve(); await old.instance.whenAssetsLoaded();
    expect(gpu.from).toHaveBeenCalledTimes(2);
    expect(gpu.from.mock.calls.every(call => call[1] === true)).toBe(true);
    expect(gpu.from.mock.calls[0][0]).not.toBe(gpu.from.mock.calls[1][0]);
    expect(currentTexture.destroy).not.toHaveBeenCalled();
    expect(gpu.textures[1].destroy).toHaveBeenCalledExactlyOnceWith(true);
    expect(gpu.unload).not.toHaveBeenCalled();
    expect(old.diagnostic).not.toHaveBeenCalled();
    fresh.instance.dispose(); fresh.instance.dispose();
    expect(currentTexture.destroy).toHaveBeenCalledExactlyOnceWith(true);
  });
  it('a failed pending decode cannot emit diagnostics after dispose', async () => {
    const old = renderer(); const { canvas } = await start(old.instance);
    old.instance.dispose(); decodes[0].reject(new Error('late decode failure')); await old.instance.whenAssetsLoaded();
    canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true }));
    canvas.dispatchEvent(new Event('webglcontextrestored'));
    expect(old.diagnostic).not.toHaveBeenCalled();
    expect(gpu.from).not.toHaveBeenCalled(); expect(gpu.unload).not.toHaveBeenCalled();
  });
  it('reports decode failure while the renderer is active', async () => {
    const active = renderer(); await start(active.instance);
    decodes[0].reject(new Error('invalid image')); await active.instance.whenAssetsLoaded();
    expect(active.diagnostic).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ code: 'asset.load', status: 'MissingAssetPlaceholder' }));
  });
  it('disposal during application initialization cleans up without starting decode', async () => {
    const initialization = deferred(); gpu.init.mockReturnValueOnce(initialization.promise);
    const old = renderer(); const { mounted } = await start(old.instance);
    old.instance.dispose(); initialization.resolve(); await mounted;
    expect(gpu.applications[0].destroy).toHaveBeenCalledOnce();
    expect(gpu.applications[0].stage.addChild).not.toHaveBeenCalled();
    expect(decodes).toHaveLength(0); expect(old.diagnostic).not.toHaveBeenCalled();
    await old.instance.mount(document.createElement('canvas'));
    expect(decodes).toHaveLength(0);
  });
  it('keeps context events explicit and detaches their listeners on dispose', async () => {
    const active = renderer(); const { canvas } = await start(active.instance);
    decodes[0].resolve(); await active.instance.whenAssetsLoaded();
    const lost = new Event('webglcontextlost', { cancelable: true }); canvas.dispatchEvent(lost);
    expect(lost.defaultPrevented).toBe(true);
    expect(active.diagnostic).toHaveBeenLastCalledWith(expect.objectContaining({ code: 'context.lost' }));
    canvas.dispatchEvent(new Event('webglcontextrestored'));
    expect(active.diagnostic).toHaveBeenLastCalledWith(expect.objectContaining({ code: 'context.restored' }));
    active.instance.dispose(); active.diagnostic.mockClear();
    canvas.dispatchEvent(new Event('webglcontextrestored'));
    expect(active.diagnostic).not.toHaveBeenCalled();
  });
  it('mounts non-blocking with slow asset, renders placeholder, enables hitTest, and updates incrementally', async () => {
    const { instance } = renderer();
    const canvas = document.createElement('canvas');
    let mountResolved = false;
    const mountPromise = instance.mount(canvas).then(() => { mountResolved = true; });
    await mountPromise;
    expect(mountResolved).toBe(true);
    expect(decodes).toHaveLength(1);

    const snapshot = {
      schemaVersion: 1 as const, sceneId: 'test', revision: 1, label: 'Test',
      extent: { x: 0, y: 0, width: 768, height: 480 },
      layers: [{ id: 'l1', name: 'Layer 1', order: 0 }],
      representations: [{
        uid: 'instance:player' as const, slotId: 'sprite', name: 'Player', layerId: 'l1', z: 0,
        local: { x: 384, y: 240, rotation: 0, scaleX: 1, scaleY: 1 },
        world: { x: 384, y: 240, rotation: 0, scaleX: 1, scaleY: 1 },
        bounds: { x: -16, y: -16, width: 32, height: 32 },
        kind: 'sprite' as const, material: { kind: 'base' as const, blend: 'normal' as const, opacity: 1 },
        atlas: { x: 0, y: 0, width: 32, height: 32, asset: asset.ref },
      }],
      overlays: [],
    };
    const view = { camera: { x: 0, y: 0, zoom: 1 }, grid: false, hiddenLayers: [], lockedLayers: [], overlays: false, sampling: 'point' as const };
    const preview = { frame: 0, seconds: 0, seed: 1, maxParticles: 0, particles: false, shaders: false, screenEffects: false };

    // First render while decode is pending:
    const report1 = instance.render(snapshot, view, preview);
    expect(report1.diagnostics).toEqual(expect.arrayContaining([
      expect.objectContaining({ uid: 'instance:player', status: 'LoadingAssetPlaceholder' }),
    ]));

    // Hit-testing succeeds immediately on the placeholder:
    const hit = instance.hitTest({ x: 0, y: 0 }); // center of canvas hits center extent
    expect(hit?.uid).toBe('instance:player');

    // Resolve decode and re-render:
    decodes[0].resolve();
    await instance.whenAssetsLoaded();
    const report2 = instance.render(snapshot, view, preview);
    expect(report2.diagnostics).toEqual(expect.arrayContaining([
      expect.objectContaining({ uid: 'instance:player', status: 'Supported' }),
    ]));
  });
  it('discards stale decode after dispose without error or corruption', async () => {
    const { instance } = renderer();
    const canvas = document.createElement('canvas');
    await instance.mount(canvas);
    expect(decodes).toHaveLength(1);
    instance.dispose();
    expect(() => decodes[0].resolve()).not.toThrow();
    await instance.whenAssetsLoaded();
    expect(gpu.from).not.toHaveBeenCalled();
  });
  it('collects editorial renderer telemetry metrics', async () => {
    const { instance } = renderer();
    const canvas = document.createElement('canvas');
    await instance.mount(canvas);
    decodes[0].resolve();
    await instance.whenAssetsLoaded();
    const snapshot = {
      schemaVersion: 1 as const, sceneId: 'test', revision: 1, label: 'Test',
      extent: { x: 0, y: 0, width: 768, height: 480 },
      layers: [{ id: 'l1', name: 'Layer 1', order: 0 }],
      representations: [], overlays: [],
    };
    const view = { camera: { x: 0, y: 0, zoom: 1 }, grid: false, hiddenLayers: [], lockedLayers: [], overlays: false, sampling: 'point' as const };
    const preview = { frame: 0, seconds: 0, seed: 1, maxParticles: 0, particles: false, shaders: false, screenEffects: false };
    instance.render(snapshot, view, preview);
    instance.hitTest({ x: 10, y: 10 });
    const telemetry = instance.getTelemetry();
    expect(telemetry.mountDurationMs).toBeGreaterThanOrEqual(0);
    expect(telemetry.firstInteractiveFrameMs).toBeGreaterThanOrEqual(0);
    expect(telemetry.lastHitTestDurationMs).toBeGreaterThanOrEqual(0);
    expect(telemetry.assetDecodeDurations.has('asset:atlas@r1')).toBe(true);
    expect(telemetry.contextLostCount).toBe(0);
    expect(telemetry.contextRestoredCount).toBe(0);
  });
});
