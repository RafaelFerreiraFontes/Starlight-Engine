# Starlight Editor Frontend — Arquitetura e Guia de Implementação

**Escopo:** `editor/frontend/`, inspecionado em 15/10/2026. Este guia descreve o protótipo versionado e orienta M1–M4. Os contratos de `src/rendering/contracts.ts` e `src/host/commands.ts` são **candidatos locais**, não DTOs gerados e aprovados do Host. `ADR-SL-023` continua **Proposed / Pending Approval**; a validação do protótipo não congela PixiJS como backend. Em caso de divergência normativa, prevalecem o [registro de decisões](Quest%C3%B5es%20em%20Aberto%20-%20Decis%C3%B5es.md), os documentos 00–09 e as [instruções do projeto](../.github/instructions/project.instructions.md). Consulte também o [relatório de validação ADR-SL-023](ADR-SL-023_Editorial_Renderer_Validation_Report.md).

## 1. Papel arquitetural e estado atual

```text
Camada 1  Tauri 2 (shell) + React/TypeScript (Authoring UI)
          Dockview, controles, seleção, projeções e preview visual
                  | futuro WebSocket JSON-RPC tipado, token de sessão
                  v
Camada 2  Starlight.Editor.Host (.NET) — ProjectModel, comandos,
          Undo/Redo, arquivos canônicos, assets, compilação e build
                  | projeção/build; processo separado
                  v
Camada 3  Starlight.Runtime + MonoGame — gameplay e Player exportável
```

Esta é a separação aprovada em ADR-SL-001/002/003/012/013/014. A UI não executa gameplay, física ou scripts C#, não importa tipos MonoGame e não grava diretamente `.layout`, `.level` ou outros arquivos canônicos. Zustand só guarda estado efêmero; o Host será a autoridade do projeto. O Tauri deve administrar o sidecar e janelas, sem desserializar o domínio. O executável exportado deve ser independente de React/Tauri/Host.

**Implementado:** shell React/Vite de fixture procedural, Dockview, controles densos, seleção e arrasto de translação de instância raiz, proposta de comando, renderer Pixi isolado, preview visual determinístico, carregamento incremental de atlas, diagnósticos, telemetria e testes Vitest. **Pendente:** Tauri, Host .NET, cliente RPC real, persistência canônica, Inspector por schema, Monaco, Event Sheet funcional, Level Editor e equivalência visual MonoGame. O `DisconnectedHostPort` retorna desconexão explícita; nenhuma resposta do Host é simulada. O [relatório ADR-SL-023](ADR-SL-023_Editorial_Renderer_Validation_Report.md) lista as evidências e gates de GPU/WebView/fidelidade ainda pendentes.

## 2. Mapa de módulos

```text
editor/frontend/
├── README.md                 execução, limites e fixture
├── brand-spec.md             direção visual e tokens
├── index.html                root React, lang pt-BR, classe dark
├── package.json              scripts e dependências
├── pnpm-lock.yaml            versões resolvidas
├── pnpm-workspace.yaml       configuração pnpm/PowerShell
├── tsconfig.json             TS strict, ES2022, sem emissão
├── vite.config.ts            React, Tailwind, single-file, saída em cache
├── vitest.config.ts          testes run, um worker, sem watch
├── scripts/
│   ├── audit-editorial.mjs   auditoria estática de fronteiras
│   └── generate-atlas.py     gera atlas procedural incorporado
├── src/
│   ├── main.tsx              monta App e CSS Dockview/local
│   ├── App.tsx               composição, painéis e layout Dockview
│   ├── styles.css            tokens, densidade, estados responsivos
│   ├── components/ui/
│   │   ├── button.tsx        Button com CVA, Radix Slot, clsx/merge
│   │   └── controls.tsx      Tool com Tooltip e Toggle com Switch
│   ├── fixtures/
│   │   ├── atlas.ts          PNG embutido como data URL
│   │   ├── calibration-atlas.png referência raster 128 × 32
│   │   └── scene.ts          snapshot congelado e validado
│   ├── host/commands.ts      porta e proposta transacional candidata
│   ├── rendering/
│   │   ├── contracts.ts      DTOs e interface neutros de renderer
│   │   ├── scene.ts          validação, ordem, hit test, diagnóstico
│   │   ├── PreviewClock.ts   relógio visual de passo fixo
│   │   ├── temp_test.txt     arquivo auxiliar; não é contrato
│   │   └── pixi/
│   │       ├── OwnedAssets.ts propriedade/ciclo de vida de recursos
│   │       └── PixiEditorialRenderer.ts adapter WebGL/PixiJS
│   └── scene/
│       ├── SceneView.tsx      canvas, gestos, controles e preview
│       └── store.ts          seleção, drag, camadas efêmeras
└── tests/
    ├── editorial.test.ts     contratos puros/clock/comandos
    ├── assets.test.ts        ownership e corridas assíncronas
    ├── PixiEditorialRenderer.test.ts adapter Pixi com GPU simulada
    └── SceneView.test.tsx    interação React com renderer abstrato
```

