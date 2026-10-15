import { describe, expect, it } from 'vitest';
import { PreviewClock } from '../src/rendering/PreviewClock';
import { diagnose, freezeSnapshot, hitTestScene, ordered, representationAssetsAvailable, validateSnapshot } from '../src/rendering/scene';
import { fixtureScene } from '../src/fixtures/scene';
import { createTransformCommand, DisconnectedHostPort, translationGestureDiagnostic } from '../src/host/commands';
import type { EditorialSceneSnapshot, Representation, ViewState } from '../src/rendering/contracts';
const view: Pick<ViewState,'hiddenLayers'|'lockedLayers'|'transient'>={hiddenLayers:[],lockedLayers:['structure']};
const probe=fixtureScene.representations.find(r=>r.animation)!;
const sceneWith=(representations: readonly Representation[]):EditorialSceneSnapshot=>({...fixtureScene,representations,overlays:[]});
describe('PreviewClock isolated deterministic visual session',()=>{
  it('never advances while paused; play/step/reset have explicit semantics',()=>{
    const c=new PreviewClock();c.advance(1000);expect(c.frame).toBe(0);c.play();c.advance(1000/60*3);expect(c.frame).toBe(3);expect(c.seconds).toBe(0.05);
    c.pause();c.advance(1000);expect(c.frame).toBe(3);c.step();expect(c.frame).toBe(4);expect(c.playing).toBe(false);c.reset();expect(c.frame).toBe(0);expect(c.seconds).toBe(0);
  });
  it('caps catchup after a stall and discards paused time',()=>{const c=new PreviewClock();c.play();c.advance(1000000);expect(c.frame).toBe(8);c.pause();c.play();c.advance(0);expect(c.frame).toBe(8);});
  it('gives identical fixed ticks for equivalent elapsed segments',()=>{const a=new PreviewClock(),b=new PreviewClock();a.play();b.play();for(let i=0;i<60;i++)a.advance(1000/60);for(let i=0;i<120;i++)b.advance(1000/120);expect(a.frame).toBe(60);expect(b.frame).toBe(a.frame);});
  it.each([NaN,Infinity,-100])('ignores invalid delta %s',delta=>{const c=new PreviewClock();c.play();c.advance(delta);expect(c.frame).toBe(0);});
  it('bounds declarative budgets before allocation',()=>{expect(()=>new PreviewClock(23,257)).toThrow();expect(()=>new PreviewClock(23,-1)).toThrow();expect(()=>new PreviewClock(23,96.5)).toThrow();});
  it('samples the same seed/frame/index identically without evolving hidden state',()=>{const value=PreviewClock.sample(23,60,7);expect(value).toBe(PreviewClock.sample(23,60,7));expect(value).not.toBe(PreviewClock.sample(24,60,7));expect(value).toBeGreaterThanOrEqual(0);expect(value).toBeLessThan(1);});
});
describe('Stable layer/z/UID/slot order',()=>{
  it('is independent of arrival order and does not mutate the projection',()=>{const original=fixtureScene.representations.map(r=>r.uid);const reversed=sceneWith([...fixtureScene.representations].reverse());expect(ordered(reversed).map(r=>r.uid)).toEqual(ordered(fixtureScene).map(r=>r.uid));expect(fixtureScene.representations.map(r=>r.uid)).toEqual(original);});
  it('uses z inside a layer, then UID, then component slot',()=>{
    const a={...probe,z:0,slotId:'b'},b={...probe,z:0,slotId:'a'},c={...probe,z:-1,slotId:'c'};
    expect(ordered(sceneWith([a,b,c])).map(r=>r.slotId)).toEqual(['c','a','b']);
  });
  it('resolves equal layer orders with deterministic persistent identities',()=>{
    const scene={...sceneWith([{...probe,uid:'instance:b',layerId:'effects',z:0},{...probe,uid:'instance:a',z:0}]),layers:fixtureScene.layers.map(l=>({...l,order:0}))};
    expect(ordered(scene).map(r=>r.uid)).toEqual(['instance:a','instance:b']);
  });
});
describe('Deterministic hit tests including fallbacks',()=>{
  it('selects an absent asset by UID/slot and bounding box',()=>{const missing=fixtureScene.representations.find(r=>r.name==='Asset ausente')!;expect(hitTestScene(fixtureScene,{x:560,y:310},view)).toEqual({uid:missing.uid,slotId:missing.slotId});});
  it('excludes hidden and locked layers from picking',()=>{const scene=sceneWith([probe]);expect(hitTestScene(scene,{x:360,y:220},{...view,hiddenLayers:['objects']})).toBeUndefined();expect(hitTestScene(scene,{x:360,y:220},{...view,lockedLayers:['objects']})).toBeUndefined();});
  it('resolves the topmost slot for overlapping geometry',()=>{const scene=sceneWith([{...probe,z:1,slotId:'front'}, {...probe,z:0,slotId:'back'}]);expect(hitTestScene(scene,{x:360,y:220},view)?.slotId).toBe('front');});
  it('inverts world rotation and negative scale rather than testing an AABB',()=>{
    const rotated={...probe,world:{x:100,y:100,rotation:Math.PI/2,scaleX:2,scaleY:-1},bounds:{x:0,y:0,width:20,height:10}};
    expect(hitTestScene(sceneWith([rotated]),{x:105,y:120},view)?.uid).toBe(probe.uid);
    expect(hitTestScene(sceneWith([rotated]),{x:115,y:120},view)).toBeUndefined();
  });
  it('uses transient transforms for picking while preserving the source',()=>{expect(hitTestScene(sceneWith([probe]),{x:10,y:10},{...view,transient:{target:probe,world:{...probe.world,x:0,y:0}}})?.uid).toBe(probe.uid);expect(probe.world.x).toBe(352);});
  it('handles boundary inclusivity and singular scale',()=>{expect(hitTestScene(sceneWith([probe]),{x:416,y:272},view)?.uid).toBe(probe.uid);expect(hitTestScene(sceneWith([{...probe,world:{...probe.world,scaleX:0}}]),{x:352,y:208},view)).toBeUndefined();});
});
describe('Explicit fallback contract',()=>{
  it('keeps sprite and nonvisual subsets supported',()=>{expect(diagnose(probe,true).status).toBe('Supported');expect(diagnose({...probe,kind:'nonvisual'},true).status).toBe('Supported');});
  it.each(['mgfx','csharp'] as const)('preserves base material for %s without executing it',kind=>{expect(diagnose({...probe,material:{...probe.material,kind}},true)).toMatchObject({uid:probe.uid,slotId:probe.slotId,status:'UnsupportedFallback',code:`material.${kind}`});});
  it('prioritizes missing asset over shader support',()=>{expect(diagnose({...probe,material:{...probe.material,kind:'mgfx'}},false).status).toBe('MissingAssetPlaceholder');});
  it('reports LoadingAssetPlaceholder while asset is actively loading in background',()=>{expect(diagnose(probe,false,true)).toMatchObject({status:'LoadingAssetPlaceholder',code:'asset.loading'});});
  it('reports approximate particles and safe visual effects',()=>{expect(diagnose({...probe,kind:'particles'},true).status).toBe('Approximate');expect(diagnose({...probe,material:{...probe.material,kind:'pulse'}},true).status).toBe('Approximate');expect(diagnose({...probe,material:{...probe.material,blend:'add'}},true).status).toBe('Approximate');});
  it('checks later animation frames and selects a placeholder rather than holding the old frame',()=>{
    const lateMissing={...probe,animation:{...probe.animation!,frames:[probe.animation!.frames[0],{...probe.animation!.frames[1],asset:{guid:'asset:missing' as const,revision:'r2'}}]}};
    const available=representationAssetsAvailable(lateMissing,r=>r.asset.guid!=='asset:missing');
    expect(available).toBe(false);expect(diagnose(lateMissing,available).status).toBe('MissingAssetPlaceholder');
    expect(representationAssetsAvailable(probe,()=>true)).toBe(true);
  });
});
describe('Projection validation and immutability',()=>{
  it('validates the fixture and recursively freezes transforms, cells and atlas metadata',()=>{expect(()=>validateSnapshot(fixtureScene)).not.toThrow();expect(Object.isFrozen(probe.world)).toBe(true);expect(()=>{(probe.world as {x:number}).x=0;}).toThrow();expect(Object.isFrozen(fixtureScene.representations[0].chunk!.cells)).toBe(true);expect(freezeSnapshot({a:[1]}).a).toEqual([1]);});
  it('rejects duplicate UID/slot pairs, not different slots of one UID',()=>{expect(()=>validateSnapshot(sceneWith([probe,probe]))).toThrow('identity');expect(()=>validateSnapshot(sceneWith([probe,{...probe,slotId:'secondary'}]))).not.toThrow();});
  it.each([NaN,Infinity,-Infinity])('rejects nonfinite geometry %s',x=>{expect(()=>validateSnapshot(sceneWith([{...probe,world:{...probe.world,x}}]))).toThrow('transform');});
  it('rejects unsupported snapshot versions and unknown layers',()=>{expect(()=>validateSnapshot({...fixtureScene,schemaVersion:2} as unknown as EditorialSceneSnapshot)).toThrow('version');expect(()=>validateSnapshot(sceneWith([{...probe,layerId:'unknown'}]))).toThrow('layer');});
  it('rejects hostile particle, animation and tile allocations',()=>{
    expect(()=>validateSnapshot(sceneWith([{...probe,particles:{count:10000000,radius:5}}]))).toThrow('Particle');
    expect(()=>validateSnapshot(sceneWith([{...probe,animation:{frames:[],fps:8}}]))).toThrow('animation');
    const tile=fixtureScene.representations[0];expect(()=>validateSnapshot(sceneWith([{...tile,chunk:{...tile.chunk!,columns:10000}}]))).toThrow('chunk');
  });
  it('rejects particles without a descriptor before GPU scene allocation',()=>{expect(()=>validateSnapshot(sceneWith([{...probe,kind:'particles',particles:undefined}]))).toThrow('Missing kind descriptor');});
  it('validates geometry in every later animation frame',()=>{const frames=[...probe.animation!.frames];frames[3]={...frames[3],width:NaN};expect(()=>validateSnapshot(sceneWith([{...probe,animation:{...probe.animation!,frames}}]))).toThrow('atlas');});
});
describe('Candidate transactional proposal, disconnected delivery',()=>{
  it('carries expected revision, idempotency ID and local/world translation in one command',()=>{
    const scene=sceneWith([probe]);const world={...probe.world,x:384,y:240};
    const command=createTransformCommand(scene,probe,world,'test-command-id');
    expect(command).toMatchObject({method:'project/applyCommand',params:{commandId:'test-command-id',commandType:'layout/setInstanceTransform',expectedRevision:1,payload:{target:{uid:probe.uid,slotId:probe.slotId},local:{x:384,y:240},world}}});expect(Object.keys(command.params.payload.target)).toEqual(['uid','slotId']);expect(probe.world.x).toBe(352);
  });
  it('blocks parent transforms explicitly, including rotated/scaled parents',()=>{
    const parented={...probe,parent:{uid:'instance:parent' as const,slotId:'transform:root'},local:{...probe.local,x:10,y:20,rotation:1,scaleX:2}};
    expect(translationGestureDiagnostic(parented)?.code).toBe('gesture.root-only');
    expect(()=>createTransformCommand(sceneWith([parented]),parented,{...parented.world,x:500},'id')).toThrow('parent');
    const ambiguous={...probe,local:{...probe.local,x:10}};expect(()=>createTransformCommand(sceneWith([ambiguous]),ambiguous,{...probe.world,x:500},'id')).toThrow('local/world');
  });
  it('blocks rotation/scale mutation through a translation-only command',()=>{expect(()=>createTransformCommand(sceneWith([probe]),probe,{...probe.world,rotation:1},'id')).toThrow('translação');});
  it('never claims a Host acknowledgement or updates the immutable scene',async()=>{const before=JSON.stringify(fixtureScene);const c=createTransformCommand(fixtureScene,probe,{...probe.world,x:500},'id');expect(await new DisconnectedHostPort().applyCommand(c)).toEqual({status:'disconnected',reason:'disconnected',delivery:'not-sent'});expect(JSON.stringify(fixtureScene)).toBe(before);});
});
