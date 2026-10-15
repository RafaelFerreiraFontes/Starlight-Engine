import type { AtlasRegion, EditorialSceneSnapshot, Representation, Transform } from '../rendering/contracts';
import { freezeSnapshot, validateSnapshot } from '../rendering/scene';
const asset = { guid: 'asset:9db6d385-13e6-4dc0-bdab-060501cc0023' as const, revision: 'fixture-r1' };
export const fixtureAsset = asset;
const region = (index: number, y = 0): AtlasRegion => ({ asset, x: index * 16, y, width: 16, height: 16 });
const transform = (x: number, y: number): Transform => ({ x, y, rotation: 0, scaleX: 1, scaleY: 1 });
const make = (id: number, name: string, x: number, y: number, patch: Partial<Representation> = {}): Representation => ({
  uid: `instance:532a1000-0000-4000-8000-${String(id).padStart(12,'0')}`, slotId: 'visual:main', name, layerId: 'objects', z: id,
  local: transform(x,y), world: transform(x,y), bounds: { x: 0, y: 0, width: 64, height: 64 }, kind: 'sprite', atlas: region(0,16), material: { kind: 'base', blend: 'normal', opacity: 1 }, ...patch,
});
const columns = 24, rows = 15;
const cells = Array.from({ length: columns * rows }, (_,i) => {
  const x = i % columns, y = Math.floor(i / columns);
  if (x < 2 || x > 21 || y < 2 || y > 12) return -1;
  if (x === 2 || x === 21 || y === 2 || y === 12) return 5;
  if ((x === 4 || x === 19) && y >= 4 && y <= 10) return 4;
  if (y === 7 && x > 6 && x < 18) return 3;
  if ((x === 10 || x === 13) && (y === 4 || y === 10)) return 7;
  return (x+y) % 5 === 0 ? 1 : 0;
});
const probe = make(2,'Sonda · sprite animado',352,208, { animation: { frames: [0,1,2,3].map(i => region(i,16)), fps: 8 } });
const mgfx = make(3,'Baliza · material MGFX',224,304, { atlas: region(6), material: { kind: 'mgfx', blend: 'normal', opacity: 1 } });
const missing = make(4,'Asset ausente',544,288, { atlas: { ...region(0), asset: { guid: 'asset:aa000000-0000-4000-8000-000000000023', revision: 'missing-r1' } } });
const csharp = make(5,'Sensor · renderer C#',512,128, { atlas: region(4), material: { kind: 'csharp', blend: 'normal', opacity: 1 } });
export const fixtureScene: EditorialSceneSnapshot = freezeSnapshot({
  schemaVersion: 1, revision: 1, sceneId: 'layout:a1110023-0000-4000-8000-000000000001', label: 'Plataforma orbital', extent: { x: 0, y: 0, width: 768, height: 480 },
  layers: [{ id:'structure',name:'Estrutura',order:0 },{ id:'objects',name:'Objetos',order:1 },{ id:'effects',name:'Efeitos',order:2 },{ id:'guides',name:'Guias',order:3 }],
  representations: [
    make(1,'Piso · chunk [0, 0]',0,0,{ layerId:'structure',kind:'tileChunk',bounds:{x:0,y:0,width:768,height:480},atlas:undefined,chunk:{x:0,y:0,columns,rows,cellSize:32,cells,regions:Array.from({length:8},(_,i)=>region(i))} }),
    probe,mgfx,missing,csharp,
    make(9,'Núcleo · pulso seguro',352,128,{atlas:region(6),bounds:{x:0,y:0,width:32,height:32},material:{kind:'pulse',blend:'normal',opacity:1}}),
    make(6,'Emissor · preview limitado',384,224,{ layerId:'effects',kind:'particles',atlas:undefined,bounds:{x:-40,y:-40,width:80,height:80},particles:{count:32,radius:60},material:{kind:'base',blend:'add',opacity:0.65} }),
    make(7,'Áudio · componente não visual',160,128,{ layerId:'guides',kind:'nonvisual',slotId:'audio:ambient',atlas:undefined,bounds:{x:0,y:0,width:28,height:28} }),
    make(8,'Identificador de setor',288,96,{ layerId:'guides',kind:'text',atlas:undefined,text:'SECTOR  /  023',bounds:{x:0,y:0,width:192,height:24} }),
  ],
  overlays: [
    { kind:'collider',target:{uid:probe.uid,slotId:probe.slotId},rect:{x:8,y:4,width:48,height:56} },
    { kind:'camera',target:{uid:probe.uid,slotId:probe.slotId},rect:{x:-256,y:-144,width:576,height:352} },
    { kind:'bounds',target:{uid:missing.uid,slotId:missing.slotId},rect:missing.bounds },
  ],
});
validateSnapshot(fixtureScene);
export const initialSelection = { uid: probe.uid, slotId: probe.slotId };