`temp_test.txt` é auxiliar e não deve ser importado ou usado para inferir um contrato. `calibration-atlas.png` e `atlas.ts` representam a mesma fixture local; `generate-atlas.py` reproduz o módulo incorporado. O `vite.config.ts` escreve a build em `%LOCALAPPDATA%/Starlight/editorial-builds/<hash-da-pasta>/`, usando `tmpdir()` como fallback, e `vite-plugin-singlefile` incorpora JS/CSS/atlas. Essa saída é artefato de build, não persistência de projeto.

## 3. Design system e workspace

`brand-spec.md`, `index.html` e `styles.css` adotam dark mode, densidade de IDE, divisórias finas e painéis redimensionáveis. Os tokens dark principais são `--bg: oklch(16% 0.012 250)`, `--surface: oklch(20% 0.012 250)`, `--fg: oklch(94% 0.006 240)`, `--muted: oklch(73% 0.018 240)`, `--border: oklch(30% 0.012 240)` e `--accent: oklch(76% 0.16 145)`; há ainda `--raised`, `--hover`, `--selected`, `--warning`, `--danger` e `--on-accent`. Corpo usa pilha system/Inter/Segoe UI; dados monoespaçados usam JetBrains Mono/IBM Plex Mono/fallback. Verde marca seleção e ação de preview; âmbar marca fallback. Preserve foco visível, hover, números tabulares e responsividade de 700/1050/1600 px.

`Support` em `src/rendering/contracts.ts` distingue `Supported`, `Approximate`, `UnsupportedFallback`, `MissingAssetPlaceholder` e `LoadingAssetPlaceholder`. `App.tsx` exibe o badge e o detalhe no Inspector/Console. `diagnose()` em `src/rendering/scene.ts` prioriza asset ausente/em carga, depois material MGFX/C#, depois efeitos aproximados; não afirme fidelidade MonoGame por um badge `Supported`, que significa apenas suporte ao subconjunto editorial.

`App.tsx` registra `scene`, `project`, `layers`, `inspector`, `console` e `events` no mapa `panels`. `initialize(api)` monta divisões desktop e abas compactas em largura até 700 px. Scene/Layout é a fixture; Event Sheets é estado vazio; Project Explorer filtra representações da fixture; Inspector lê a projeção e o transform transitório; Console mostra diagnósticos e proposta local, sem logs do Host. `DockviewReact` usa `themeDark`, `onReady` e `disableFloatingGroups`. Hoje `toJSON()/fromJSON()` persistem na chave `starlight.prototype.dockview.v1` de `localStorage`, apenas no navegador; no produto, encaminhe a preferência de usuário para `.starlight/editor/dockview.json` conforme ADR-SL-001. Não serialize snapshot, comando ou preview como preferência. Para novo painel, criar componente, registrá-lo no mapa, acrescentar `api.addPanel` na disposição desktop/compacta e testar restauração de layout, inclusive layouts salvos antigos.

`Button` em `src/components/ui/button.tsx` combina CVA (`variant`: default/secondary/ghost; `size`: default/icon/small), `Slot` opcional e `forwardRef`; `controls.tsx` compõe `Tool` acessível com tooltip/`aria-pressed` e `Toggle` com Radix Switch. Reutilize esses controles e tokens antes de criar estilos locais.

