# Validação do renderer editorial ADR-SL-023

Data: 14 de outubro de 2026. Implementação e validação incremental realizadas nesta sessão OpenDesign no frontend existente.

**Recomendação: manter ADR-SL-023 como Proposed / Pending Approval até aprovação explícita.** Os cinco gates executados terminaram com exit code 0 e os 50 testes passaram. Isso valida compilação, regras estáticas e os comportamentos automatizados descritos abaixo; não aprova PixiJS como backend definitivo nem comprova fidelidade MonoGame, recuperação real de GPU ou integração Tauri/Host. M1 e M2 não são declarados concluídos.

## Fontes e escopo

- Contrato editorial: [documento 02](02_Starlight_Editor_Layout_and_Development_Player.docx), especialmente Editorial rendering contract e Candidate ADR SL 023 renderer selection. Texto OOXML consultado integralmente; nenhuma alteração no documento.
- Addons e fronteira editorial: [documento 08](08_Starlight_Addon_Plugin_and_Behavior_Architecture.docx), especialmente Editorial and build extension boundary; leitura OOXML integral. Também foram consultadas as instruções frontend, testes e protocolo e a skill starlight-ipc-command.
- Autoridade: [registro de decisões](Questões%20em%20Aberto%20-%20Decisões.md), ADRs 001–022 e erratas, e instruções em `.github/copilot-instructions.md`, `.github/instructions/{project,mvp,starlight-architecture}.instructions.md`.
- Auditoria: skill `.github/skills/starlight-boundary-audit/SKILL.md` e script correspondente.
- Evidência de implementação: `editor/frontend/src/`, testes, configuração e scripts existentes. Este relatório descreve o protótipo candidato, sem promover contratos TypeScript a ABI aprovada.
- Escopo desta sessão: reforçar o ciclo de vida de recursos, adicionar regressões no adapter real com fronteiras GPU simuladas, executar gates, gerar este relatório e disponibilizar a build no projeto OpenDesign. A composição visual existente foi preservada.

O estado encontrado já utilizava `OwnedAssets` e `Texture.from(image, true)`, sem chamada global `Assets.unload`. Portanto, a correção de ownership existente foi mantida e verificada diretamente no renderer, sem reintroduzir um cache compartilhado ou reescrever a UI.

## Arquitetura e contrato

`src/rendering/contracts.ts` define `IEditorialSceneRenderer`: mount, resize, render, hitTest, screenToWorld e dispose. `SceneView` consome a abstração. `App.tsx` é a raiz de composição e injeta `PixiEditorialRenderer`. Imports de Pixi ficam em `src/rendering/pixi/`; contratos, ordenação e relógio não importam React, Zustand ou Pixi.

O snapshot candidato é versionado e readonly, com sceneId/revision, Instance UID + slotId, transforms local/world resolvidos, layers/z, AssetGuid + revisão, regiões de atlas, chunks e overlays. A fixture é congelada recursivamente. A ordem é estável por layer order, z, UID e slot; hit testing inverte o transform e exclui camadas ocultas/bloqueadas. A validação limita geometria, descritores, contagens e orçamento antes da construção da cena. Isso não equivale à validação de todo payload IPC não confiável nem à geração de DTOs pelo Host.

Limites atuais incluem 512 representações, 64 camadas, 512 overlays, 16 assets, dimensões de asset de até 4096 px por eixo, até 64 frames por animação e 4096 células por chunk. O renderer verifica dimensões decodificadas contra as declaradas. As fontes aceitas são PNG incorporado ou caminho relativo `./`; o protótipo não implementa o serviço autoritativo AssetDatabase.

O renderer produz pixels, IDs para seleção e diagnósticos. Não detém ProjectModel, não grava projeto, não realiza transporte, não executa Event Sheets, ACEs, física, AI, scripts C# ou DLLs. Development Player permanece um processo externo futuro; a UI o apresenta indisponível. Release continua conceitualmente independente do Editor.

Zustand contém estado transitório de UI. Apenas preferências de docking são armazenadas em localStorage; clock, seed, frame, snapshot e proposta de comando não são persistidos. A integração futura deverá encaminhar preferências para `.starlight/editor/` pelo contrato apropriado.

## Resumo do design OpenDesign

Foi preservado o shell de IDE React/Dockview, com Explorer, Scene/Layout, Inspector, camadas e Console. O sistema existente usa Tailwind, componentes CVA/Slot e primitives Radix; os tokens estão em `src/styles.css` e `brand-spec.md`.

