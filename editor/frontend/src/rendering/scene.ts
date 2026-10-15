import type { AtlasRegion, Diagnostic, EditorialSceneSnapshot, Hit, Point, Representation, ViewState } from './contracts';
export const sameHit = (a: Hit | undefined, b: Hit | undefined) => !!a && !!b && a.uid === b.uid && a.slotId === b.slotId;
const compare = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;
export function representationAssetsAvailable(item:Representation,hasRegion:(region:AtlasRegion)=>boolean):boolean {
  if(item.kind==='tileChunk')return !!item.chunk&&item.chunk.regions.every(hasRegion);
  if(item.kind!=='sprite')return true;
  return item.animation?item.animation.frames.length>0&&item.animation.frames.every(hasRegion):!!item.atlas&&hasRegion(item.atlas);
}
export function ordered(scene: EditorialSceneSnapshot): Representation[] {
  const layers = new Map(scene.layers.map(l => [l.id, l.order]));
  return [...scene.representations].sort((a, b) => (layers.get(a.layerId)! - layers.get(b.layerId)!) || a.z - b.z || compare(a.uid, b.uid) || compare(a.slotId, b.slotId));
}
export function hitTestScene(scene: EditorialSceneSnapshot, point: Point, view: Pick<ViewState, 'hiddenLayers' | 'lockedLayers' | 'transient'>): Hit | undefined {
  for (const item of ordered(scene).reverse()) {
    if (view.hiddenLayers.includes(item.layerId) || view.lockedLayers.includes(item.layerId)) continue;
    const t = sameHit(item, view.transient?.target) ? view.transient!.world : item.world;
    if (!t.scaleX || !t.scaleY) continue;
    const dx = point.x - t.x, dy = point.y - t.y;
    const x = (dx * Math.cos(t.rotation) + dy * Math.sin(t.rotation)) / t.scaleX;
    const y = (-dx * Math.sin(t.rotation) + dy * Math.cos(t.rotation)) / t.scaleY;
    const b = item.bounds;
    if (x >= b.x && x <= b.x + b.width && y >= b.y && y <= b.y + b.height) return { uid: item.uid, slotId: item.slotId };
  }
}
export function diagnose(item: Representation, assetPresent: boolean, assetLoading?: boolean): Diagnostic {
  const base = { uid: item.uid, slotId: item.slotId };
  if (!assetPresent && (item.kind === 'sprite' || item.kind === 'tileChunk')) {
    if (assetLoading) return { ...base, status: 'LoadingAssetPlaceholder', code: 'asset.loading', message: 'Asset em carregamento assíncrono. Bounding box preservada e selecionável.' };
    return { ...base, status: 'MissingAssetPlaceholder', code: 'asset.missing', message: 'Asset indisponível. Bounding box preservada e selecionável.' };
  }
  if (item.material.kind === 'mgfx' || item.material.kind === 'csharp') return { ...base, status: 'UnsupportedFallback', code: `material.${item.material.kind}`, message: `${item.material.kind === 'mgfx' ? 'MGFX' : 'Renderer C#'} sem equivalente editorial. Material base mantido.` };
  if (item.kind === 'particles' || item.material.kind === 'pulse' || item.material.blend === 'add') return { ...base, status: 'Approximate', code: 'preview.approximate', message: 'Preview visual limitado; fidelidade MonoGame não verificada.' };
  return { ...base, status: 'Supported', code: 'editorial.supported', message: item.kind === 'nonvisual' ? 'Componente não visual representado por gizmo.' : 'Representação disponível no subconjunto editorial.' };
}
export function validateSnapshot(scene: EditorialSceneSnapshot) {
  if (scene.schemaVersion !== 1 || !Number.isSafeInteger(scene.revision) || scene.revision < 0) throw new Error('Snapshot version/revision inválida');
  if (scene.representations.length > 512 || scene.layers.length > 64 || scene.overlays.length > 512) throw new Error('Scene budget exceeded');
  const finite = (...numbers: number[]) => numbers.every(Number.isFinite);
  if (!finite(scene.extent.x, scene.extent.y, scene.extent.width, scene.extent.height) || scene.extent.width <= 0 || scene.extent.height <= 0 || Math.max(scene.extent.width, scene.extent.height) > 16384) throw new Error('Invalid extent');
  const layers = new Set(scene.layers.map(l => l.id));
  if (layers.size !== scene.layers.length || scene.layers.some(l => !Number.isFinite(l.order))) throw new Error('Invalid layers');
  const keys = new Set<string>();
  const checkRegion = (r: NonNullable<Representation['atlas']>) => {
    if (!r.asset.guid.startsWith('asset:') || !r.asset.revision || !finite(r.x, r.y, r.width, r.height) || r.x < 0 || r.y < 0 || r.width <= 0 || r.height <= 0 || r.x + r.width > 4096 || r.y + r.height > 4096) throw new Error('Invalid atlas region');
  };
  for (const item of scene.representations) {
    const key = JSON.stringify([item.uid, item.slotId]);
    if (keys.has(key) || !item.uid.startsWith('instance:') || !item.slotId || !layers.has(item.layerId)) throw new Error('Invalid identity/layer');
    keys.add(key);
    for (const t of [item.local, item.world]) if (!finite(t.x, t.y, t.rotation, t.scaleX, t.scaleY)) throw new Error('Invalid transform');
    if (!finite(item.z, item.bounds.x, item.bounds.y, item.bounds.width, item.bounds.height, item.material.opacity) || item.bounds.width < 0 || item.bounds.height < 0 || item.material.opacity < 0 || item.material.opacity > 1) throw new Error('Invalid geometry/material');
    if (!['sprite','tileChunk','particles','nonvisual','text'].includes(item.kind) || !['base','pulse','mgfx','csharp'].includes(item.material.kind) || !['normal','add'].includes(item.material.blend)) throw new Error('Unsupported descriptor');
    if (item.kind === 'particles' && !item.particles || item.kind === 'tileChunk' && !item.chunk || item.kind === 'text' && typeof item.text !== 'string') throw new Error('Missing kind descriptor');
    if (item.atlas) checkRegion(item.atlas);
    if (item.animation) {
      if (!item.animation.frames.length || item.animation.frames.length > 64 || !finite(item.animation.fps) || item.animation.fps <= 0 || item.animation.fps > 60) throw new Error('Invalid animation');
      item.animation.frames.forEach(checkRegion);
    }
    if (item.particles && (!Number.isInteger(item.particles.count) || item.particles.count < 0 || item.particles.count > 256 || !finite(item.particles.radius) || item.particles.radius < 0 || item.particles.radius > 1024)) throw new Error('Particle budget exceeded');
    if ((item.text?.length ?? 0) > 256) throw new Error('Text budget exceeded');
    if (item.chunk) {
      const c = item.chunk;
      if (![c.x,c.y,c.columns,c.rows,c.cellSize].every(Number.isInteger) || c.columns <= 0 || c.rows <= 0 || c.cellSize <= 0 || c.cellSize > 256 || c.columns*c.rows > 4096 || c.cells.length !== c.columns*c.rows || c.regions.length > 64 || c.cells.some(i => !Number.isInteger(i) || i < -1 || i >= c.regions.length)) throw new Error('Invalid chunk budget');
      c.regions.forEach(checkRegion);
    }
  }
  for (const overlay of scene.overlays) if (!keys.has(JSON.stringify([overlay.target.uid,overlay.target.slotId])) || !finite(overlay.rect.x,overlay.rect.y,overlay.rect.width,overlay.rect.height) || overlay.rect.width < 0 || overlay.rect.height < 0) throw new Error('Invalid overlay');
}
export function freezeSnapshot<T>(value: T): T {
  if (value && typeof value === 'object') {
    Object.freeze(value);
    for (const child of Object.values(value)) freezeSnapshot(child);
  }
  return value;
}
