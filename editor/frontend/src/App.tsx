import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { DockviewReact, themeDark, type DockviewApi, type DockviewReadyEvent } from 'dockview-react';
import * as Tooltip from '@radix-ui/react-tooltip';
import { Box, ChevronDown, ChevronRight, Circle, Code2, Eye, EyeOff, FileBox, Folder, Layers, LockKeyhole, PanelLeft, Search, SlidersHorizontal, Sparkles, Unplug, UnlockKeyhole, X, Check, TriangleAlert, ExternalLink, PanelTop, RotateCcw } from 'lucide-react';
import { fixtureScene, initialSelection, fixtureAsset } from './fixtures/scene';
import atlasURL from './fixtures/atlas';
import { PixiEditorialRenderer } from './rendering/pixi/PixiEditorialRenderer';
import type { Diagnostic, RendererFactory, Support } from './rendering/contracts';
import { diagnose, sameHit } from './rendering/scene';
import { useEditorUI } from './scene/store';
import { SceneView } from './scene/SceneView';
import { translationGestureDiagnostic, type TransformCommand } from './host/commands';
import { Button } from './components/ui/button';
import { Tool } from './components/ui/controls';
const createRenderer:RendererFactory=onDiagnostic=>new PixiEditorialRenderer([{ref:fixtureAsset,url:atlasURL,width:128,height:32}],onDiagnostic);
const defaultDiagnostics=fixtureScene.representations.map(r=>diagnose(r,r.name!=='Asset ausente'));
interface ShellState { fixture:boolean; setFixture:(value:boolean)=>void; diagnostics:readonly Diagnostic[]; onDiagnostics:(d:readonly Diagnostic[])=>void; command?:TransformCommand; onCommand:(c:TransformCommand)=>void }
const Shell=createContext<ShellState>(null!);
const useShell=()=>useContext(Shell);
function Badge({status}:{status:Support}) {return <span data-od-id={`badge-${status.toLowerCase()}`} className={`badge badge-${status}`}><span/>{status}</span>;}
function Empty({title,children,icon=<Unplug size={28}/>}:{title:string;children:ReactNode;icon?:ReactNode}) {return <div className="empty-state" data-od-id="disconnected-empty-state">{icon}<h2>{title}</h2><p>{children}</p></div>;}
function ScenePanel() {
  const s=useShell();
  return s.fixture?<SceneView snapshot={fixtureScene} createRenderer={createRenderer} onDiagnostics={s.onDiagnostics} onCommand={s.onCommand}/>:<Empty title="Nenhum layout aberto">O Host .NET ainda não está implementado. Abra a fixture pelo menu Workspace para explorar o renderer editorial.</Empty>;
}
function ProjectPanel() {
  const s=useShell(),ui=useEditorUI(),[search,setSearch]=useState('');
  return <div className="project-panel pane-content" data-od-id="project-explorer"><div className="pane-kicker">WORKSPACE <span className="mono">LOCAL</span></div>
    <label className="search-field"><Search size={14}/><input data-od-id="explorer-search" placeholder="Filtrar representações…" aria-label="Filtrar representações da fixture" value={search} onChange={e=>setSearch(e.target.value)}/></label>
    <div className="host-empty"><Unplug size={15}/><div><strong>Host desconectado</strong><span>Nenhum projeto carregado</span></div></div>
    {s.fixture&&<><div className="tree-heading"><ChevronDown size={13}/><Folder size={14}/><strong>Fixture editorial</strong><span className="count">{fixtureScene.representations.length}</span></div>
    <div className="tree-section"><ChevronDown size={12}/><FileBox size={14}/><span>Plataforma orbital</span></div>
    <div className="representation-list" role="list" aria-label="Representações da fixture">{fixtureScene.representations.filter(r=>r.name.toLocaleLowerCase().includes(search.toLocaleLowerCase())).map((r,i)=><button type="button" role="listitem" className={`tree-item ${sameHit(ui.selection,r)?'selected':''}`} data-od-id={`representation-${i+1}`} key={`${r.uid}:${r.slotId}`} onClick={()=>ui.select({uid:r.uid,slotId:r.slotId})}>{r.kind==='tileChunk'?<Layers size={13}/>:r.kind==='particles'?<Sparkles size={13}/>:r.kind==='text'?<Code2 size={13}/>:<Box size={13}/>}<span>{r.name.split(' · ')[0]}</span>{r.material.kind==='mgfx'||r.material.kind==='csharp'||r.name==='Asset ausente'?<span className="warning-dot"/>:null}</button>)}</div>
    {search&&!fixtureScene.representations.some(r=>r.name.toLocaleLowerCase().includes(search.toLocaleLowerCase()))&&<p className="no-results">Nenhuma representação encontrada.</p>}
    <div className="fixture-note"><span className="micro-label">CENA DE TESTE</span><p>Dados procedurais imutáveis.<br/>Não pertencem a um projeto.</p></div></>}
    <div className="project-bottom"><div><Code2 size={14}/><span>Event Sheets e scripts</span></div><p>Disponíveis após integração do Host.</p></div>
  </div>;
}
function LayersPanel(){const s=useShell(),ui=useEditorUI();return <div className="pane-content layers-panel" data-od-id="layers-panel"><div className="pane-kicker">ORDEM DE DESENHO <span className="mono">Z ↑</span></div>{s.fixture?[...fixtureScene.layers].reverse().map(l=><div className="layer-row" data-od-id={`layer-${l.id}`} key={l.id}><Layers size={13}/><span>{l.name}</span><Tool id={`visibility-${l.id}`} label={`${ui.hiddenLayers.includes(l.id)?'Mostrar':'Ocultar'} ${l.name}`} active={!ui.hiddenLayers.includes(l.id)} onClick={()=>ui.toggleLayer('hiddenLayers',l.id)}>{ui.hiddenLayers.includes(l.id)?<EyeOff size={14}/>:<Eye size={14}/>}</Tool><Tool id={`lock-${l.id}`} label={`${ui.lockedLayers.includes(l.id)?'Desbloquear':'Bloquear'} ${l.name}`} active={ui.lockedLayers.includes(l.id)} onClick={()=>ui.toggleLayer('lockedLayers',l.id)}>{ui.lockedLayers.includes(l.id)?<LockKeyhole size={13}/>:<UnlockKeyhole size={13}/>}</Tool></div>):<p className="no-results">Nenhuma camada carregada.</p>}<p className="layer-note">Visibilidade e bloqueio são locais.<br/>A ordem vem do snapshot.</p></div>;}
function InspectorPanel(){
  const s=useShell(),ui=useEditorUI(),item=s.fixture?fixtureScene.representations.find(r=>sameHit(r,ui.selection)):undefined;
  if(!item)return <Empty title="Nenhuma seleção" icon={<SlidersHorizontal size={24}/>}>Selecione uma representação no viewport ou no explorador para inspecionar a projeção.</Empty>;
  const d=s.diagnostics.find(d=>sameHit(d as {uid: typeof item.uid;slotId:string},item))??diagnose(item,item.name!=='Asset ausente');
  const t=ui.transient&&sameHit(ui.transient.target,item)?ui.transient.world:item.world;
  return <div className="inspector pane-content" data-od-id="inspector"><div className="inspector-title"><div className="object-icon"><Box size={22}/></div><div><h1 data-od-id="selected-object-heading">{item.name.split(' · ')[0]}</h1><p>{item.kind} <span> / </span> {item.slotId}</p></div></div><Badge status={d.status}/>
    {d.status!=='Supported'&&<div className="context-warning" data-od-id="representation-warning"><TriangleAlert size={16}/><p>{d.message}</p></div>}
    <section className="inspector-section" data-od-id="transform-section"><h2>Transform <span className="micro-label">WORLD</span></h2><div className="field-grid"><ReadValue label="X" value={t.x.toFixed(1)}/><ReadValue label="Y" value={t.y.toFixed(1)}/><ReadValue label="W" value={item.bounds.width}/><ReadValue label="H" value={item.bounds.height}/><ReadValue label="Rotação" value={`${(t.rotation*180/Math.PI).toFixed(1)}°`}/><ReadValue label="Z" value={item.z}/></div><p className="field-hint">{translationGestureDiagnostic(item)?.message??'Gesto de translação de raiz; local = world. Sem Host, alterações não são gravadas.'}</p></section>
    <section className="inspector-section" data-od-id="representation-section"><h2>Representação</h2><dl className="properties"><dt>Camada</dt><dd>{fixtureScene.layers.find(l=>l.id===item.layerId)?.name}</dd><dt>Material</dt><dd>{item.material.kind}</dd><dt>Blending</dt><dd>{item.material.blend}</dd><dt>Opacidade</dt><dd>{Math.round(item.material.opacity*100)}%</dd></dl>{item.animation&&<div className="animation-strip" aria-label="Quatro frames do atlas de validação"><img src={atlasURL} width="128" height="32" alt="Atlas procedural de calibração com oito tiles e quatro frames da sonda"/><span>4 frames · 8 fps</span></div>}</section>
    <details className="inspector-section identity-section" open><summary>Identidade persistente</summary><dl><dt>Instance UID</dt><dd className="mono">{item.uid}</dd><dt>Component slot</dt><dd className="mono">{item.slotId}</dd>{item.atlas&&<><dt>AssetGuid · revisão</dt><dd className="mono">{item.atlas.asset.guid}<br/>{item.atlas.asset.revision}</dd></>}</dl></details>
    <div className="inspector-foot"><LockKeyhole size={12}/><span>Projeção somente leitura · rev. {fixtureScene.revision}</span></div>
  </div>;
}
function ReadValue({label,value}:{label:string;value:string|number}){return <div className="read-value"><span>{label}</span><output className="mono">{value}</output></div>;}
function ConsolePanel(){
  const s=useShell(),[filter,setFilter]=useState<'warnings'|'all'|'command'>('warnings');
  const warnings=s.diagnostics.filter(d=>d.status!=='Supported');
  const rows=filter==='all'?s.diagnostics:warnings;
  return <section className="console-panel" data-od-id="diagnostics-panel"><div className="console-toolbar"><div className="console-filters"><Button data-od-id="filter-warnings" size="small" className={filter==='warnings'?'tab-active':''} onClick={()=>setFilter('warnings')}>Diagnósticos <span className="count">{warnings.length}</span></Button><Button data-od-id="filter-all" size="small" className={filter==='all'?'tab-active':''} onClick={()=>setFilter('all')}>Representações</Button><Button data-od-id="filter-command" size="small" className={filter==='command'?'tab-active':''} onClick={()=>setFilter('command')}>Comando local {s.command&&<Circle size={7} fill="currentColor"/>}</Button></div><span className="micro-label console-source">EDITORIAL · SEM LOGS DO HOST</span></div>
    <div className="console-body">{filter==='command'?s.command?<div className="command-preview"><p>Proposta produzida no pointerup · <strong>não enviada</strong> · nenhuma persistência</p><pre data-od-id="command-payload">{JSON.stringify(s.command,null,2)}</pre></div>:<p className="no-results">Arraste uma representação para produzir uma proposta transacional. O snapshot permanecerá intacto.</p>:s.fixture?<div className="diagnostic-table" role="table" aria-label="Diagnósticos por representação"><div className="diagnostic-header" role="row"><span>REPRESENTAÇÃO</span><span>SUPORTE</span><span>DETALHE</span></div>{rows.map((d,i)=>{const item=fixtureScene.representations.find(r=>r.uid===d.uid&&r.slotId===d.slotId);return <button role="row" data-od-id={`diagnostic-${i}`} key={`${d.uid}:${d.slotId}:${d.code}`} className="diagnostic-row" onClick={()=>{if(item)useEditorUI.getState().select(item);}}><span>{d.status==='Supported'?<Check size={13}/>:<TriangleAlert size={13}/>}<span>{item?.name.split(' · ')[0]??'WebGL'}</span></span><Badge status={d.status}/><span className="diagnostic-message">{d.message}</span></button>;})}</div>:<p className="no-results">Nenhuma sessão do Host. Logs de build e do Player aparecerão após integração real.</p>}</div>
  </section>;
}
function EventsPanel(){return <Empty title="Nenhuma Event Sheet carregada" icon={<Code2 size={28}/>}>O frontend não executa ações, física ou scripts. O catálogo e a AST dependem do Host .NET; este painel preserva esse limite.</Empty>;}
const panels={scene:ScenePanel,project:ProjectPanel,layers:LayersPanel,inspector:InspectorPanel,console:ConsolePanel,events:EventsPanel};
const LAYOUT_KEY='starlight.prototype.dockview.v1';
function initialize(api:DockviewApi){
  api.clear();
  api.addPanel({id:'scene',component:'scene',title:'Plataforma orbital · Layout'});
  if(window.innerWidth<=700){
    for(const [id,title] of [['project','Explorador'],['layers','Camadas'],['inspector','Inspector'],['events','Event Sheets']])api.addPanel({id,component:id,title,position:{referencePanel:'scene',direction:'within'}});
    api.addPanel({id:'console',component:'console',title:'Diagnósticos',position:{referencePanel:'scene',direction:'below'},initialHeight:300,minimumHeight:180});
    api.getPanel('scene')?.api.setActive();return;
  }
  api.addPanel({id:'project',component:'project',title:'Explorador',position:{referencePanel:'scene',direction:'left'},initialWidth:226,minimumWidth:190});
  api.addPanel({id:'layers',component:'layers',title:'Camadas',position:{referencePanel:'project',direction:'below'},initialHeight:250,minimumHeight:180});
  api.addPanel({id:'inspector',component:'inspector',title:'Inspector',position:{referencePanel:'scene',direction:'right'},initialWidth:280,minimumWidth:230});
  api.addPanel({id:'console',component:'console',title:'Diagnósticos',position:{referencePanel:'scene',direction:'below'},initialHeight:218,minimumHeight:150});
  api.addPanel({id:'events',component:'events',title:'Event Sheets',position:{referencePanel:'scene',direction:'within'}});
  api.getPanel('scene')?.api.setActive();
}
export default function App(){
  const [fixture,setFixtureValue]=useState(true),[diagnostics,setDiagnostics]=useState<readonly Diagnostic[]>(defaultDiagnostics),[command,onCommand]=useState<TransformCommand>();
  const api=useRef<DockviewApi>(),[layoutNote,setLayoutNote]=useState('');
  // Every render report is a complete current set, never an append-only log.
  const onDiagnostics=useCallback((incoming:readonly Diagnostic[])=>setDiagnostics([...incoming]),[]);
  const setFixture=useCallback((value:boolean)=>{setFixtureValue(value);onCommand(undefined);setDiagnostics(value?defaultDiagnostics:[]);useEditorUI.setState({selection:value?initialSelection:undefined,transient:undefined,hiddenLayers:[],lockedLayers:['structure']});},[]);
  const onReady=useCallback(({api:readyApi}:DockviewReadyEvent)=>{
    api.current=readyApi;
    try{const saved=localStorage.getItem(LAYOUT_KEY);if(saved&&window.innerWidth>700)readyApi.fromJSON(JSON.parse(saved));else initialize(readyApi);}catch{initialize(readyApi);}
    useEditorUI.getState().select(initialSelection);
    const subscription=readyApi.onDidLayoutChange(()=>{try{localStorage.setItem(LAYOUT_KEY,JSON.stringify(readyApi.toJSON()));}catch{setLayoutNote('Preferência local indisponível');}});
    readyApi.onDidRemovePanel(p=>{if(p.id==='scene')useEditorUI.getState().drag(undefined);});
    return()=>subscription.dispose();
  },[]);
  return <Tooltip.Provider delayDuration={300}><Shell.Provider value={{fixture,setFixture,diagnostics,onDiagnostics,command,onCommand}}><main className="app-shell" data-od-id="starlight-editor-shell">
    <header className="app-header" data-od-id="main-header"><div className="brand-mark" aria-hidden="true"><svg width="24" height="24" viewBox="0 0 24 24"><path d="M12 2L14.5 9.5 22 12 14.5 14.5 12 22 9.5 14.5 2 12 9.5 9.5Z" fill="currentColor"/></svg></div><span className="brand">starlight<span>ENGINE</span></span><span className="header-divider"/><details className="workspace-menu" data-od-id="workspace-menu"><summary>Workspace<ChevronDown size={12}/></summary><div className="menu-content"><Button data-od-id="load-fixture" onClick={()=>{setFixture(true);api.current?.getPanel('scene')?.api.setActive();if(!api.current?.getPanel('scene')&&api.current)initialize(api.current);}}>Abrir fixture de validação</Button><Button data-od-id="close-fixture" onClick={()=>setFixture(false)}>Fechar fixture</Button><Button data-od-id="reset-workspace" onClick={()=>{if(api.current)initialize(api.current);}}>Restaurar painéis</Button></div></details><span className="header-path">Editor <ChevronRight size={12}/> Layout</span><div className="header-right"><span className="proposed-label">ADR-SL-023 <strong>Proposed</strong></span><span className="host-status"><Unplug size={13}/>Host desconectado</span></div></header>
    <div className="workspace-bar" data-od-id="workspace-bar"><div className="workspace-title"><PanelTop size={16}/><strong>Layout editorial</strong><span>PROTÓTIPO</span></div><div className="workspace-actions"><span>Preview visual · sem gameplay</span><Button size="small" data-od-id="restore-panels" onClick={()=>{if(api.current)initialize(api.current);}}><RotateCcw size={13}/>Restaurar painéis</Button><Button data-od-id="player-disabled" size="small" disabled title="O Host e o Development Player ainda não existem"><ExternalLink size={13}/>Development Player</Button></div></div>
    <div className="dock-area" data-od-id="docking-workspace"><DockviewReact theme={themeDark} components={panels} onReady={onReady} disableFloatingGroups className="starlight-dock"/></div>
    <footer className="status-bar" data-od-id="status-bar"><div><span className="status-square"/><span>{fixture?'Fixture de validação':'Sem projeto'}</span><span className="status-separator"/><span>PixiJS / WebGL · candidato</span></div><div><span>{layoutNote||'Layout dos painéis salvo apenas neste navegador'}</span><span className="status-separator"/><span className="mono">snapshot v1</span></div></footer>
  </main></Shell.Provider></Tooltip.Provider>;
}