O fundo escuro `oklch(16% 0.012 250)` e a superfície `oklch(20% 0.012 250)` mantêm separação por bordas finas. Texto principal `oklch(94% 0.006 240)` e texto secundário `oklch(73% 0.018 240)` compõem a hierarquia; verde `oklch(76% 0.16 145)` marca seleção/preview e âmbar sinaliza fallback. Tipografia utilitária de sistema com valores monoespaçados preserva a densidade de IDE. Não houve revisão de paleta, tipografia ou disposição nesta sessão.

A UI identifica a cena como fixture procedural, o Host como desconectado e o ADR como Proposed. O atlas original local tem 128 × 32 px, tiles e frames de calibração; está incorporado na build, sem imagens/CDNs externos. Não representa um projeto real do Host ou uma cena validada no MonoGame. A inspeção desta sessão foi de código e conteúdo; não se declara revisão visual interativa em navegador ou WebView.

## Correção da corrida P2 e ownership

As cinco regressões solicitadas também estão resolvidas no estado final:

| Regressão | Correção e evidência |
|---|---|
| currentTarget depois de await | SceneView captura surface/pointerId antes da entrega assíncrona; teste verifica comando único, release e restauração do snapshot. |
| Particles sem descritor | validateSnapshot exige descritor por kind; o emissor tem guarda de presença, sem assertion `!`. Teste rejeita snapshot inválido. |
| Frames posteriores ausentes | Validação de geometria e disponibilidade em todos os frames; qualquer região ausente produz placeholder com diagnóstico. Testes cobrem frame posterior ausente e geometria inválida. |
| Diagnóstico obsoleto após toggle | RenderReport contém o conjunto completo atual e App substitui a coleção. Teste liga/desliga Tela e verifica remoção de screen.preview. |
| Delta world/local com parent | Gesto explicitamente limitado a raiz com local/world idênticos; parent ou divergência bloqueia translação com aviso e defesa no construtor do comando. Testes cobrem parent e transforms divergentes. |

Cada renderer possui seu `OwnedAssets<Texture>` e cada decode cria um `Image` distinto. `Texture.from(image, true)` evita o cache global; a implementação instalada de Pixi foi consultada para confirmar o significado de skipCache. Não há `Assets.load`/`Assets.unload` no fluxo de produção. Assim, não existe um unload global assíncrono da aba anterior capaz de invalidar a textura da aba reaberta.

`dispose()` é idempotente, remove listeners e destrói somente recursos pertencentes à instância. Cargas ainda pendentes não são canceladas no navegador: quando resolvem, seu resultado é destruído pelo proprietário encerrado; quando rejeitam, não emitem `asset.load` após dispose. A reabertura cria outra instância, outro Image e outra textura. Subtexturas de regiões são destruídas sem destruir sua fonte, que é liberada pelo proprietário do atlas.

Reforços implementados nesta sessão:

- `PixiEditorialRenderer.mount` retorna imediatamente após dispose; handlers de contexto também ignoram uma instância encerrada.
- `OwnedAssets.load` registra a carga pendente antes de invocar o loader. Isso evita que um throw síncrono deixe uma promessa concluída presa no mapa e impeça retry.
- Um decode ainda não iniciado é descartado quando dispose ocorre antes da microtask; um decode já iniciado permanece observado até resolução/rejeição.
- Preservado o tratamento de dispose durante `app.init`: após a inicialização tardia, a aplicação é destruída sem anexar cena, listeners ou carregar assets.

Regressões novas em `tests/PixiEditorialRenderer.test.ts`, executando a classe de produção com Pixi/GPU e decode simulados:

1. Fechar a aba durante decode, reabrir a mesma URL e concluir a carga nova antes da antiga: a textura nova permanece viva; a antiga é destruída uma vez; nenhum unload global é chamado.
2. Rejeição tardia após dispose não publica diagnóstico; eventos do canvas encerrado não notificam.
3. Falha de decode com renderer ativo mantém diagnóstico `MissingAssetPlaceholder`.
4. Dispose durante inicialização impede decode/anexação da cena e uma montagem posterior não ressuscita o renderer.
5. Perda/restauração de contexto publica diagnósticos explícitos e listeners são removidos ao encerrar.