## 4. Estado efêmero e ciclo de interação

`fixtureScene` em `src/fixtures/scene.ts` é `EditorialSceneSnapshot` readonly, passa por `freezeSnapshot()` recursivo e `validateSnapshot()`. O snapshot é projeção recebida, não propriedade do Zustand. `useEditorUI` (`src/scene/store.ts`) contém apenas `selection?: Hit`, `transient?: {target: Hit; world: Transform}`, `hiddenLayers`, `lockedLayers` e ações `select`, `drag`, `toggleLayer`; começa com a camada `structure` bloqueada. Zoom/pan, grid/snap, overlays, toggles de preview, sampling e opções de foco estão em `useState` de `SceneView.tsx`; `PreviewClock`, renderer, porta Host e gesto atual estão em refs. Não há store canônica do projeto no browser.

```text
snapshot readonly ──> SceneView ──> ViewState + PreviewState ──> IEditorialSceneRenderer
                         | pointerdown: hitTest (UID + slot)
                         | pointermove: Zustand.transient.world OU câmera local
                         | pointerup: createTransformCommand(expectedRevision, commandId)
                         v
                    HostCommandPort.applyCommand
                         | aplicado: aguardar projeção autoritativa do Host
                         | rejeitado/erro/desconectado: descartar transient
                         v
                    cleanupDrag + releasePointerCapture
```

No `pointerdown`, botão esquerdo seleciona por `hitTest`; botão do meio ou ferramenta Pan inicia movimento de câmera. `translationGestureDiagnostic()` bloqueia composição com `parent` e qualquer diferença entre `local` e `world`. O gesto permitido é só translação finita de instância raiz; rotação, escala e reparenting não são inferidos. `setPointerCapture` fixa o ponteiro. No `pointermove`, coordenadas de tela são convertidas por `screenToWorld`; snap opcional arredonda X/Y para múltiplos de 32 e grava apenas `transient.world`. O renderer e o Inspector usam esse override visual, preservando o snapshot.

No `pointerup`, `end()` usa `try/catch/finally`: cria um `TransformCommand` com `crypto.randomUUID()` quando houve movimento, chama `onCommand` para inspeção e aguarda `host.current.applyCommand()`. `applied`, `rejected`, `transport-error` e `disconnected` produzem mensagens distintas. **Mesmo em `applied`, a função não altera o snapshot:** a integração real precisará receber nova projeção/ChangeSet do Host. `finally` sempre chama `cleanupDrag(surface,pointerId)`, que zera gesto/transient e libera captura protegida por `try/catch`. `pointercancel`, `lostpointercapture` e `Escape` descartam o gesto; `blur` e `visibilitychange` pausam o relógio, opcionalmente o resetam e limpam o drag. Ao desmontar a aba, o efeito cancela RAF, desconecta ResizeObserver, limpa transient e dispõe renderer. Novos gestos devem preservar essa sequência de reversão.

## 5. Fronteira transacional com o Host

Assinaturas atuais de `src/host/commands.ts` (candidatas, a substituir/compatibilizar com DTOs gerados de `Starlight.Editor.Protocol`):

```ts
interface TransformCommand {
  readonly method: 'project/applyCommand';
  readonly params: {
    readonly commandId: string;
    readonly commandType: 'layout/setInstanceTransform';
    readonly expectedRevision: number;
    readonly payload: {
      readonly layoutId: string;
      readonly target: Hit;
      readonly local: Transform;
      readonly world: Transform;
    };
  };
}
type HostCommandResult =
  | { readonly status: 'applied'; readonly revision: number }
  | { readonly status: 'rejected'; readonly reason: string; readonly diagnostic?: Diagnostic }
  | { readonly status: 'disconnected'; readonly reason: string; readonly delivery?: 'not-sent' }
  | { readonly status: 'transport-error'; readonly commandId: string; readonly error: string };
interface HostCommandPort {
  applyCommand(command: TransformCommand): Promise<HostCommandResult>;
}
```

