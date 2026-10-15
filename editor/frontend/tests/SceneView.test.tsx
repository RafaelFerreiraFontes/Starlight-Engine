// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import * as Tooltip from '@radix-ui/react-tooltip';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SceneView } from '../src/scene/SceneView';
import { fixtureScene, initialSelection } from '../src/fixtures/scene';
import { useEditorUI } from '../src/scene/store';
import type { Diagnostic, EditorialSceneSnapshot, IEditorialSceneRenderer, RendererFactory } from '../src/rendering/contracts';
import type { HostCommandPort, TransformCommand } from '../src/host/commands';
let root:Root,container:HTMLDivElement;
let frameCallback:FrameRequestCallback|undefined;
let captured=false;
const release=vi.fn(()=>{captured=false;});
const dispose=vi.fn();
const reports: (readonly Diagnostic[])[]=[];
const commands:TransformCommand[]=[];
const renderer:IEditorialSceneRenderer={
  mount:async()=>{},resize:()=>{},dispose,
  hitTest:()=>initialSelection,screenToWorld:p=>p,
  render:(_snapshot,_view,preview)=>({context:'ready',diagnostics:preview.screenEffects?[{status:'Approximate',code:'screen.preview',message:'safe screen preview'}]:[]}),
};
const factory:RendererFactory=()=>renderer;
async function mount(snapshot:EditorialSceneSnapshot=fixtureScene, hostPort?: HostCommandPort){
  await act(async()=>root.render(<Tooltip.Provider><SceneView snapshot={snapshot} createRenderer={factory} onDiagnostics={onDiagnostics} onCommand={onCommand} hostPort={hostPort}/></Tooltip.Provider>));
}
const onDiagnostics=(d:readonly Diagnostic[])=>reports.push(d);
const onCommand=(c:TransformCommand)=>commands.push(c);
async function tick(time=16){await act(async()=>{const callback=frameCallback;frameCallback=undefined;callback?.(time);});}
function pointer(type:string,x:number,y:number){
  const e=new MouseEvent(type,{bubbles:true,clientX:x,clientY:y,button:0});Object.defineProperty(e,'pointerId',{value:1});
  container.querySelector('canvas')!.dispatchEvent(e);
}
beforeEach(()=>{
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);
  vi.stubGlobal('ResizeObserver',class{observe(){}disconnect(){}});
  vi.stubGlobal('requestAnimationFrame',(callback:FrameRequestCallback)=>{frameCallback=callback;return 1;});
  vi.stubGlobal('cancelAnimationFrame',()=>{frameCallback=undefined;});
  vi.spyOn(HTMLElement.prototype,'getBoundingClientRect').mockReturnValue({x:0,y:0,left:0,top:0,right:800,bottom:600,width:800,height:600,toJSON:()=>({})});
  HTMLCanvasElement.prototype.setPointerCapture=()=>{captured=true;};
  HTMLCanvasElement.prototype.hasPointerCapture=()=>captured;
  HTMLCanvasElement.prototype.releasePointerCapture=release;
  useEditorUI.setState({selection:initialSelection,transient:undefined,hiddenLayers:[],lockedLayers:['structure']});
  container=document.createElement('div');document.body.appendChild(container);root=createRoot(container);
  reports.length=0;commands.length=0;captured=false;dispose.mockClear();release.mockClear();
});
afterEach(async()=>{await act(async()=>root.unmount());container.remove();vi.restoreAllMocks();vi.unstubAllGlobals();});
describe('Scene/Layout View consumes abstract renderer without Host or GPU',()=>{
  it('commits once on pointerup, survives async delivery and restores immutable state',async()=>{
    await mount();await tick();const before=JSON.stringify(fixtureScene);
    await act(async()=>pointer('pointerdown',360,220));
    await act(async()=>pointer('pointermove',392,252));
    expect(commands).toHaveLength(0);expect(useEditorUI.getState().transient).toBeDefined();
    await act(async()=>pointer('pointerup',392,252));
    expect(commands).toHaveLength(1);expect(commands[0].params.expectedRevision).toBe(1);
    expect(release).toHaveBeenCalledWith(1);expect(captured).toBe(false);
    expect(useEditorUI.getState().transient).toBeUndefined();expect(JSON.stringify(fixtureScene)).toBe(before);
    expect(container.querySelector('[data-od-id="command-status"]')!.textContent).toContain('não enviado');
  });
  it('blocks movement with a parent and displays its diagnostic',async()=>{
    const snapshot={...fixtureScene,representations:fixtureScene.representations.map(r=>r.uid===initialSelection.uid?{...r,parent:{uid:'instance:parent' as const,slotId:'parent:transform'}}:r)};
    await mount(snapshot);await tick();
    await act(async()=>{pointer('pointerdown',360,220);pointer('pointermove',392,252);pointer('pointerup',392,252);});
    expect(commands).toHaveLength(0);expect(useEditorUI.getState().transient).toBeUndefined();
    expect(container.querySelector('[data-od-id="command-status"]')!.textContent).toContain('movimento bloqueado');
    expect(captured).toBe(false);
  });
  it('removes screen diagnostics when its toggle is turned off',async()=>{
    await mount();await tick();
    const toggle=container.querySelector('[data-od-id="screen-effects-toggle"]')!;
    await act(async()=>toggle.dispatchEvent(new MouseEvent('click',{bubbles:true})));await tick(32);
    expect(reports.at(-1)?.some(d=>d.code==='screen.preview')).toBe(true);
    await act(async()=>toggle.dispatchEvent(new MouseEvent('click',{bubbles:true})));await tick(48);
    expect(reports.at(-1)?.some(d=>d.code==='screen.preview')).toBe(false);
  });
  it('discards preview on blur and releases renderer on tab closure',async()=>{
    await mount();await tick();
    await act(async()=>container.querySelector('[data-od-id="preview-step"]')!.dispatchEvent(new MouseEvent('click',{bubbles:true})));
    expect(container.querySelector('.frame-counter')!.textContent).toContain('00001');
    await act(async()=>window.dispatchEvent(new Event('blur')));
    expect(container.querySelector('.frame-counter')!.textContent).toContain('00000');
    await act(async()=>root.render(<div/>));expect(dispose).toHaveBeenCalledOnce();expect(frameCallback).toBeUndefined();
  });
  it('guarantees cleanup on pointerup via finally when hostPort throws an exception', async () => {
    const errorHost: HostCommandPort = {
      applyCommand: vi.fn(async () => { throw new Error('Network transport crash'); }),
    };
    await mount(fixtureScene, errorHost); await tick();
    await act(async () => pointer('pointerdown', 360, 220));
    await act(async () => pointer('pointermove', 392, 252));
    expect(useEditorUI.getState().transient).toBeDefined();
    expect(captured).toBe(true);
    await act(async () => pointer('pointerup', 392, 252));
    expect(release).toHaveBeenCalledWith(1);
    expect(captured).toBe(false);
    expect(useEditorUI.getState().transient).toBeUndefined();
    expect(container.querySelector('[data-od-id="command-status"]')!.textContent).toContain('Network transport crash');
    expect(container.querySelector('[data-od-id="command-status"]')!.textContent).toContain('Projeção original restaurada');
  });
  it('guarantees cleanup on pointerup via finally when hostPort returns rejected status', async () => {
    const rejectHost: HostCommandPort = {
      applyCommand: vi.fn(async () => ({ status: 'rejected' as const, reason: 'Revisão obsoleta' })),
    };
    await mount(fixtureScene, rejectHost); await tick();
    await act(async () => pointer('pointerdown', 360, 220));
    await act(async () => pointer('pointermove', 392, 252));
    expect(captured).toBe(true);
    await act(async () => pointer('pointerup', 392, 252));
    expect(release).toHaveBeenCalledWith(1);
    expect(captured).toBe(false);
    expect(useEditorUI.getState().transient).toBeUndefined();
    expect(container.querySelector('[data-od-id="command-status"]')!.textContent).toContain('Comando rejeitado pelo Host: Revisão obsoleta');
  });
  it('updates revision notice and cleans up drag when hostPort returns applied status', async () => {
    const appliedHost: HostCommandPort = {
      applyCommand: vi.fn(async () => ({ status: 'applied' as const, revision: 42 })),
    };
    await mount(fixtureScene, appliedHost); await tick();
    await act(async () => pointer('pointerdown', 360, 220));
    await act(async () => pointer('pointermove', 392, 252));
    expect(captured).toBe(true);
    await act(async () => pointer('pointerup', 392, 252));
    expect(release).toHaveBeenCalledWith(1);
    expect(captured).toBe(false);
    expect(useEditorUI.getState().transient).toBeUndefined();
    expect(container.querySelector('[data-od-id="command-status"]')!.textContent).toContain('Comando aplicado pelo Host (rev. 42)');
  });
  it('cleans up drag and releases pointer capture when pointercancel fires', async () => {
    await mount(); await tick();
    await act(async () => pointer('pointerdown', 360, 220));
    await act(async () => pointer('pointermove', 392, 252));
    expect(captured).toBe(true);
    expect(useEditorUI.getState().transient).toBeDefined();
    await act(async () => pointer('pointercancel', 392, 252));
    expect(release).toHaveBeenCalledWith(1);
    expect(captured).toBe(false);
    expect(useEditorUI.getState().transient).toBeUndefined();
  });
});