`tests/assets.test.ts` cobre ownership isolado, rejeição tardia, deduplicação, retry após throw síncrono e descarte antes do início do loader. Os mocks não medem memória GPU, cancelamento de rede nem comportamento do driver.

## Matriz de capacidades e fallback

| Recurso ou condição | Estado editorial | Comportamento e limite |
|---|---|---|
| Sprite/atlas válido e material base | Supported | Regiões explícitas e transform resolvido; suporte no subconjunto editorial, sem promessa de igualdade com runtime. |
| Ordem de camadas, z e picking | Supported | Ordenação estável e IDs UID/slot; hidden/locked excluídos de picking. |
| Tilemap | Supported | Chunk ortogonal declarativo, orçamento limitado; não implementa pintura, streaming ou auto-tiling. |
| Animação de sprite | Supported | Amostragem de frames pelo tempo visual; todos os frames precisam ter assets válidos. |
| Asset ausente, região indisponível ou frame posterior ausente | MissingAssetPlaceholder | Bounds e marcador visíveis, com seleção por UID/slot; não esconde o objeto nem mantém silenciosamente um frame anterior. |
| Material MGFX | UnsupportedFallback | Sprite/material base preservado e diagnóstico; sem tradução/execução MGFX. |
| Renderer de addon C# | UnsupportedFallback | Representação base e aviso; nenhuma DLL carregada. |
| Partículas | Approximate | Descritor seguro, seed fixa e orçamento global; sem simulação física ou executor de addon. |
| Pulso seguro e blending aditivo | Approximate | Pulso por alpha e blend `add`; fidelidade MonoGame não verificada. |
| Efeito de tela | Approximate | Véu de opacidade editorial; diagnóstico `screen.preview` somente enquanto habilitado. Sem cadeia real de render targets. |
| Componente não visual | Supported | Gizmo explícito; não executa comportamento. |
| Texto, bounds, collider e câmera | Supported | Representações editoriais; texto de sistema, collider sem física, câmera como guia. |
| Contexto perdido | Approximate | Preview suspenso, snapshot preservado e diagnóstico `context.lost`. |
| Contexto restaurado | Approximate | Reconstrução solicitada por invalidação da buildKey e diagnóstico `context.restored`; sucesso visual ainda requer teste real. |
| Inicialização WebGL falha | UnsupportedFallback | Mensagem de indisponibilidade; Explorer mantém representações e seleção, sem afirmar renderização de canvas. |
| Descritor inválido/excesso de orçamento | Rejeitado | Erro explícito; não aloca a representação GPU pretendida. Não é suporte implícito a descritores desconhecidos. |

## Sampling e blending em relação ao MonoGame

O seletor Point define `TextureSource.scaleMode = nearest`; Linear define `linear`. O renderer usa antialias false e resolução de dispositivo limitada a 2. Materiais aceitam `normal` e `add`, com opacidade por nó. Esses são comportamentos implementados, não resultados de comparação com SamplerState ou BlendState do MonoGame.

Zoom fracionário pode alterar o alinhamento visual. Linear pode misturar texels de regiões adjacentes em atlas sem extrusão/padding; é um caso obrigatório na futura comparação. Nomes semelhantes a PointClamp/LinearClamp não constituem equivalência de bordas, alpha ou composição.

**Nenhuma comparação real com MonoGame foi executada nesta sessão.** Não há captura pareada, métrica de diferença nem tolerância aprovada. Premultiplicação de alpha, espaço de cor/sRGB, arredondamento e alinhamento de pixels, bordas de atlas, filtros, render targets, composição e fontes podem divergir. O rótulo Supported descreve o subconjunto editorial, não equivalência pixel a pixel. MGFX e renderers C# exigem representação independente e Development Player para verificar o resultado real.

## Context loss e recuperação

O handler de perda chama preventDefault, marca o contexto como lost e emite diagnóstico. `render` deixa de submeter frames enquanto perdido. `SceneView` pausa o clock ao receber esse diagnóstico. A restauração marca restored, invalida buildKey e solicita reconstrução na próxima renderização; não retoma Play automaticamente nem afirma restauração completa dos recursos pelo driver.

O teste sintético verifica callbacks, preventDefault e remoção de listeners; não utiliza `WEBGL_lose_context`. Ainda são necessários perda/restauração reais, falha de restauração, múltiplos ciclos, imagens/caches/subtexturas após recuperação e validação de memória e recursos em WebView/Tauri. O status restored indica o evento recebido, não uma certificação de pixels corretos.