`createTransformCommand()` busca `uid + slotId`, exige raiz com `local === world`, preserva rotação/escala, inclui `scene.sceneId`, `scene.revision` e ID de idempotência. `DisconnectedHostPort` retorna `{status:'disconnected',reason:'disconnected',delivery:'not-sent'}` e não envia nada. Em M1/M2, o Tauri inicia o sidecar .NET, recebe porta dinâmica/token via bootstrap stdin/stdout e o React conecta por WebSocket loopback `127.0.0.1:<porta>` com JSON-RPC tipado/autenticado (ADR-SL-002). O Host valida revisão, aplica `IProjectCommand` em transação, persiste atomicamente, registra Undo/Redo e publica ChangeSet (ADR-SL-003). Trate timeout/queda e resultado ambíguo por `commandId`; reconcilie pela revisão/projeção do Host, sem confirmar estado durável a partir da resposta visual. Siga a skill [starlight-ipc-command](../.github/skills/starlight-ipc-command/SKILL.md) na implementação, sujeita aos ADRs aprovados.

## 6. Renderer editorial e isolamento WebGL

### Contrato e geometria

`src/rendering/contracts.ts` define `InstanceUid = \`instance:${string}\``, `AssetGuid = \`asset:${string}\``, `Hit {uid,slotId}`, `Transform {x,y,rotation,scaleX,scaleY}`, `Rect`, `AssetRef {guid,revision}`, `AtlasRegion`, `Layer {id,name,order}`, `Material`, `Representation`, `Overlay`, `EditorialSceneSnapshot`, `PreviewState`, `ViewState`, `Diagnostic`, `RenderReport` e `EditorialRendererTelemetry`. As assinaturas centrais são:

```ts
interface IEditorialSceneRenderer {
  mount(canvas: HTMLCanvasElement): Promise<void>;
  resize(width: number, height: number): void;
  render(snapshot: EditorialSceneSnapshot, view: ViewState, preview: PreviewState): RenderReport;
  hitTest(screen: Point): Hit | undefined;
  screenToWorld(screen: Point): Point;
  dispose(): void;
  getTelemetry?(): EditorialRendererTelemetry;
}
type RendererFactory = (onDiagnostic: (diagnostic: Diagnostic) => void) => IEditorialSceneRenderer;
```

`EditorialSceneSnapshot` tem `schemaVersion: 1`, `sceneId`, `revision`, `extent`, `layers`, `representations` e `overlays`; `Representation` traz UID, slot, camada, z, transforms `local`/`world`, bounds, kind (`sprite`, `tileChunk`, `particles`, `nonvisual`, `text`) e descritores opcionais. `validateSnapshot()` limita 512 representações/overlays, 64 camadas, extent de até 16384, região de atlas até 4096, 4096 células por chunk, 64 regiões por chunk, 256 partículas por emissor, 64 frames de animação e texto de 256 caracteres; rejeita geometria inválida, identidades duplicadas e referências a camadas inexistentes antes de alocar a cena.

`ordered()` classifica por `layer.order`, `z`, `uid` e `slotId`; `hitTestScene()` percorre ordem reversa, ignora camadas ocultas/bloqueadas e aplica a matriz inversa da transformação 2D (translação, rotação, escala, inclusive escala negativa) aos bounds locais. Retorna UID + slot, inclusive para placeholders; não depende dos pixels Pixi. Escala zero não é selecionável. A câmera converte tela ↔ mundo por zoom e offset centrado no `extent` em `PixiEditorialRenderer.screenToWorld()`.

### Preview determinístico

`PreviewClock` em `src/rendering/PreviewClock.ts` tem 60 Hz, seed padrão `23023`, limite global padrão `96` partículas e máximo absoluto `256`, com até oito passos de catchup por avanço. `play()` inicia; `pause()` descarta acumulador; `step()` pausa e avança um frame; `reset()` zera frame. `sample(seed,frame,index)` é função sem estado oculto. `SceneView` alimenta `render()` via RAF; o renderer anima atlas, partículas declarativas, pulso por opacidade e véu de tela. Shaders MGFX e renderers C# usam fallback, sem execução. Preview não grava `.layout` nem executa Event Sheet, física ou gameplay. Perda de foco pausa e pode resetar; fechamento da aba dispõe o clock.

