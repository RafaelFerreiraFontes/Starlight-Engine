---
name: starlight-boundary-audit
description: Audita fronteiras arquiteturais de assemblies .csproj, isolamento estrito de MonoGame (ADR-SL-016), uso de FrameTime portável (ADR-SL-010/016) e conformidade de AOT e consoles (ADR-SL-017/018). Use ao verificar código C#, compilação, projetos .csproj ou antes de aprovar gates de QA.
---

# Starlight Boundary Audit

Esta skill estabelece o procedimento normativo para inspecionar e garantir a integridade das fronteiras de compilação (*Build Boundary*) e o isolamento de backends nativos na Starlight Engine, em estrita conformidade com **ADR-SL-016**, **ADR-SL-017** e **ADR-SL-018**.

## Quando Usar Esta Skill

Carregue esta skill quando:
- Criar ou modificar qualquer arquivo `.csproj` em `src/`.
- Adicionar ou refatorar tipos de domínio, contratos de SDK, comportamentos (`IBehavior`) ou geradores de código.
- Executar revisões arquiteturais ou gates de aceitação de código pelo `Starlight Architecture Reviewer` ou `Starlight QA Engineer`.
- Validar se código novo introduziu acoplamento indevido com o MonoGame ou backends de plataforma específicos.

## Regras Normativas de Isolamento

### 1. Pureza das Assemblies Centrais (`ADR-SL-016`)
As seguintes assemblies e contratos base de SDK devem possuir **zero referências** diretas ou indiretas a `Microsoft.Xna.Framework` e a quaisquer backends nativos:
- `Starlight.Core`
- `Starlight.ProjectModel`
- `Starlight.Events`
- `Starlight.Events.Compiler`
- `Starlight.Editor.Protocol`
- `Starlight.Editor.Host`
- `Starlight.Build`

**Proibições Expressas:**
- **Zero tipos do MonoGame em assinaturas portáveis:** É estritamente proibido o uso de `GameTime`, `Vector2`, `Color`, `Texture2D`, `GraphicsDevice` ou `SpriteBatch` nessas camadas, inclusive como argumentos de tipos genéricos.
- **Zero dependências de backend nativo:** Proibido referenciar `SDL`, `OpenGL`, `DirectX`, `SharpDX`, `System.Windows.Forms`, `DesktopGL` ou `WindowsDX`.
- **Camadas autorizadas a acessar MonoGame:** Apenas `Starlight.Runtime.MonoGame`, `Starlight.Rendering` e os adaptadores de empacotamento (`Starlight.Targets.*`) podem referenciar o `Microsoft.Xna.Framework`.

### 2. Tempo Portável com `FrameTime` (`ADR-SL-010` / `ADR-SL-016`)
- Interfaces portáveis de ciclo de vida (`IBehavior.PreEvents` e `IBehavior.PostEvents`) devem receber **`FrameTime`** e **nunca** `GameTime`:
  ```csharp
  public readonly record struct FrameTime(System.TimeSpan Delta, System.TimeSpan Total, long FrameIndex);

  public interface IBehavior
  {
      void PreEvents(FrameTime time);
      void PostEvents(FrameTime time);
  }
  ```
- O valor `FrameTime` é imutável: `Delta` representa o tempo decorrido da simulação, `Total` o tempo acumulado da simulação e `FrameIndex` (`long`) o contador ordinal de passos de simulação (`Update`).
- A conversão de `Microsoft.Xna.Framework.GameTime` para `FrameTime` é de responsabilidade exclusiva do adaptador `Starlight.Runtime.MonoGame`.

### 3. Modelo de Entidades vs. Componentes do Framework (`ADR-SL-008` / `ADR-SL-016`)
- Nenhum objeto de domínio ou entidade pode herdar de `Microsoft.Xna.Framework.GameComponent` ou `DrawableGameComponent`.
- A única classe autorizada a estender `Microsoft.Xna.Framework.Game` é a classe raiz do executável do host de runtime (`StarlightGame : Microsoft.Xna.Framework.Game`).

### 4. Portabilidade, Capacidades e Consoles (`ADR-SL-017` / `ADR-SL-018`)
- **Proibição de flags genéricas e diretivas de compilação:** Proibido o uso de `#if CONSOLE`, `#if DESKTOP` ou propriedades booleanas como `IsConsole` espalhadas no código.
- **Modelo Baseado em Capacidades:** Diferenças de plataforma devem ser consultadas através do descritor tipado `IPlatformCapabilities` (limites de textura, perfis de shader, storage seguro, esquemas de entrada).
- **Proibição de reflexão privada:** É estritamente proibido utilizar reflexão contra membros privados ou internos do MonoGame.
- **Zero JIT em tempo de execução:** Event Sheets são compiladas estaticamente em tempo de build. A descoberta de plugins e tipos utiliza registros gerados no build (*generated registries*), nunca `Assembly.Load` ou escaneamento dinâmico de DLLs no startup do jogo.
- **Swap Model sob NDA:** A adaptação para consoles futuros sob NDA ocorre por substituição do pacote de destino e injeção de adaptadores em workspace isolado (`Starlight.Targets.Console.*`), sem contaminar o código aberto.

## Execução Automatizada da Auditoria

Para auditar o código-fonte de forma rápida e segura, execute o script PowerShell fornecido pela skill:

```powershell
./.github/skills/starlight-boundary-audit/scripts/check-boundaries.ps1
```

O script verifica automaticamente:
1. Referências de pacotes em todos os `.csproj`.
2. Ocorrências de `GameTime`, `Microsoft.Xna.Framework`, `GameComponent`, `IsConsole` e `#if CONSOLE` fora das assemblies autorizadas.
3. Tentativas de reflexão privada contra o MonoGame.
4. Assinaturas de `IBehavior` recebendo `FrameTime`.

Consulte o arquivo de script: [check-boundaries.ps1](./scripts/check-boundaries.ps1).