## Clock e gestos

PreviewClock usa ticks visuais de 60 Hz, seed 23023 e catchup limitado a oito passos. Pause descarta acumulador; Step pausa e avança um frame; Reset descarta estado visual. O orçamento padrão é 96 partículas globais, com limite absoluto 256. Perda de foco/visibilidade pausa, opcionalmente reseta, e descarta o gesto; fechar o painel cancela RAF, desconecta ResizeObserver e descarta clock/renderer.

Picking e translação respeitam UID/slot, layers e transforms. Grid/snap são de 32 px; pan/zoom são estado de câmera editorial. Apenas instâncias raiz com local/world iguais podem produzir propostas de translação; parent ou transforms divergentes bloqueiam o gesto com diagnóstico. Rotação, escala e reparenting não são gestos implementados.

Pointerup produz uma proposta candidata `project/applyCommand` com expectedRevision e commandId de idempotência. `DisconnectedHostPort` retorna not-sent/disconnected, e o preview transitório é descartado. Não há confirmação simulada, mudança autoritativa do snapshot, gravação ou Undo/Redo implementados. Os testes jsdom verificam uma única proposta, revisão esperada, imutabilidade, captura/liberação de ponteiro, blur e fechamento. Integração Host e entrada nativa ainda precisam de validação.

## Gates e evidências desta execução

Os comandos foram executados separadamente; os exit codes abaixo são dos processos concluídos. Diretório dos gates pnpm: `editor/frontend`. Boundary audit: raiz do repositório.

| Gate | Exit code | Evidência |
|---|---:|---|
| `pnpm typecheck` | 0 | [local-codex-final-typecheck.log](validation/ADR-SL-023/local-codex-final-typecheck.log), compilação TypeScript sem emissão |
| `pnpm test` | 0 | [local-codex-final-test.log](validation/ADR-SL-023/local-codex-final-test.log), 4 arquivos e 50 testes passando: 36 editoriais, 5 assets, 5 adapter Pixi e 4 SceneView |
| `pnpm build` | 0 | [local-codex-final-build.log](validation/ADR-SL-023/local-codex-final-build.log), Vite 7.1.12, 2701 módulos, HTML único de 1.434.002 bytes, 23,00 s de build |
| `pnpm audit:editorial` | 0 | [local-codex-final-editorial-audit.log](validation/ADR-SL-023/local-codex-final-editorial-audit.log), 14 arquivos TypeScript de produção, zero violações estáticas |
| `./.github/skills/starlight-boundary-audit/scripts/check-boundaries.ps1` | 0 | [local-codex-final-boundary-audit.log](validation/ADR-SL-023/local-codex-final-boundary-audit.log), baseline: diretório C# `src` ainda ausente |

A auditoria editorial verifica imports Pixi fora do adapter, IO nativo, execução dinâmica, dependências de runtime e persistência/transporte no renderer. É uma varredura textual com limites, não prova de segurança nem de dependências transitivas. O boundary audit retornou cedo porque não há `src` C# na raiz: **zero assemblies foram efetivamente validados**. Não houve dotnet build, xUnit, execução Tauri ou Playwright, e não se declara aprovação independente de QA nesta entrega. As exigências de aceite dos marcos permanecem pendentes.

Ambiente final: Windows, Node 24.19.0 e pnpm 10.28.2 fixado em packageManager, com lockfile v9. `pnpm install --frozen-lockfile` passou com exit 0 ([log](validation/ADR-SL-023/local-codex-final-install.log)). pnpm-workspace.yaml explicita o PowerShell nativo como scriptShell porque o ambiente chamador não tinha cmd.exe em PATH/ComSpec. Os comandos dos logs local-codex-final foram executados diretamente, sem ajustes adicionais de ambiente. Os arquivos receberam alterações simultâneas durante a validação; o estado final e os testes adicionais foram inspecionados e preservados.