### Adapter Pixi, assets e contexto

`pixi.js` só pode ser importado em `src/rendering/pixi/`; `SceneView` depende da interface e `App.tsx` é a raiz de composição que instancia `PixiEditorialRenderer`. A auditoria estática impõe essa borda. `mount()` valida até 16 assets, dimensões até 4096 e URLs `data:image/png;`/`./`, resolve tokens CSS para a paleta GPU, inicializa o canvas WebGL e registra listeners. Ele **inicia** `loadAssetsAsync()` após inicialização, sem aguardar decodes. No primeiro `render()`, cada asset pendente ganha `LoadingAssetPlaceholder` com bounds clicáveis; após `Image.decode()`, `Texture.from(image,true)` e atualização da chave de build, a representação é reconstruída com textura. Falha gera `MissingAssetPlaceholder`. O atlas procedural da fixture tem 128 × 32 px, oito tiles e quatro frames, sem rede externa.

`OwnedAssets<Texture>` pertence a uma instância do renderer: deduplica loads pendentes, guarda/release recursos próprios, ignora falhas após descarte e libera um decode tardio caso a aba já tenha fechado. O adapter usa imagem distinta por decode e `skipCache`, chaves `AssetGuid@revision`, controle de revisão atual e `disposed` para impedir que carregamentos antigos contaminem um renderer reaberto. `dispose()` remove listeners, destrói containers/regiões/texturas e limpa refs. `webglcontextlost` chama `preventDefault()`, marca `lost`, emite diagnóstico e pausa preview via callback de `SceneView`; `webglcontextrestored` invalida a árvore e solicita reconstrução. A recuperação real em GPU/WebView continua gate pendente.

`getTelemetry()` devolve `mountDurationMs`, `firstInteractiveFrameMs`, `assetDecodeDurations` por asset, `contextLostCount`, `contextRestoredCount`, `lastHitTestDurationMs`, `activeTexturesCount` e `activeRegionsCount`. São métricas do adapter local, não benchmarks de produção ou prova de fidelidade.

## 7. Receitas de engenharia para M1–M4

### 7.1 Novo painel conectado ao Host (M1/M2)

1. Defina no protocolo C# o DTO autoritativo e gere o tipo TypeScript; mantenha snapshot/revisão fora do Zustand. Exponha uma porta tipada de consulta/comando ao painel, mantendo o adapter de transporte fora de `rendering/`.
2. Registre o componente no mapa `panels` de `App.tsx` e em `initialize()` para desktop/compacto. Mostre estado vazio/desconectado honesto.
3. Guarde em Zustand apenas seleção, filtro e gesto transitório. Para edição, crie comando com `expectedRevision` e `commandId`, aplique por `HostCommandPort` e mostre proposta otimista só como `transient`.
4. Em `finally`, limpe interação; em rejeição/erro reverta visualmente. Em sucesso, use ChangeSet/projeção do Host e sua revisão. Teste reconnect, revisão obsoleta, resposta tardia, cancelamento e layout persistido em `.starlight/editor/`.

### 7.2 Inspector schema-driven (M2/M3)

1. Receba do Host schemas JSON de propriedades dos `Object-Refs`, Plugins e Behaviors, mais valores efetivos, origem e restrições. Preserve campos opacos e IDs estáveis; a precedência aprovada é Instance Override → Object-Ref → Family → Default.
2. Construa um registro genérico de editores por tipo/metadata (número, enum, boolean, referência de asset etc.), com validação e acessibilidade comuns. Não crie componentes específicos por plugin e não execute código de addon no WebView.
3. Renderize valor do snapshot e valor transitório separadamente. Ao editar, envie um comando tipado ao Host; só a projeção confirmada passa a representar a verdade. Teste plugin ausente, propriedade desconhecida, falha e undo/redo.

### 7.3 Event Sheet e Monaco (M1/M2)

