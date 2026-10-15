import { Application, Container, Graphics, Rectangle, Sprite, Text, Texture } from 'pixi.js';
import type { AssetRef, AtlasRegion, Diagnostic, EditorialRendererTelemetry, EditorialSceneSnapshot, Hit, IEditorialSceneRenderer, Point, PreviewState, RenderReport, Representation, ViewState } from '../contracts';
import { diagnose, hitTestScene, ordered, representationAssetsAvailable, sameHit, validateSnapshot } from '../scene';
import { PreviewClock } from '../PreviewClock';
import { OwnedAssets } from './OwnedAssets';

export interface EditorialAsset { readonly ref: AssetRef; readonly url: string; readonly width: number; readonly height: number }
const assetKey = (ref: AssetRef) => `${ref.guid}@${ref.revision}`;
/** The only Pixi dependency boundary. No gameplay or persistence responsibilities. */
export class PixiEditorialRenderer implements IEditorialSceneRenderer {
  private app = new Application();
  private root = new Container();
  private textures = new OwnedAssets<Texture>(texture=>texture.destroy(true));
  private regions = new Map<string,Texture>();
  private snapshot?: EditorialSceneSnapshot;
  private view?: ViewState;
  private diagnostics: Diagnostic[] = [];
  private state: RenderReport['context'] = 'ready';
  private systemDiagnostics: Diagnostic[] = [];
  private width = 1;
  private height = 1;
  private buildKey = '';
  private animations: { sprite: Sprite; item: Representation }[] = [];
  private emitters: { graphics: Graphics; item: Representation }[] = [];
  private pulses: { display: Container; opacity: number }[] = [];
  private tint?: Graphics;
  private canvas?: HTMLCanvasElement;
  private initialized = false;
  private disposed = false;
  private colors = { background: 0, surface: 0, fg: 0, muted: 0, border: 0, accent: 0, warning: 0 };
  private mountStartTime = 0;
  private firstInteractiveFrameRecorded = false;
  private telemetryData = {
    mountDurationMs: 0,
    firstInteractiveFrameMs: 0,
    assetDecodeDurations: new Map<string, number>(),
    contextLostCount: 0,
    contextRestoredCount: 0,
    lastHitTestDurationMs: 0,
  };
  private pendingLoads = new Map<string, Promise<void>>();
  private failedAssets = new Set<string>();
  private assetRevisions = new Map<string, string>();
  constructor(private assets: readonly EditorialAsset[], private onDiagnostic: (d: Diagnostic) => void) {
    for (const a of assets) this.assetRevisions.set(a.ref.guid, a.ref.revision);
  }
  private lost = (event: Event) => {
    if (this.disposed) return;
    this.telemetryData.contextLostCount++;
    event.preventDefault(); this.state = 'lost';
    const diagnostic:Diagnostic={ status:'Approximate',code:'context.lost',message:'Contexto WebGL perdido. Preview suspenso; snapshot preservado.' };
    this.systemDiagnostics=[diagnostic];this.onDiagnostic(diagnostic);
  };
  private restored = () => {
    if (this.disposed) return;
    this.telemetryData.contextRestoredCount++;
    this.state = 'restored'; this.buildKey = '';
    const diagnostic:Diagnostic={ status:'Approximate',code:'context.restored',message:'Contexto WebGL restaurado. Recuperação solicitada; valide o resultado visual.' };
    this.systemDiagnostics=[diagnostic];this.onDiagnostic(diagnostic);
  };
  async mount(canvas: HTMLCanvasElement) {
    if (this.disposed) return;
    this.canvas = canvas;
    if (this.assets.length > 16 || this.assets.some(a => a.width > 4096 || a.height > 4096 || a.width <= 0 || a.height <= 0 || !(a.url.startsWith('data:image/png;') || a.url.startsWith('./')))) throw new Error('Editorial asset budget/source rejected');
    this.mountStartTime = performance.now();
    // Resolve OKLch tokens once through the browser, rather than maintain a separate GPU palette.
    const probe = document.createElement('canvas'); probe.width = probe.height = 1;
    const context = probe.getContext('2d', { willReadFrequently: true })!;
    const css = getComputedStyle(document.documentElement);
    for (const key of Object.keys(this.colors) as (keyof typeof this.colors)[]) {
      const token = key === 'background' ? 'bg' : key;
      context.clearRect(0,0,1,1); context.fillStyle = css.getPropertyValue(`--${token}`).trim(); context.fillRect(0,0,1,1);
      const [r,g,b] = context.getImageData(0,0,1,1).data; this.colors[key] = r*65536+g*256+b;
    }
    await this.app.init({ canvas, preference:'webgl', antialias:false, autoStart:false, resolution:Math.min(window.devicePixelRatio || 1,2), autoDensity:true, backgroundColor:this.colors.background });
    this.initialized = true;
    if (this.disposed) { this.app.destroy(false,{children:true}); return; }
    canvas.addEventListener('webglcontextlost',this.lost);
    canvas.addEventListener('webglcontextrestored',this.restored);
    this.app.stage.addChild(this.root);
    this.telemetryData.mountDurationMs = performance.now() - this.mountStartTime;

    // Start background decodes without blocking mount()!
    this.loadAssetsAsync();
  }
  private loadAssetsAsync() {
    for (const a of this.assets) {
      const key = assetKey(a.ref);
      this.assetRevisions.set(a.ref.guid, a.ref.revision);
      const decodeStart = performance.now();
      const task = this.textures.load(key, async () => {
        const image = new Image();
        image.src = a.url;
        await image.decode();
        if (image.naturalWidth !== a.width || image.naturalHeight !== a.height) throw new Error('Asset dimensions mismatch');
        const duration = performance.now() - decodeStart;
        this.telemetryData.assetDecodeDurations.set(key, duration);
        return Texture.from(image, true);
      }, () => {
        if (this.disposed) return;
        this.failedAssets.add(key);
        this.onDiagnostic({ status: 'MissingAssetPlaceholder', code: 'asset.load', message: `Falha ao carregar ${a.ref.guid}@${a.ref.revision}; placeholder mantido.` });
        this.buildKey = '';
      }).then(() => {
        this.pendingLoads.delete(key);
        if (this.disposed) return;
        const currentRev = this.assetRevisions.get(a.ref.guid);
        if (currentRev && currentRev !== a.ref.revision) return;
        this.buildKey = '';
      });
      this.pendingLoads.set(key, task);
    }
  }
  whenAssetsLoaded(): Promise<void> {
    return Promise.all(Array.from(this.pendingLoads.values())).then(() => {});
  }
  getTelemetry(): EditorialRendererTelemetry {
    return {
      mountDurationMs: this.telemetryData.mountDurationMs,
      firstInteractiveFrameMs: this.telemetryData.firstInteractiveFrameMs,
      assetDecodeDurations: new Map(this.telemetryData.assetDecodeDurations),
      contextLostCount: this.telemetryData.contextLostCount,
      contextRestoredCount: this.telemetryData.contextRestoredCount,
      lastHitTestDurationMs: this.telemetryData.lastHitTestDurationMs,
      activeTexturesCount: this.textures.size,
      activeRegionsCount: this.regions.size,
    };
  }
  resize(width: number, height: number) {
    this.width = Math.max(1,width); this.height = Math.max(1,height);
    if (this.initialized && !this.disposed) this.app.renderer.resize(this.width,this.height);
  }
  private offset() {
    const c = this.view!.camera, e = this.snapshot!.extent;
    return { x:this.width/2-(e.x+e.width/2)*c.zoom+c.x, y:this.height/2-(e.y+e.height/2)*c.zoom+c.y };
  }
  screenToWorld(point: Point): Point {
    if (!this.snapshot || !this.view) return point;
    const o = this.offset(), z = this.view.camera.zoom;
    return {x:(point.x-o.x)/z,y:(point.y-o.y)/z};
  }
  hitTest(screen: Point): Hit | undefined {
    const start = performance.now();
    const result = this.snapshot && this.view ? hitTestScene(this.snapshot,this.screenToWorld(screen),this.view) : undefined;
    this.telemetryData.lastHitTestDurationMs = performance.now() - start;
    return result;
  }
  private texture(r?: AtlasRegion): Texture | undefined {
    if (!r) return;
    const source = this.textures.get(assetKey(r.asset));
    if (!source || r.x+r.width > source.width || r.y+r.height > source.height) return;
    const key = `${assetKey(r.asset)}:${r.x}:${r.y}:${r.width}:${r.height}`;
    let texture = this.regions.get(key);
    if (!texture) { texture = new Texture({source:source.source,frame:new Rectangle(r.x,r.y,r.width,r.height)}); this.regions.set(key,texture); }
    return texture;
  }
  private isAssetPending(ref: AssetRef): boolean {
    const key = assetKey(ref);
    return !this.failedAssets.has(key) && (this.textures.isPending(key) || this.pendingLoads.has(key));
  }
  private build(snapshot: EditorialSceneSnapshot, view: ViewState) {
    for (const child of this.root.removeChildren()) child.destroy({children:true});
    this.animations = []; this.emitters = []; this.pulses = []; this.diagnostics = [];
    for (const texture of this.textures.values()) texture.source.scaleMode = view.sampling === 'point' ? 'nearest' : 'linear';
    const c = this.colors;
    const floor = new Graphics().rect(snapshot.extent.x,snapshot.extent.y,snapshot.extent.width,snapshot.extent.height).fill(c.surface);
    this.root.addChild(floor);
    for (const item of ordered(snapshot)) {
      const atlas = item.animation?.frames[0] ?? item.atlas;
      const present = representationAssetsAvailable(item,r=>!!this.texture(r));
      const isPending = !present && (
        item.atlas ? this.isAssetPending(item.atlas.asset) :
        item.animation ? item.animation.frames.some(f => this.isAssetPending(f.asset)) :
        item.chunk ? item.chunk.regions.some(r => this.isAssetPending(r.asset)) : false
      );
      this.diagnostics.push(diagnose(item,present,isPending));
      if (view.hiddenLayers.includes(item.layerId)) continue;
      const node = new Container(), t = sameHit(item,view.transient?.target) ? view.transient!.world : item.world;
      node.position.set(t.x,t.y); node.rotation = t.rotation; node.scale.set(t.scaleX,t.scaleY); node.alpha = item.material.opacity;
      node.blendMode = item.material.blend === 'add' ? 'add' : 'normal';
      this.root.addChild(node);
      const b = item.bounds;
      if (!present) {
        const color = isPending ? c.accent : c.warning;
        const g = new Graphics().rect(b.x,b.y,b.width,b.height).fill({color,alpha:0.12}).stroke({color,width:1.5});
        g.moveTo(b.x,b.y).lineTo(b.x+b.width,b.y+b.height).moveTo(b.x+b.width,b.y).lineTo(b.x+b.width,b.y+b.height).stroke({color,width:1,alpha:0.5});
        const label = new Text({text:isPending?'…':'?',style:{fontFamily:'Segoe UI',fontSize:24,fill:color}}); label.anchor.set(0.5);label.position.set(b.x+b.width/2,b.y+b.height/2);node.addChild(g,label);
      } else if (item.kind === 'tileChunk' && item.chunk) {
        const chunk = item.chunk;
        chunk.cells.forEach((index,i) => {
          if (index < 0) return;
          const texture = this.texture(chunk.regions[index]); if (!texture) return;
          const sprite = new Sprite(texture); sprite.position.set((chunk.x*chunk.columns+i%chunk.columns)*chunk.cellSize,(chunk.y*chunk.rows+Math.floor(i/chunk.columns))*chunk.cellSize); sprite.width = sprite.height = chunk.cellSize;node.addChild(sprite);
        });
      } else if (item.kind === 'sprite') {
        const sprite = new Sprite(this.texture(atlas)); sprite.position.set(b.x,b.y); sprite.width=b.width;sprite.height=b.height;node.addChild(sprite);
        if (item.animation) this.animations.push({sprite,item});
      } else if (item.kind === 'particles') {
        const graphics = new Graphics();node.addChild(graphics);this.emitters.push({graphics,item});
      } else if (item.kind === 'nonvisual') {
        const g = new Graphics().circle(14,14,13).fill({color:c.surface,alpha:1}).stroke({color:c.muted,width:1});
        g.moveTo(10,11).lineTo(14,7).lineTo(14,21).lineTo(10,17).lineTo(7,17).lineTo(7,11).closePath().fill(c.muted);
        g.arc(12,14,8,-0.7,0.7).stroke({color:c.muted,width:1});node.addChild(g);
      } else if (item.kind === 'text') {
        node.addChild(new Text({text:item.text ?? '',style:{fontFamily:'monospace',fontSize:13,letterSpacing:2,fill:c.muted}}));
      }
      if (item.material.kind === 'pulse') this.pulses.push({display:node,opacity:item.material.opacity});
    }
    if (view.grid) {
      const grid = new Graphics(); const e = snapshot.extent;
      for (let x=e.x;x<=e.x+e.width;x+=32) grid.moveTo(x,e.y).lineTo(x,e.y+e.height);
      for (let y=e.y;y<=e.y+e.height;y+=32) grid.moveTo(e.x,y).lineTo(e.x+e.width,y);
      grid.stroke({color:c.muted,alpha:0.12,width:0.6});this.root.addChild(grid);
    }
    if (view.overlays) for (const overlay of snapshot.overlays) {
      const target = snapshot.representations.find(r => sameHit(r,overlay.target));
      if (!target || view.hiddenLayers.includes(target.layerId)) continue;
      const t = sameHit(target,view.transient?.target) ? view.transient!.world : target.world;
      const b=overlay.rect,g=new Graphics();g.position.set(t.x,t.y);g.rotation=t.rotation;g.scale.set(t.scaleX,t.scaleY);
      g.rect(b.x,b.y,b.width,b.height).stroke({color:overlay.kind==='collider'?c.warning:c.muted,alpha:0.6,width:1});this.root.addChild(g);
      if (overlay.kind==='camera') { const text=new Text({text:'CÂMERA · GUIA',style:{fontFamily:'monospace',fontSize:9,fill:c.muted}});text.position.set(b.x+6,b.y+6);g.addChild(text); }
    }
    const selected = snapshot.representations.find(r => sameHit(r,view.selection));
    if (selected && !view.hiddenLayers.includes(selected.layerId)) {
      const t = sameHit(selected,view.transient?.target) ? view.transient!.world : selected.world;
      const b=selected.bounds,g=new Graphics();g.position.set(t.x,t.y);g.rotation=t.rotation;g.scale.set(t.scaleX,t.scaleY);
      g.rect(b.x-2,b.y-2,b.width+4,b.height+4).stroke({color:c.accent,width:1.5});
      for(const x of [b.x-2,b.x+b.width+2])for(const y of [b.y-2,b.y+b.height+2])g.rect(x-3,y-3,6,6).fill(c.accent);
      g.moveTo(b.x+b.width/2,b.y+b.height/2).lineTo(b.x+b.width/2+30,b.y+b.height/2).lineTo(b.x+b.width/2+24,b.y+b.height/2-4).moveTo(b.x+b.width/2+30,b.y+b.height/2).lineTo(b.x+b.width/2+24,b.y+b.height/2+4).stroke({color:c.accent,width:1.5});
      this.root.addChild(g);
    }
    this.tint = new Graphics().rect(snapshot.extent.x,snapshot.extent.y,snapshot.extent.width,snapshot.extent.height).fill({color:c.background,alpha:0.12});
    this.root.addChild(this.tint);
  }
  render(snapshot: EditorialSceneSnapshot, view: ViewState, preview: PreviewState): RenderReport {
    const report=():RenderReport=>({diagnostics:[...this.diagnostics,...this.systemDiagnostics,...(preview.screenEffects?[{status:'Approximate' as const,code:'screen.preview',message:'Efeito de tela editorial: véu de opacidade. Composição MonoGame não validada.'}]:[])],context:this.state});
    if (!this.initialized || this.disposed || this.state==='lost') return report();
    if (!this.firstInteractiveFrameRecorded) {
      this.firstInteractiveFrameRecorded = true;
      this.telemetryData.firstInteractiveFrameMs = performance.now() - this.mountStartTime;
    }
    if (this.snapshot !== snapshot) validateSnapshot(snapshot);
    const key = JSON.stringify([snapshot.sceneId,snapshot.revision,view.hiddenLayers,view.selection,view.transient,view.grid,view.overlays,view.sampling]);
    if (this.snapshot !== snapshot || this.buildKey !== key) { this.build(snapshot,view);this.buildKey=key; }
    this.snapshot=snapshot;this.view=view;
    const o=this.offset();this.root.position.set(o.x,o.y);this.root.scale.set(view.camera.zoom);
    for(const {sprite,item} of this.animations) {
      const animation=item.animation!;const texture=this.texture(animation.frames[Math.floor(preview.seconds*animation.fps)%animation.frames.length]);if(texture)sprite.texture=texture;
    }
    let remaining = Math.min(256,Math.max(0,preview.maxParticles));
    for(const {graphics,item} of this.emitters) {
      graphics.clear();const descriptor=item.particles;if(!preview.particles||!descriptor)continue;
      const count=Math.min(descriptor.count,remaining);remaining-=count;
      for(let i=0;i<count;i++) {
        const a=PreviewClock.sample(preview.seed,0,i)*Math.PI*2;
        const phase=(preview.seconds*0.2+PreviewClock.sample(preview.seed,0,i+256))%1;
        const radius=phase*descriptor.radius;
        graphics.circle(Math.cos(a)*radius,Math.sin(a)*radius,1+PreviewClock.sample(preview.seed,0,i+512)).fill({color:this.colors.accent,alpha:(1-phase)*0.8});
      }
    }
    for(const {display,opacity} of this.pulses) display.alpha=opacity*(preview.shaders?0.8+0.2*Math.cos(preview.seconds*3):1);
    if(this.tint)this.tint.visible=preview.screenEffects;
    this.app.render();
    return report();
  }
  dispose() {
    if(this.disposed)return;
    this.disposed=true;
    this.pendingLoads.clear();
    this.failedAssets.clear();
    this.canvas?.removeEventListener('webglcontextlost',this.lost);this.canvas?.removeEventListener('webglcontextrestored',this.restored);
    if(this.initialized)this.app.destroy(false,{children:true});
    for(const texture of this.regions.values())texture.destroy(false);this.regions.clear();
    this.textures.dispose();this.snapshot=undefined;this.view=undefined;
  }
}
