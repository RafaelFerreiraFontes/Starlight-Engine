# Starlight Layout editorial

Protótipo React de autoria, com shell Dockview, Tailwind, componentes no padrão Shadcn (CVA/Slot) e primitives Radix. **ADR-SL-023 permanece Proposed / Pending Approval.** Não é a conclusão dos marcos M1/M2 e não inclui Host, Tauri ou gameplay.

## Executar no Windows

Toolchain final: Node 24.19.0 e pnpm 10.28.2, fixado em packageManager e resolvido pelo Corepack. O projeto Windows usa o PowerShell nativo como scriptShell explícito; o ambiente chamador não disponibilizava cmd.exe no PATH/ComSpec. Na pasta `editor/frontend`:

```powershell
pnpm install --frozen-lockfile
pnpm typecheck
pnpm test
pnpm build
pnpm dev
```

O Vite informa a URL local (porta padrão 5173). `pnpm preview` serve a build, na porta padrão 4173. A build gera um HTML com JavaScript, CSS e atlas incorporados. Nenhum CDN é necessário.

`pnpm build` executa o Vite/Rollup normal e grava em `%LOCALAPPDATA%/Starlight/editorial-builds/<hash-da-pasta>/index.html`. O caminho é calculado e limitado em `vite.config.ts`; `pnpm preview` usa a mesma saída. A escrita por subprocessos dentro do OneDrive falhou com EPERM/EBADF e acesso negado nesta execução, por isso os arquivos gerados usam cache de usuário. A causa de ambiente não foi comprovada e nenhuma permissão do Windows foi alterada. O HTML entregue também é copiado para `dist/index.html` e para o preview OpenDesign; essa cópia de entrega não é etapa de persistência do produto. `configLoader: native` evita o carregamento de configuração que não terminou nas primeiras tentativas. A instalação autoriza apenas o postinstall do esbuild em `pnpm-workspace.yaml`.

## Interações implementadas

- Clique no canvas ou explorador seleciona UID + slot; placeholders continuam selecionáveis.
- Arraste uma instância raiz para testar translação. O estado é transitório; `pointerup` produz uma proposta `project/applyCommand`, com revisão esperada e ID de idempotência.
- **Host desconectado:** a proposta não é enviada e a projeção original é restaurada. O painel “Comando local” permite inspecioná-la. Não existe resposta simulada, confirmação, gravação, undo/redo ou transporte.
- O gesto aceita apenas instâncias raiz com transforms local/world idênticos. Parent ou transforms divergentes bloqueiam o movimento com diagnóstico. Rotação, escala e reparenting não são gestos deste protótipo.
- Botão do meio ou ferramenta Pan move a câmera; roda e botões ajustam zoom; enquadrar restaura o fit. Grid e snap usam 32 px.
- Visibilidade e bloqueio de camadas são preferências efêmeras de UI. Ordem vem do snapshot.
- Reset / Play / Pause / Step afetam só o relógio visual. Partículas, pulso seguro e efeito de tela são opcionais. “Shaders” habilita apenas o descritor seguro `pulse`, calculado por opacidade; não é tradução MGFX nem execução de shader de addon.
- Overlays mostram seleção, handles de bounds, eixo de translação, collider e câmera. Collider é apenas representação, sem física.
- O menu Workspace abre/fecha a fixture e restaura painéis. Event Sheets e Development Player têm estados honestos sem integração.

## Fronteiras

`src/rendering/contracts.ts` define `IEditorialSceneRenderer` e DTOs candidatos. `src/scene/SceneView.tsx` depende desse contrato, não de Pixi. `src/App.tsx` é a raiz de composição e injeta `PixiEditorialRenderer`, cuja implementação e imports Pixi ficam em `src/rendering/pixi/`.

O snapshot é readonly, versionado e congelado recursivamente na fixture, com UIDs persistentes, slot IDs, transforms resolvidos, layers/z, AssetGuid + revisão, regiões de atlas, chunk e overlays declarativos. Validação aplica limites antes de construir representações. O Host C# deverá fornecer os DTOs gerados/autoritativos antes de integração; estas interfaces não proclamam ABI aprovada.

Zustand guarda seleção, drag e overrides locais de visibilidade/bloqueio. `localStorage` guarda apenas o layout/aba Dockview no navegador. Isso é uma preferência do protótipo web; a integração futura deverá encaminhar preferências para `.starlight/editor/`. Snapshot, clock, seed, frame e propostas de comando não são serializados.

O relógio tem ticks fixos de 60 Hz, seed 23023, catchup de no máximo 8 passos e orçamento global de 96 partículas (limite absoluto 256). Pausar descarta o acumulador; perder foco pausa e, opcionalmente, reseta; fechar o painel desmonta renderer e clock. Não há Event Sheets, ACEs, física, scripts C#, DLLs ou IO de projeto na cena.

## Fixture e assets

“Plataforma orbital” é explicitamente uma **fixture procedural de validação**, não um projeto do Host. O atlas original tem **128 × 32 px**, oito tiles 16 × 16 e quatro frames 16 × 16. É local e incorporado em `src/fixtures/atlas.ts`; o PNG de referência também está no diretório. Não utiliza marcas, personagens ou cenários reais. Autoria: implementação deste protótipo, sem assets de terceiros.

Para regenerar a versão incorporada:

```powershell
python scripts/generate-atlas.py | Set-Content -Encoding utf8 src/fixtures/atlas.ts
```

## Validação e limites

`pnpm audit:editorial` audita imports de backend, IO nativo, execução dinâmica e persistência no renderer. O script C# original é executado a partir da raiz do repositório:

```powershell
./.github/skills/starlight-boundary-audit/scripts/check-boundaries.ps1
```

Consulte [o relatório completo](../../docs/ADR-SL-023_Editorial_Renderer_Validation_Report.md) e os logs em `docs/validation/ADR-SL-023/`. Os testes de interação usam jsdom e um adapter de teste do contrato, sem GPU. A build não prova execução em WebView/Tauri nem equivalência com MonoGame. Recuperação real de contexto, targets Desktop, memória, startup e latência exigem validação adicional.