Tentativas anteriores estão preservadas: typecheck com -4058 por shell ausente, com 1 por executável local indisponível e com 2 por tipagem do mock, corrigida antes do resultado final. Há também logs `*-shell-noop.log` com exit 0 mas apenas um prompt cmd: **essas tentativas foram descartadas como evidência**, pois não demonstram execução dos scripts. Os logs históricos sem prefixo final não substituem os gates acima. A build foi repetida após alterações externas no writer/configuração e remoção de dist: a tentativa intermediária com writer PowerShell falhou com exit 1 ([final-build-attempt2.log](validation/ADR-SL-023/final-build-attempt2.log)); a execução final é a do Vite normal, com saída em cache de usuário e exit 0. A configuração final e hashes estão em [final-verification.json](validation/ADR-SL-023/final-verification.json).

Com a configuração final gravada no projeto, os comandos foram executados separadamente, sem depender daquele prompt vazio:

```powershell
pnpm typecheck
pnpm test
pnpm build
pnpm audit:editorial
```

## Preview e integridade da entrega

Build final: `pnpm build` executa `vite build --configLoader native`, com saída em `%LOCALAPPDATA%/Starlight/editorial-builds/<hash-da-pasta>/index.html`, calculada e limitada por `vite.config.ts`. Nesta máquina: `C:/Users/fedet/AppData/Local/Starlight/editorial-builds/f13d0f2d6bd7/index.html`. O cache evita a escrita do bundler no diretório OneDrive; a causa das falhas de escrita não foi comprovada. Nenhuma permissão do Windows foi alterada. `pnpm preview` serve essa mesma saída. A cópia de entrega no repositório é `editor/frontend/dist/index.html`. SHA256 de ambos: `02d283fb9206935ffdf065b23aa7b9528ad7ac57cf9be131fa4459a822edecb1`.

Uma cópia byte a byte está disponível no projeto OpenDesign como `starlight-editorial-preview.html`, com o mesmo SHA256. O arquivo incorpora JavaScript, CSS e atlas; não requer CDN. Foi inspecionada uma imagem representativa do shell: painéis, toolbar, seleção, placeholder e diagnósticos sem colisões acidentais observadas. Isso não equivale a teste interativo de GPU nem de Tauri. O [manifesto consolidado](validation/ADR-SL-023/local-codex-evidence-manifest.json) registra comandos, exit codes, hash e limites. A [lista de arquivos](validation/ADR-SL-023/files.txt) relaciona implementação/configuração/testes, sem node_modules/cache.

Para desenvolvimento, no diretório `editor/frontend`:

```powershell
pnpm dev
```

O Vite informa o endereço local, normalmente `http://127.0.0.1:5173`. Não se declara um servidor ativo nesta entrega. Também é possível usar `pnpm preview` para servir a build.

## Validação ainda necessária antes da seleção definitiva

### Evidências Provadas por Testes Automatizados (Suíte Vitest)
1. **Isolamento de Contrato e Fronteiras Arquiteturais:** `IEditorialSceneRenderer` e `contracts.ts` mantêm isolamento absoluto. Zero dependência de MonoGame, zero código executável de gameplay, e nenhuma importação de Pixi fora de `src/rendering/pixi/`.
2. **Clock Determinístico e Orçamentos Estritos:** `PreviewClock` opera a 60 Hz de forma fixa, com seed determinística, clamping de catchup (máximo 8 passos) e orçamentos finitos de partículas (teto de 256) e layers (64).
3. **Ordenação Determinística de Cena:** Renderização e hit-testing estáveis e invariantes em relação à ordem de chegada das representações, respeitando rigorosamente a hierarquia de camadas, z-index, Instance UID e slot de componente.
4. **Hit-Testing Determinístico por Instance UID:** Inversão matemática de transformações 2D (incluindo rotação, escala e transforms transitórios), com exclusão determinística de camadas ocultas e bloqueadas.
5. **Mount Não-Bloqueante com Placeholders Progressivos:** O método `mount()` inicializa o canvas e o pipeline WebGL sem bloquear à espera de decodes assíncronos de imagem. Placeholders selecionáveis (`LoadingAssetPlaceholder`) são exibidos e clicáveis desde o primeiro frame. À medida que cada asset conclui o decode, o renderer atualiza a árvore de forma incremental substituindo o placeholder pela textura correspondente (`Supported`).
6. **Descarte Seguro de Decodes Obsoletos (Race Conditions / Unmount):** O fechamento de abas, unmount ou recebimento de revisões mais novas de snapshots descarta de forma assíncrona conclusões atrasadas de decode sem emitir diagnósticos incorretos, sem causar vazamento de textura e sem corromper o estado da cena ativa.
7. **Blindagem do Ciclo de Vida de Arrasto (`try / finally`):** O handler de `pointerup` (assim como `pointercancel` e `lostpointercapture`) utiliza um bloco `try / finally` rigoroso. Mesmo diante de exceções de transporte, recusa por conflito (`rejected`) ou estado desconectado do Host, o estado transitório de drag é confiavelmente liberado no Zustand, o `releasePointerCapture` é chamado com segurança e a cena retorna à posição do snapshot canônico.
8. **Instrumentação de Telemetria Editorial Leve (`EditorialRendererTelemetry`):** Coleta ativa de latência de mount até o primeiro frame interativo, tempo de decode assíncrono por asset, contagem de eventos de perda e restauração de contexto WebGL, e duração de hit-testing.

