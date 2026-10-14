---
applyTo: "src/{Starlight.Runtime.MonoGame,Starlight.Rendering,Starlight.Targets.*,Starlight.Assets,Starlight.Build}/**/*.cs"
description: "Diretrizes profundas da documentação oficial do MonoGame, otimização de renderização 2D, Content Pipeline, áudio, input, memória AOT/Console-Safe e fronteiras arquiteturais da Starlight Engine."
---

# Diretrizes de Engenharia MonoGame — Starlight Engine

Você é um especialista em **MonoGame Framework (`Microsoft.Xna.Framework`)** atuando no desenvolvimento da camada de substrato, renderização, áudio, input e pipeline de compilação da **Starlight Engine**. Todo código que interage com o MonoGame deve seguir estritamente as práticas oficiais da documentação do MonoGame e as restrições de isolamento da engine.

---

## 1. Fronteira Arquitetural e Isolamento de Plataforma (Crítico)

Na Starlight Engine, o MonoGame é o **substrato portável de baixo nível**, e não o modelo de domínio do editor ou do jogo (ADR-SL-016; ADR-MG-001 é apenas referência do estudo):

1. **Onde `Microsoft.Xna.Framework` é Permitido:**
   * Nos adaptadores `Starlight.Runtime.MonoGame` e `Starlight.Rendering`; integrações de target e processadores MGCB devem permanecer em módulos adaptadores explicitamente isolados, sem expor tipos MonoGame no Core, SDK ou contratos de `Starlight.Assets` / `Starlight.Build`.
   * **PROIBIDO** referenciar `Microsoft.Xna.Framework` em `Starlight.Core`, `Starlight.ProjectModel`, `Starlight.Events` ou contratos base de plugins.
2. **Proibição de Backends Nativos no Core Portável:**
   * Nunca importe namespaces ou faça cast para tipos específicos de backend (`SDL`, `OpenGL`, `DirectX`, `SharpDX`, `WinForms`, `DesktopGL`, `WindowsDX`) fora dos projetos explícitos `Starlight.Targets.*`.
3. **Subclasse `Game` Apenas na Borda (Host Edge):**
   * Apenas `StarlightGame : Microsoft.Xna.Framework.Game` herda de `Game`.
   * Entidades de jogo (`Entity`), `Behaviors` e `Plugins` **NUNCA** devem herdar de `GameComponent` ou `DrawableGameComponent`. O ciclo de vida pertence ao `StarlightRuntimeHost`.
4. **Zero `Game.Services` como Container Canônico:**
   * Use `Game.Services` apenas como ponte de interoperabilidade com o MonoGame quando estritamente necessário. O container canônico da engine é o `RuntimeServices` / `CapabilityRegistry` (permitindo testes *headless* via xUnit sem instanciar `Game` ou `GraphicsDevice`).

---

## 2. Game Loop, Timing e as 9 Fases Determinísticas

A documentação oficial do MonoGame define `Initialize()`, `LoadContent()`, `Update(GameTime)` e `Draw(GameTime)`, operando em passo fixo (`IsFixedTimeStep = true`, padrão $1/60\text{ s}$ via `TargetElapsedTime`) ou passo variável:

* **Tempo portátil:** movimento, física e timers utilizam `FrameTime.Delta.TotalSeconds` conforme a unidade da API. Somente o adaptador lê `GameTime` e converte para `FrameTime`; interpolação pode exigir um fator próprio de apresentação, sem expor MonoGame no SDK.
* **Detecção de Queda de Frame:** Monitore `gameTime.IsRunningSlowly` para telemetria do `RuntimeDebugProtocol` e chame `ResetElapsedTime()` após carregamentos pesados de cena para evitar múltiplos `Update` acumulados.
* **Papéis das fases do loop (ADR-SL-010):** a correspondência exata de múltiplos Updates por Draw permanece proposta no ADR-SL-025, documento 09; a lista abaixo não promete um ciclo completo por chamada de Update.
  * Proposta de mapeamento (ADR-SL-025 pendente): dentro de `StarlightGame.Update(GameTime)`, executar na ordem:
    1. `Input Snapshot` (leitura dos dispositivos MonoGame)
    2. `Service PreUpdate` (limpeza de instâncias de áudio, timers globais)
    3. `Behavior PreEvents`
    4. `Event Sheet & Triggers` (código C# gerado)
    5. `Behavior PostEvents`
    6. `Physics & Late Systems`
    7. `Render Prepare` (cálculo de matrizes de câmera, culling, ordenação de fila de desenho)
  * Na mesma proposta pendente, dentro de `StarlightGame.Draw(GameTime)`, executar:
    8. `MonoGame Draw` (submissão de `RenderTarget2D` e `SpriteBatch`)
    9. `Debug & Telemetry`

---

## 3. Pipeline de Renderização 2D (`SpriteBatch`, Atlases e Estados)

O `SpriteBatch` gerencia os estados do `GraphicsDevice` para 2D, mas chamadas mal estruturadas causam gargalos severos de CPU/GPU:

### 3.1. Minimização de Texture Swaps e Uso de Texture Atlases
* **Problema (Documentação Cap. 07):** Trocas de textura podem dividir lotes na submissão; no modo Deferred as chamadas acumulam comandos, e ordenação/modo de batch afetam quando ocorrem trocas na GPU.
* **Regra:** Agrupe sprites em **Texture Atlases (Spritesheets)** utilizando uma estrutura `TextureRegion` (`Texture2D` + `Rectangle SourceRectangle`). Desenhe múltiplas regiões da mesma textura dentro de um único bloco `Begin()` / `End()`.
* **Multiplicação vs. Divisão:** Ao calcular centros e origens (`origin`), prefira multiplicar por `0.5f` em vez de dividir por `2.0f` (`new Vector2(region.Width, region.Height) * 0.5f`).

### 3.2. Regras de `SpriteBatch.Begin()` e `SpriteBatch.End()`
* Nunca aninhe chamadas `SpriteBatch.Begin()` sem antes chamar `SpriteBatch.End()`.
* Escolha conscientemente o `SpriteSortMode`:
  * **`SpriteSortMode.Deferred` (Padrão Recomendado):** Acumula os comandos na ordem de chamada e só envia para a GPU no `End()`. Ideal quando o grafo de cena (`Render Prepare`) da Starlight já ordenou as camadas e entidades.
  * **`SpriteSortMode.Texture`:** Ordena automaticamente por textura no `End()` para reduzir *texture swaps*, mas pode alterar a ordem de sobreposição se `layerDepth` não for gerenciado.
  * **`SpriteSortMode.FrontToBack` / `BackToFront`:** Exige passar `layerDepth` normalizado no intervalo $[0.0, 1.0]$.
  * **`SpriteSortMode.Immediate`:** Modifica o estado da GPU imediatamente no `Begin()` e dispara uma *draw call* para cada `Draw()`. **Evite**, exceto quando for estritamente necessário alterar parâmetros de um mesmo `Effect` entre dois sprites individuais.

### 3.3. `SamplerState` e Coordenadas Normalizadas $[0.0, 1.0]$
* Alterar o `SamplerState` exige encerrar o batch atual (`End()`) e iniciar um novo (`Begin(samplerState: ...)`).
* **Arte Pixelada / Retro (`sampling: point`):** Use `SamplerState.PointClamp` para evitar borramento bilinear e sangramento de bordas (*edge smearing*).
* **Fundos Repetidos / Scrolling (`Tile Sprite`):** Em vez de emitir dezenas de chamadas `Draw()` em loop para repetir um tile de fundo, use uma única chamada `SpriteBatch.Draw()` com um `destinationRectangle` maior que a textura e `SamplerState.PointWrap` (ou `LinearWrap`), deslocando a posição do `sourceRectangle` ao longo do tempo.
* **Cuidado ao Misturar 2D e 3D:** O `SpriteBatch` altera `BlendState`, `DepthStencilState`, `RasterizerState` e `SamplerStates[0]` no `GraphicsDevice`. Se houver renderização de primitivas (`DrawUserIndexedPrimitives`) ou 3D, restaure explicitamente os estados do `GraphicsDevice` após o `SpriteBatch.End()`.

---

## 4. `RenderTarget2D` e Escalonamento Independente de Resolução

Para suportar múltiplas resoluções de tela, *split-screen*, mini-mapas e renderização do jogo; o viewport editorial possui renderer separado (02):

1. **Alocação Fora do Loop:** Crie instâncias de `RenderTarget2D` apenas em `LoadContent()` ou em eventos de redimensionamento de janela — **nunca** dentro do método `Draw()`.
2. **Ordem de Execução (Offscreen Antes do Back Buffer):**
   * Popule todos os `RenderTarget2D` auxiliares **antes** de começar a desenhar no *Back Buffer* principal, pois `GraphicsDevice.SetRenderTarget(...)` limpa ou invalida o estado do alvo anterior dependendo do `RenderTargetUsage`.
3. **Contrato de Reset Obrigatório:**
   ```csharp
   // 1. Direciona a saída do GraphicsDevice para a textura offscreen
   GraphicsDevice.SetRenderTarget(_sceneRenderTarget);
   GraphicsDevice.Clear(Color.Black);

   _spriteBatch.Begin(samplerState: SamplerState.PointClamp, transformMatrix: cameraMatrix);
   DrawSceneEntities(_spriteBatch);
   _spriteBatch.End();

   // 2. OBRIGATÓRIO: Restaura o GraphicsDevice para o Back Buffer (tela) passando null
   GraphicsDevice.SetRenderTarget(null);

   // 3. Desenha o RenderTarget escalonado na tela
   GraphicsDevice.Clear(Color.CornflowerBlue);
   _spriteBatch.Begin(samplerState: SamplerState.PointClamp);
   _spriteBatch.Draw(_sceneRenderTarget, destinationScreenRect, Color.White);
   _spriteBatch.End();
   ```
4. **Ciclo de Vida e `ContentLost`:** Sempre faça `Dispose()` de um `RenderTarget2D` antigo antes de recriá-lo ao mudar a resolução, e trate eventos de perda de dispositivo gráfico (`GraphicsDevice.DeviceReset` / `IsContentLost`).

---

## 5. Shaders, `Effect` e Compilador `MGFXC`

O MonoGame utiliza o sistema próprio **MGFX** para compilar shaders para HLSL (DirectX), GLSL (OpenGL/Mobile) e formatos proprietários de console:

* **Armadilha de Parâmetros no `SpriteBatch` (Documentação Cap. 24):**
  * No modo padrão (`SpriteSortMode.Deferred`), o `Effect` passado em `SpriteBatch.Begin(effect: myEffect)` **só é aplicado quando `SpriteBatch.End()` é executado**.
  * Se você alterar `myEffect.Parameters["Param"].SetValue(...)` entre duas chamadas `SpriteBatch.Draw()` dentro do mesmo `Begin/End`, **apenas o último valor definido será aplicado a todos os sprites daquele lote**. Para aplicar parâmetros distintos por objeto, separe em blocos `Begin/End` ou agrupe por material.
* **Regras de Escrita de Shaders (`.fx`) para Multiplataforma:**
  * **Assinatura Exata:** Os parâmetros de entrada do *Pixel Shader* devem corresponder exatamente em **tamanho, tipo e ordem** às saídas do *Vertex Shader* (evitando corrupção de registradores entre DX e OpenGL).
  * **Sem Valores Padrão em OpenGL:** Valores default declarados diretamente nas variáveis do shader (`.fx`) **não funcionam em plataformas OpenGL**. Sempre inicialize os parâmetros via código C# (`Effect.Parameters[...].SetValue(...)`) ou use constantes `#define`.
  * **Remoção Agressiva de Parâmetros:** O compilador `MGFXC` remove parâmetros declarados que não são efetivamente utilizados no cálculo final do shader. Verifique se `Effect.Parameters["Nome"]` não é `null` ou faça cache da referência `EffectParameter` durante o carregamento do Material.
  * **Perfis e Macros:** Use `#if OPENGL` (`vs_3_0` / `ps_3_0`) versus `#else` (`vs_4_0_level_9_1` / `ps_4_0_level_9_1` ou `vs_4_0` / `ps_4_0` em perfil `HiDef`). Preshaders não são suportados.

---

## 6. Content Pipeline, `ContentManager` e `Starlight AssetDatabase`

A Starlight Engine mantém arquivos fonte + sidecars `.meta` com `AssetGuid` como verdade canônica do projeto, usando o pipeline do MonoGame como backend de compilação por target (ADR-SL-004 / ADR-SL-015):

* **Separação Design-Time vs. Runtime:**
  * Arquivos `.xnb` gerados pelo **MGCB** ou por outro backend do Content Pipeline validado na baseline adotada são artefatos binários acoplados à plataforma alvo (`DesktopGL`, `WindowsDX`, `Android`, `iOS`, Consoles).
  * Nunca versione arquivos `.xnb` ou efeitos `.mgfxo` como fonte da verdade do projeto.
* **Ponte `AssetGuid` $\rightarrow$ `ContentManager`:**
  * O código de jogo e os Behaviors nunca chamam `Content.Load<Texture2D>("caminho/relativo/string")` diretamente com caminhos mágicos. Eles solicitam um handle portátil de textura por `AssetGuid`. O adaptador resolve internamente `Texture2D` consultando o `AssetManifest` e a chave do `ContentManager`; tipos genéricos públicos do SDK não expõem `Texture2D`.
* **Gerenciamento de Tempo de Vida do `ContentManager`:**
  * Objetos carregados por `ContentManager.Load<T>()` pertencem ao cache interno daquele `ContentManager`.
  * **NUNCA chame `.Dispose()` individualmente** em uma `Texture2D`, `SpriteFont`, `SoundEffect` ou `Effect` que foi carregado via `ContentManager.Load<T>()`. Para liberar memória por cena/layout, crie uma instância secundária de `ContentManager(Game.Services, RootDirectory)` vinculada ao escopo da cena e chame `sceneContentManager.Unload()` ao descarregar a cena.
  * Caso um recurso gráfico seja instanciado manualmente em memória (`new Texture2D(...)`, `new RenderTarget2D(...)`), aí sim o sistema proprietário é obrigado a chamar `.Dispose()` explícito.
* **Portabilidade de Caminhos:** Nunca use barras invertidas hardcoded (`\\`). Use caminhos lógicos normalizados com `/` para chaves de conteúdo e `Path.Combine` para operações de I/O no host.

---

## 7. Sistema de Input Orientado a Estados e Ações

A API de input do MonoGame (`Keyboard`, `Mouse`, `GamePad`, `TouchPanel`) é baseada em *polling* de structs de estado por frame:

* **Padrão `PreviousState` vs. `CurrentState` (Documentação Cap. 11):**
  * O `Starlight.Runtime.MonoGame` deve capturar os estados uma única vez na Fase 1 (`Input Snapshot`) do frame:
    * **Estado Contínuo (`IsDown` / `IsUp`):** `CurrentState.IsKeyDown(key)`
    * **Transição de Borda (`WasJustPressed`):** `CurrentState.IsKeyDown(key) && PreviousState.IsKeyUp(key)`
    * **Transição de Soltura (`WasJustReleased`):** `CurrentState.IsKeyUp(key) && PreviousState.IsKeyDown(key)`
    * **Mouse Scroll Delta:** `CurrentState.ScrollWheelValue - PreviousState.ScrollWheelValue`
* **GamePads e Consoles:**
  * Sempre verifique `CurrentState.IsConnected` antes de ler alavancas (*ThumbSticks*), gatilhos (*Triggers*) ou botões de um `PlayerIndex`.
  * Normalize os dispositivos físicos em `InputActions` da Starlight para que Event Sheets e Behaviors consultem intenções (`Input.IsActionJustPressed("Jump")`) em vez de botões fixos de plataforma.

---

## 8. Arquitetura de Áudio (`SoundEffectInstance` vs. `MediaPlayer`)

Siga rigorosamente o padrão de gerenciamento de recursos de áudio do MonoGame (Documentação Cap. 15):

1. **Rastreamento e Limpeza de `SoundEffectInstance`:**
   * Evite o modo *fire-and-forget* puro (`soundEffect.Play()`) quando o jogo precisar pausar, retomar ou mutar efeitos sonoros ativos em grupo.
   * Crie instâncias com `soundEffect.CreateInstance()`, adicione-as a uma lista pré-alocada `_activeSoundEffectInstances` e, a cada frame (com loop `for` reverso `for (int i = count - 1; i >= 0; i--)`), verifique se `instance.State == SoundState.Stopped`:
     ```csharp
     if (instance.State == SoundState.Stopped)
     {
         if (!instance.IsDisposed)
         {
             instance.Dispose();
         }
         _activeSoundEffectInstances.RemoveAt(i);
     }
     ```
   * Implemente `IDisposable` no controlador de áudio para descartar todas as `SoundEffectInstance` ativas ao encerrar o jogo, prevenindo vazamento de canais de hardware.
2. **Cuidados com `MediaPlayer` e `Song`:**
   * Antes de iniciar uma nova música com `MediaPlayer.Play(song)`, verifique **obrigatoriamente** se `MediaPlayer.State == MediaState.Playing` e chame `MediaPlayer.Stop()` primeiro (evita falhas e travamentos de áudio em múltiplos targets do MonoGame).
   * Sempre limite volumes com `Math.Clamp(value, 0.0f, 1.0f)` para `MediaPlayer.Volume` e `SoundEffect.MasterVolume`.

---

## 9. Regras Oficiais de Preparação para Consoles e Memória (GC / AOT)

Requisitos de runtime, AOT, metadados e GC variam por target e SDK autorizado. As regras fortes vêm dos ADR-SL-016–018; recomendações de desempenho precisam de medição, não de garantias universais sobre consoles:

1. **Registros estáticos e ausência de geração dinâmica obrigatória:**
   * Não dependa de Reflection.Emit, compilação dinâmica ou descoberta/carregamento arbitrário de DLLs no gameplay. Reflexão permitida depende dos metadados preservados e do target; não há regra universal de crash para qualquer reflexão. Reflexão privada no MonoGame permanece proibida.
   * Use `System.Text.Json` por contrato da Starlight, com contexto gerado quando apropriado, ou leitores estáticos para artefatos binários. Isso não é uma afirmação de incompatibilidade universal de outra biblioteca com todos os consoles.
   * Nos targets que adotarem NativeAOT/trimming, habilite os analisadores correspondentes e resolva os avisos relevantes. Outros targets podem usar outra cadeia de publicação; não imponha PublishAot como gate universal.
2. **Meta de baixa alocação nos hot paths de `Update` e `Draw`:**
   * **Evite alocações recorrentes:** criação legítima de entidades e carregamentos podem alocar; pré-aloque objetos na inicialização/carregamento e use **Object Pooling** (listas de instâncias ativas vs. disponíveis) para projéteis, partículas, nós temporários e efeitos sonoros.
   * **Evite strings temporárias recorrentes:** evite concatenar strings (`"Score: " + score`) ou chamar `.ToString()` a cada frame dentro de `Update` ou `Draw`. Meça o impacto antes de otimizar; `StringBuilder.ToString()` também pode alocar. Considere `StringBuilder` reutilizado ou buffers de caracteres (`Span<char>`) apenas quando o valor numérico realmente mudar.
   * **LINQ em hot paths:** evite consultas que criem enumeradores, closures ou coleções temporárias por frame; avalie por perfil. Não presuma que toda consulta LINQ tenha a mesma alocação ou desempenho em todo target.
   * **Capacidade Inicial de Coleções e Loops `for`:** Sempre inicialize `List<T>` e `Dictionary<TKey, TValue>` com capacidade prévia (`new List<Entity>(256)`) para evitar realocações silenciosas do array interno. Prefira loops `for (int i = 0; ...)` indexados em vez de `foreach` quando iterar sobre interfaces ou coleções que possam causar *boxing* do enumerador.
3. **I/O e Serviços de Sistema Assíncronos:**
   * Nunca chame APIs de sistema operacional nativas (`win32`, `kernel`, comandos Unix).
   * Toda operação de salvamento de dados (*Save Data*), configurações de usuário ou conquistas deve ser modelada como **assíncrona** atrás de `IStorageService` / `IPlatformCapabilities`, para permitir adapters de plataforma e evitar bloquear a thread do Game Loop; as APIs concretas e sua natureza síncrona/assíncrona dependem do SDK.

## Contratos consolidados e interpretação de pendências

- A hierarquia é: objetivos funcionais → ADRs aprovados → documentos 00–09 → estudos como referência → estas instruções. Nomes de assemblies e assinaturas conceituais não afirmam que já existe código. Candidatos ADR-SL-023–027 são **Proposed / Pending Approval**, nunca requisitos aprovados.
- Core, ProjectModel, Events, SDK, contratos de plugins, scripts portáveis e C# gerado não expõem tipos MonoGame, inclusive `GameTime`, `Vector2` ou `Texture2D` em parâmetros genéricos. Use tipos Starlight; `FrameTime` contém `Delta`, `Total` (`TimeSpan`) e `FrameIndex` (`long`). Apenas adaptadores convertem tipos públicos MonoGame. Exemplo conceitual: `void PreEvents(FrameTime time); void PostEvents(FrameTime time);`.
- Preserve as nove fases do ADR-SL-010: Input Snapshot; Service PreUpdate; Behavior PreEvents; Event Sheet & Triggers; Behavior PostEvents; Physics & Late Systems; Render Prepare; MonoGame Draw; Debug & Telemetry. Não execute uma segunda passagem de eventos após a física. Fila de colisões e relação Update/Draw aguardam ADR-SL-025 em 09; múltiplos Updates por Draw não podem ser ignorados.
- Object-Ref é definição, Family é contrato/agrupamento, Container é composição, Instance UID é persistente e EntityId pertence à sessão de runtime. Sprite é componente opcional. Preserve Instance Override → Object-Ref → Family → Default. Regras avançadas de herança/transformações/lifetime aguardam ADR-SL-024; seleção de Containers não pode misturar membros de ocorrências distintas (05/09).
- Compilação: AST tipada → validação/tipos → IR com seleção → C# gerado → Roslyn → assembly. Use ACE IDs estáveis e SourceId; condições filtram instâncias e ações operam sobre selecionadas. Não simplifique o IR a booleanos globais. Regras de borda propostas de OR, criação/destruição e correlação estão em ADR-SL-027.
- Sidecars `.meta` são canônicos; Asset Database é índice reconstruível. Preserve campos opacos também em objetos aninhados e Undo/Redo. Não remapeie GUIDs ambíguos silenciosamente. Scripts referenciados usam AssetGuid de `.cs.meta` e binding estável para entrada C# (06). Envelope de `.addon`/dados não nomeáveis aguarda ADR-SL-026; não remova campos obrigatórios unilateralmente.
- Runtime usa registros gerados no build, não descoberta de DLLs. Nunca reflita membros privados MonoGame. AOT/trimming, publicação e capacidades são validados por target; não prometa consoles nem imponha PublishAot a todas as plataformas. Metas de baixa alocação aplicam-se a hot paths medidos; criação/carregamento legítimos podem alocar.
- Layout Editor e Visual Preview não executam gameplay nem DLLs arbitrárias. Renderer editorial tem contrato próprio (02); PixiJS não está aprovado. Discovery de addons é declarativa, MVP local/first-party. Executar importadores, geradores ou extensões continua sendo execução de código confiado, não sandbox automático.
- Development Player é processo externo; assets/propriedades seguros usam Live Reload, lógica/assemblies usam Fast Restart no MVP. Release não depende do Editor. Critérios documentais e exemplos não substituem testes reais por plataforma.