1. Instale `@monaco-editor/react` e `@tanstack/react-virtual` quando houver contratos reais; ainda não constam de `package.json`. Monte Event Sheet por nós de AST com `SourceId` persistente e virtualize listas extensas. Use Monaco para C# e expressões, sem compilar C# no browser.
2. Receba do Host catálogo ACE, AST, diagnósticos de compilação e logs/erros do Player com `SourceId` (ADR-SL-014). Associe `SourceId` ao nó e destaque bloco e posição de edição; preserve seleção e scroll por ID, não por índice.
3. Alterações da AST passam por comandos transacionais e revisão. Logs estruturados e exceções apontam ao mesmo `SourceId`; breakpoints interativos passo a passo são pós-MVP. Teste IDs estáveis após inserções/ordenação e diagnóstico de nó removido.

### 7.4 Level Editor (M4)

1. Mantenha `.layout` e `.level` distintos. Projete do Host um Level ortogonal de tamanho fixo com **um chunk lógico** no MVP, camadas semânticas `IntGrid` separadas das camadas gráficas e entidades por Object-Ref (ADR-SL-019).
2. Reuse `IEditorialSceneRenderer`/`tileChunk` para visualização e hit test, mas trate `chunk` da fixture como demonstração, não schema `.level`. Defina DTO/protocolo de célula, tileset, flags de override e regras no Host antes da UI.
3. Durante pintura, guarde stroke transitório de células, mostre preview visual e envie comando em lote com revisão esperada ao Host. O Host resolve regras de auto-tiling 16/47 e preserva overrides manuais. Reprojete o chunk após ChangeSet; teste bordas, vizinhança, undo/redo e conflitos de revisão. Streaming multichunk e projeções não ortogonais ficam fora do MVP.

## 8. Testes, auditoria e verificação

`tests/editorial.test.ts` cobre clock, ordenação determinística, hit test com transform invertido e fallback, validação de budgets/imutabilidade e proposta transacional desconectada. `tests/assets.test.ts` cobre ownership, deduplicação, descarte e decodes tardios. `tests/PixiEditorialRenderer.test.ts` usa Pixi/GPU/decode simulados para carregar lentamente, selecionar placeholder no primeiro frame, trocar por textura, lidar com corridas/contexto e colher telemetria. `tests/SceneView.test.tsx` usa jsdom e renderer abstrato para pointer lifecycle, exceção/rejeição/aplicação, cancelamento, blur e desmontagem. Para novos recursos, teste comportamento observável nas fronteiras (revisão, cleanup, falhas e IDs), sem exigir GPU real em testes unitários.

`scripts/audit-editorial.mjs` varre `src/**/*.{ts,tsx,mjs}`: sinaliza import Pixi fora de `rendering/pixi/`, imports nativos `fs`/`child_process`/`net`, referências a MonoGame/assembly/DLL, `eval`/`new Function`, transporte/persistência no renderer e imports React/Zustand/Pixi nos três módulos portáteis. É verificação textual estática, sem prova de dependências transitivas C# ou execução Tauri. Rode a partir de `editor/frontend/`:

```powershell
pnpm typecheck
pnpm test
pnpm build
node scripts/audit-editorial.mjs
```

Da raiz, use `pnpm --dir editor/frontend typecheck` e `pnpm --dir editor/frontend test`. `pnpm build` gera o HTML único no cache descrito acima. Consulte o [relatório de validação](ADR-SL-023_Editorial_Renderer_Validation_Report.md) para limites empíricos e gates restantes; resultados de Vitest não substituem teste WebView/Tauri e comparação com MonoGame.

**Verificação desta inspeção (15/10/2026):** o `pnpm` disponível no ambiente era 12.8.1, enquanto `package.json` fixa 10.28.2; os dois comandos `pnpm --dir` encerraram antes de executar scripts por `ERR_PNPM_BAD_PM_VERSION`. Executando diretamente os binários locais, `tsc --noEmit` passou e Vitest concluiu 59 testes: 55 passaram e quatro falharam (um em `assets.test.ts`, três em `PixiEditorialRenderer.test.ts`). `node scripts/audit-editorial.mjs` passou com zero violações em 14 arquivos. Esta inspeção não altera código nem testes; as falhas atuais devem ser investigadas na manutenção da suíte, sem reinterpretar o relatório histórico de validação como resultado desta execução.
