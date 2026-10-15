import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { Grid2X2, Magnet, MousePointer2, Hand, Scan, Layers2, RotateCcw, Play, Pause, SkipForward, SkipBack, Minus, Plus, AlertTriangle } from 'lucide-react';
import type { Diagnostic, EditorialSceneSnapshot, IEditorialSceneRenderer, Point, RendererFactory, ViewState } from '../rendering/contracts';
import { PreviewClock } from '../rendering/PreviewClock';
import { createTransformCommand, DisconnectedHostPort, translationGestureDiagnostic, type HostCommandPort, type TransformCommand } from '../host/commands';
import { useEditorUI } from './store';
import { Tool, Toggle } from '../components/ui/controls';
import { Button } from '../components/ui/button';
interface Props { snapshot: EditorialSceneSnapshot; createRenderer: RendererFactory; onDiagnostics:(d:readonly Diagnostic[])=>void; onCommand:(command:TransformCommand)=>void; hostPort?: HostCommandPort }
export function SceneView({snapshot,createRenderer,onDiagnostics,onCommand,hostPort}:Props) {
  const canvas = useRef<HTMLCanvasElement>(null), viewport = useRef<HTMLDivElement>(null), renderer = useRef<IEditorialSceneRenderer>();
  const clock = useRef(new PreviewClock()), host = useRef<HostCommandPort>(hostPort ?? new DisconnectedHostPort());
  useEffect(()=>{if(hostPort)host.current=hostPort;},[hostPort]);
  const [ready,setReady]=useState(false),[error,setError]=useState(''),[frame,setFrame]=useState(0),[playing,setPlaying]=useState(false);
  const [grid,setGrid]=useState(true),[snap,setSnap]=useState(true),[overlays,setOverlays]=useState(true),[panTool,setPanTool]=useState(false);
  const [particles,setParticles]=useState(false),[shaders,setShaders]=useState(false),[screenEffects,setScreenEffects]=useState(false);
  const [sampling,setSampling]=useState<'point'|'linear'>('point'),[discardOnBlur,setDiscardOnBlur]=useState(true);
  const [camera,setCamera]=useState({x:0,y:0,zoom:1});
  const [notice,setNotice]=useState('Autoria visual · Host desconectado. Gestos não são persistidos.');
  const ui=useEditorUI();
  const view:ViewState={camera,grid,overlays,sampling,selection:ui.selection,transient:ui.transient,hiddenLayers:ui.hiddenLayers,lockedLayers:ui.lockedLayers};
  const state=useRef({view,particles,shaders,screenEffects});state.current={view,particles,shaders,screenEffects};
  const drag=useRef<{pointer:number;start:Point;world:Point;camera:typeof camera;target?:NonNullable<ViewState['selection']>}>();
  const fit=()=> { const r=viewport.current?.getBoundingClientRect();if(r)setCamera({x:0,y:0,zoom:Math.max(0.1,Math.min(2,Math.min((r.width-64)/snapshot.extent.width,(r.height-64)/snapshot.extent.height)))}); };
  const cleanupDrag = (surface?: HTMLCanvasElement | null, pointerId?: number) => {
    drag.current = undefined;
    ui.drag(undefined);
    if (surface && pointerId !== undefined) {
      try {
        if (surface.hasPointerCapture?.(pointerId)) surface.releasePointerCapture(pointerId);
      } catch {
        // Safe release
      }
    }
  };
  useEffect(()=>{
    const surface=canvas.current!,container=viewport.current!;let cancelled=false,raf=0,last=0,lastReport='';
    const implementation=createRenderer(d=>{setNotice(d.message);if(d.code==='context.lost'){clock.current.pause();setPlaying(false);} });renderer.current=implementation;
    const resize=new ResizeObserver(()=>{const b=container.getBoundingClientRect();implementation.resize(b.width,b.height);});
    implementation.mount(surface).then(()=>{
      if(cancelled)return;
      const b=container.getBoundingClientRect();implementation.resize(b.width,b.height);fit();setReady(true);resize.observe(container);
      const tick=(now:number)=>{
        if(cancelled)return;clock.current.advance(last?now-last:0);last=now;
        const s=state.current;
        const report=implementation.render(snapshot,s.view,{frame:clock.current.frame,seconds:clock.current.seconds,seed:clock.current.seed,maxParticles:clock.current.maxParticles,particles:s.particles,shaders:s.shaders,screenEffects:s.screenEffects});
        const signature=JSON.stringify(report);if(signature!==lastReport){onDiagnostics(report.diagnostics);lastReport=signature;}
        setFrame(clock.current.frame);raf=requestAnimationFrame(tick);
      };raf=requestAnimationFrame(tick);
    }).catch(e=>{if(!cancelled){setError(`WebGL indisponível: ${String(e)}`);onDiagnostics([{status:'UnsupportedFallback',code:'renderer.init',message:'Inicialização WebGL falhou. Cena não ocultada: representações permanecem no explorador.'}]);}});
    return()=>{cancelled=true;cancelAnimationFrame(raf);resize.disconnect();clock.current.reset();useEditorUI.getState().drag(undefined);implementation.dispose();renderer.current=undefined;};
  },[snapshot,createRenderer,onDiagnostics]);
  useEffect(()=>{
    const discard=()=>{clock.current.pause();setPlaying(false);if(discardOnBlur){clock.current.reset();setFrame(0);}cleanupDrag();};
    const visibility=()=>{if(document.hidden)discard();};window.addEventListener('blur',discard);document.addEventListener('visibilitychange',visibility);
    return()=>{window.removeEventListener('blur',discard);document.removeEventListener('visibilitychange',visibility);};
  },[discardOnBlur]);
  const point=(event:PointerEvent<HTMLCanvasElement>):Point=>{const rect=event.currentTarget.getBoundingClientRect();return{x:event.clientX-rect.left,y:event.clientY-rect.top};};
  const down=(event:PointerEvent<HTMLCanvasElement>)=>{
    if(!ready)return;
    const p=point(event),r=renderer.current!,target=event.button===1||panTool?undefined:r.hitTest(p);
    if(event.button!==0&&event.button!==1)return;
    if(!panTool&&event.button!==1)ui.select(target);
    const item=target?snapshot.representations.find(r=>r.uid===target.uid&&r.slotId===target.slotId):undefined;
    const constraint=item?translationGestureDiagnostic(item):undefined;
    if(constraint){setNotice(constraint.message);return;}
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current={pointer:event.pointerId,start:p,world:r.screenToWorld(p),camera,target};
  };
  const move=(event:PointerEvent<HTMLCanvasElement>)=>{
    const gesture=drag.current;if(!gesture||gesture.pointer!==event.pointerId)return;
    const p=point(event);
    if(!gesture.target){setCamera({...gesture.camera,x:gesture.camera.x+p.x-gesture.start.x,y:gesture.camera.y+p.y-gesture.start.y});return;}
    const item=snapshot.representations.find(r=>r.uid===gesture.target!.uid&&r.slotId===gesture.target!.slotId)!;
    const w=renderer.current!.screenToWorld(p),round=(v:number)=>snap?Math.round(v/32)*32:v;
    ui.drag({target:gesture.target,world:{...item.world,x:round(item.world.x+w.x-gesture.world.x),y:round(item.world.y+w.y-gesture.world.y)}});
  };
  const end=async(event:PointerEvent<HTMLCanvasElement>)=>{
    const surface=event.currentTarget,pointerId=event.pointerId;
    const gesture=drag.current;if(!gesture||gesture.pointer!==pointerId)return;
    try {
      const transient=useEditorUI.getState().transient;
      if(transient){
        const item=snapshot.representations.find(r=>r.uid===transient.target.uid&&r.slotId===transient.target.slotId);
        if(item&&(item.world.x!==transient.world.x||item.world.y!==transient.world.y)){
          const command=createTransformCommand(snapshot,transient.target,transient.world,crypto.randomUUID());onCommand(command);
          const result = await host.current.applyCommand(command);
          if (result.status === 'applied') {
            setNotice(`Comando aplicado pelo Host (rev. ${result.revision}).`);
          } else if (result.status === 'rejected') {
            setNotice(`Comando rejeitado pelo Host: ${result.reason}. Projeção original restaurada.`);
          } else if (result.status === 'transport-error') {
            setNotice(`Erro de transporte ao despachar comando (${result.commandId}): ${result.error}. Projeção original restaurada.`);
          } else {
            setNotice('Comando produzido; não enviado. Host desconectado. Projeção original restaurada.');
          }
        }
      }
    } catch(err) {
      setNotice(`Falha na execução do comando: ${err instanceof Error ? err.message : String(err)}. Projeção original restaurada.`);
    } finally {
      cleanupDrag(surface, pointerId);
    }
  };
  const reset=()=>{clock.current.reset();setPlaying(false);setFrame(0);};
  const togglePlay=()=>{if(clock.current.playing)clock.current.pause();else clock.current.play();setPlaying(clock.current.playing);};
  return <section className="scene-panel" data-od-id="scene-layout-view" aria-label="Scene Layout View">
    <div className="scene-tools" data-od-id="scene-toolbar">
      <div className="tool-group"><Tool id="select-tool" label="Selecionar e mover" active={!panTool} onClick={()=>setPanTool(false)}><MousePointer2 size={16}/></Tool><Tool id="pan-tool" label="Pan · botão do meio também move a câmera" active={panTool} onClick={()=>setPanTool(true)}><Hand size={16}/></Tool></div>
      <div className="tool-group"><Tool id="grid-toggle" label="Grid · 32 px" active={grid} onClick={()=>setGrid(!grid)}><Grid2X2 size={16}/></Tool><Tool id="snap-toggle" label="Snapping · 32 px" active={snap} onClick={()=>setSnap(!snap)}><Magnet size={16}/></Tool><Tool id="overlay-toggle" label="Bounds, collider, câmera e transform" active={overlays} onClick={()=>setOverlays(!overlays)}><Layers2 size={16}/></Tool></div>
      <div className="tool-group zoom-group"><Tool id="zoom-out" label="Diminuir zoom" onClick={()=>setCamera(c=>({...c,zoom:Math.max(0.1,c.zoom/1.2)}))}><Minus size={14}/></Tool><span className="mono zoom-value">{Math.round(camera.zoom*100)}%</span><Tool id="zoom-in" label="Aumentar zoom" onClick={()=>setCamera(c=>({...c,zoom:Math.min(4,c.zoom*1.2)}))}><Plus size={14}/></Tool><Tool id="fit-scene" label="Enquadrar cena" onClick={fit}><Scan size={16}/></Tool></div>
      <select data-od-id="sampling-select" aria-label="Sampling de texturas" className="sampling-select" value={sampling} onChange={e=>setSampling(e.target.value as 'point'|'linear')}><option value="point">Point</option><option value="linear">Linear</option></select>
    </div>
    <div className="scene-context" data-od-id="fixture-banner"><span className="fixture-dot"/><strong>FIXTURE DE VALIDAÇÃO</strong><span>Plataforma orbital</span><span className="mono context-version">rev. {snapshot.revision}</span></div>
    <div className="viewport" ref={viewport} data-od-id="editorial-viewport">
      <canvas ref={canvas} data-od-id="editorial-canvas" aria-label="Fixture editorial interativa. Clique para selecionar, arraste para proposta de comando, roda para zoom." tabIndex={0} className={panTool?'pan-cursor':''} onPointerDown={down} onPointerMove={move} onPointerUp={end} onPointerCancel={e=>cleanupDrag(e.currentTarget,e.pointerId)} onLostPointerCapture={e=>cleanupDrag(e.currentTarget,e.pointerId)} onWheel={e=>{e.preventDefault();const p={x:e.clientX-e.currentTarget.getBoundingClientRect().left,y:e.clientY-e.currentTarget.getBoundingClientRect().top};const b=e.currentTarget.getBoundingClientRect();const ratio=Math.exp(-e.deltaY*0.001);setCamera(c=>{const zoom=Math.max(0.1,Math.min(4,c.zoom*ratio)),k=zoom/c.zoom;return{zoom,x:(1-k)*(p.x-b.width/2)+k*c.x,y:(1-k)*(p.y-b.height/2)+k*c.y};});}} onKeyDown={e=>{if(e.key==='Escape'){cleanupDrag(e.currentTarget as HTMLCanvasElement);}if(e.key===' '){e.preventDefault();togglePlay();}}}/>
      {!ready&&!error&&<div className="viewport-message">Preparando renderer editorial…</div>}
      {error&&<div className="viewport-message error"><AlertTriangle size={24}/><strong>Renderer indisponível</strong><p>{error}</p><p>Seleção e diagnósticos continuam disponíveis no explorador.</p></div>}
      <div className="viewport-caption"><span className="mono">768 × 480</span><span>1 chunk ortogonal</span></div>
    </div>
    <div className="preview-controls" data-od-id="preview-controls"><div className="playback-group">
      <Tool id="preview-reset" label="Reset · descartar preview" onClick={reset}><SkipBack size={16}/></Tool>
      <Tool id="preview-play" label={playing?'Pause · preview visual':'Play · preview visual'} primary onClick={togglePlay} disabled={!ready}>{playing?<Pause size={16}/>:<Play size={16}/>}</Tool>
      <Tool id="preview-pause" label="Pause" onClick={()=>{clock.current.pause();setPlaying(false);}}><Pause size={16}/></Tool>
      <Tool id="preview-step" label="Step · um frame visual" onClick={()=>{clock.current.step();setPlaying(false);setFrame(clock.current.frame);}}><SkipForward size={16}/></Tool>
    </div><span className="mono frame-counter">{String(frame).padStart(5,'0')}<small>FRAME · 60 Hz</small></span><div className="preview-toggles"><Toggle id="particles-toggle" label="Partículas" checked={particles} onChange={setParticles}/><Toggle id="shaders-toggle" label="Shaders" checked={shaders} onChange={v=>{setShaders(v);if(v)setNotice('Shaders: apenas descritor seguro de pulso. MGFX mantém material base.');}}/><Toggle id="screen-effects-toggle" label="Tela" checked={screenEffects} onChange={setScreenEffects}/></div>
    </div>
    <div className="scene-footer"><span data-od-id="command-status" role="status">{notice}</span><details className="preview-options"><summary>Preview</summary><div><Toggle id="discard-on-blur" label="Descartar ao perder foco" checked={discardOnBlur} onChange={setDiscardOnBlur}/><p>Seed 23023 · 96 partículas no total<br/>Clock descartado ao fechar a aba</p><Button onClick={reset}><RotateCcw size={14}/>Reiniciar estado visual</Button></div></details></div>
  </section>;
}