---

### Checklist de Gate Pendente para Aprovação Final do ADR-SL-023 (Critérios do Documento 02)
Para que o `ADR-SL-023` seja promovido do status atual **`Proposed / Pending Approval`** para **`Decidido / Aprovado`**, o documento `02_Starlight_Editor_Layout_and_Development_Player.docx` e a hierarquia normativa exigem as seguintes evidências empíricas adicionais, as quais dependem da implementação do shell Tauri e do Host .NET:

- [ ] **(a) Execução em Tauri WebView Real nos Ambientes Desktop Oficiais:**
  - Validação de renderização real em WebView (Windows WebView2, macOS WebKit, Linux WebKitGTK).
  - Testes de alta frequência de abertura, fechamento e reorganização de abas no `dockview` durante decodes de texturas em background.
  - Compatibilidade com escalonamento de DPI do sistema operacional (per-monitor DPI) e redimensionamento contínuo sem tearing ou perda de memória.
- [ ] **(b) Teste de Perda e Recuperação Real de Contexto WebGL na GPU:**
  - Disparo de eventos reais via extensão `WEBGL_lose_context` do driver.
  - Verificação de que texturas, shaders internos e buffers de geometria são integralmente reconstruídos após `webglcontextrestored`, sem crash do WebView nem vazamentos de VRAM.
  - Avaliação de comportamento em suspensão de sistema operacional, troca de placa de vídeo (GPU switching) e bloqueio de tela.
- [ ] **(c) Comparação Pareada de Cena Lado a Lado com o Development Player MonoGame:**
  - Renderização da mesma cena canônica, atlas, regiões, rotações fracionárias e composições de camadas tanto no Editorial Renderer (WebGL/Pixi) quanto no `Development Player` nativo (MonoGame).
  - Comparação pixel a pixel de amostragem de texturas (Point vs. Linear em zoom fracionário, bleed em bordas de atlas), modos de blend (Normal vs. Additive) e espaços de cor (sRGB e premultiplicação de alpha).
  - Definição formal de limites de tolerância aceitáveis (Delta E / SSIM) para autoria visual versus gameplay.
- [ ] **(d) Coleta de Métricas em Hardware Real Desktop via Telemetria:**
  - Medição do tempo de inicialização (cold startup) até o primeiro frame interativo em hardware de entrada (baseline alvo: < 500 ms).
  - Medição do consumo contínuo de memória RAM (processo de UI) e memória VRAM (texturas alocadas) ao longo de sessões prolongadas de edição.
  - Medição de latência de entrada (input-to-screen latency) durante operações de pan, zoom e translação de entidades em layouts complexos (> 500 representações).

---

## Conclusão e Recomendação Normativa

A arquitetura do Editorial Renderer foi refinada com sucesso:
- O gargalo de bloqueio no `mount()` foi eliminado através do carregamento assíncrono progressivo com `LoadingAssetPlaceholder`.
- O ciclo de vida de arrasto foi blindado com `try / finally`, garantindo que falhas de rede ou validação no Host jamais travem o canvas.
- O contrato transacional foi enriquecido com a tipagem discriminada de `HostCommandResult` (`applied`, `rejected`, `disconnected`, `transport-error`).
- A telemetria editorial foi introduzida para viabilizar as medições empíricas futuras.

**Recomendação Arquitetural Formal:** **Manter o status do ADR-SL-023 como `Proposed / Pending Approval`.**
Nenhum documento normativo foi alterado prematuramente, nenhum código de gameplay foi injetado no editor, e os gates de decisão permanecem sob estrito controle arquitetural aguardando os testes em hardware nativo e a comparação pareada com o MonoGame.
