---
applyTo: "**/*.cs"
description: "Diretrizes de estilo, nomenclatura, boas práticas de C# moderno e restrições arquiteturais da Starlight Engine para agentes de IA no VS Code."
---

# Diretrizes de Codificação C# — Starlight Engine

Você é um engenheiro de software especialista em C# / .NET atuando no desenvolvimento da **Starlight Engine** (motor de jogos 2D e ferramentas de autoria baseadas em .NET, Roslyn e MonoGame). Todo código C# gerado, refatorado ou revisado deve seguir estritamente estas instruções.

---

## 1. Regras de Nomenclatura de Identificadores (Microsoft Standards)

Siga as diretrizes oficiais de nomenclatura do .NET sem exceções:

| Elemento | Convenção | Regras Adicionais & Exemplos |
| :--- | :--- | :--- |
| **Classes, Structs, Records, Enums, Delegates** | `PascalCase` | Use substantivos ou frases nominais (`ProjectGraph`, `EntityId`, `AssetRecord`). |
| **Interfaces** | `IPascalCase` | Prefixo `I` obrigatório + adjetivo ou substantivo (`IBehavior`, `IProjectCommand`, `IPlatformCapabilities`). |
| **Métodos, Propriedades, Eventos** | `PascalCase` | Métodos devem iniciar com verbos claros (`ValidateSchema`, `CompileEventSheet`, `TryResolveAsset`). |
| **Métodos Assíncronos** | `PascalCase` + `Async` | Sufixo `Async` obrigatório para métodos que retornam `Task` ou `ValueTask` (`LoadProjectAsync`). |
| **Campos Privados / Internos de Instância** | `_camelCase` | Prefixo sublinhado obrigatório (`_capabilityRegistry`, `_assetDatabase`). |
| **Campos `static readonly` (Privados)** | `s_camelCase` | Prefixo `s_` para estáticos e `t_` para `[ThreadStatic]` (`s_jsonOptions`). |
| **Constantes (`const` e `public static readonly`)** | `PascalCase` | Nunca use `SCREAMING_CAPS` (`MaxLayerCount`, `DefaultSchemaVersion`). |
| **Parâmetros e Variáveis Locais** | `camelCase` | Nomes descritivos; evite abreviações de uma letra fora de expressões lambda curtas (`entityId`, `sourceNode`). |
| **Parâmetros de Tipo Genérico** | `TPascalCase` | Prefixo `T` descritivo (`TBehavior`, `TAsset`) ou `T` único quando óbvio. |

### Restrições de Nomenclatura:
- **Zero Notação Húngara:** Nunca codifique o tipo no nome da variável (proibido `strName`, `intCount`, `objPlayer`).
- **Acrônimos:** Acrônimos de duas letras ficam em maiúsculas (`Id` é exceção: use `SourceId`, `EntityId`, `UiScale`, `IoService`); acrônimos de 3+ letras usam apenas a primeira maiúscula (`AstNode`, `JsonEnvelope`, `XmlReader`, `Guid`).

---

## 2. Estilo e Formatação de Código (Microsoft Coding Conventions)

- **Namespaces com Escopo de Arquivo:** Use sempre *file-scoped namespaces* (`namespace Starlight.Core;`).
- **Diretivas `using`:** Posicione fora do namespace, ordenadas alfabeticamente (com `System.*` primeiro), removendo `using` não utilizados.
- **Estilo Allman para Chaves:** Chaves de abertura (`{`) e fechamento (`}`) devem sempre estar em sua própria linha. Nunca omita chaves em blocos `if`, `else`, `for`, `foreach` ou `while` (exceto se for uma guarda de linha única extremamente simples, mas prefira chaves).
- **Indentação:** 4 espaços (nunca tabulações). Limite ideal de 120 caracteres por linha.
- **Uso de `var`:**
  - **USE `var`** apenas quando o tipo for inequivocamente evidente no lado direito da atribuição (`var entities = new List<Entity>();`, `var node = (TriggerEventNode)astNode;`).
  - **NÃO USE `var`** para tipos primitivos (`int`, `float`, `bool`, `string`) ou quando o retorno do método não deixar o tipo explícito (`ProjectSnapshot snapshot = GetCurrentState();`).
- **Expressões `new` Simplificadas (Target-typed `new`):** Use `new()` quando o tipo já estiver declarado à esquerda (ex: `private readonly Dictionary<Guid, Entity> _entities = new();`).
- **Membros com Corpo de Expressão (`=>`):** Use para propriedades somente leitura de uma linha e métodos triviais de linha única.
- **Interpolação de Strings:** Prefira `$" Asset '{assetId}' not found."` em vez de `string.Format` ou concatenação com `+`. Use *raw string literals* (`"""..."""`) para blocos JSON ou código C# gerado.

---

## 3. Boas Práticas de C# Moderno e Qualidade de Engenharia

1. **Tipos de Referência Anuláveis (NRT):**
   - `#nullable enable` é obrigatório e assumido em toda a solução.
   - Nunca use o operador de perdão de nulo (`!`) para silenciar avisos do compilador sem uma justificativa técnica explícita. Valide entradas com `ArgumentNullException.ThrowIfNull(param)`.
2. **Imutabilidade e Tipos de Dados:**
   - Use `record` ou `record struct` (`readonly record struct`) para DTOs de protocolo IPC, nós de AST, identificadores fortemente tipados (`EntityId`, `AssetGuid`, `SourceId`) e comandos/eventos imutáveis.
   - Use propriedades `init` para modelos de configuração desserializados.
   - Selar classes por padrão: adicione `sealed` em todas as classes que não foram explicitamente projetadas para herança.
3. **Princípios SOLID, DRY e KISS:**
   - **Responsabilidade Única (SRP):** Cada classe deve ter apenas uma razão para mudar. Um arquivo `.cs` deve conter apenas um tipo público principal.
   - **Retorno Antecipado (Guard Clauses):** Evite aninhamento profundo (*arrow code*). Valide pré-condições no topo do método e retorne/lance imediatamente.
   - **Sem Números/Strings Mágicos:** Extraia literais recorrentes para constantes nomeadas, `enum` ou registros estáticos.
4. **Tratamento de Erros e Result Pattern:**
   - Nunca capture `Exception` genérica sem relançar ou registrar adequadamente. Jamais use blocos `catch` vazios.
   - Não use exceções para controle de fluxo esperado (como validação de schema do usuário, colisão de GUID ou compilação de Event Sheet). Prefira o padrão `Try*` ou objetos de resultado estruturados contendo diagnósticos (`ValidationResult`, `DiagnosticBag`).
5. **Assincronismo e Gerenciamento de Recursos:**
   - Sempre propague `CancellationToken` em todos os métodos `async` (I/O de arquivos, IPC, compilação Roslyn).
   - No código de biblioteca/host (`Starlight.*`), use `.ConfigureAwait(false)` onde aplicável.
   - Proibido bloquear código assíncrono com `.Result` ou `.Wait()` (risco de deadlock).
   - Sempre utilize `using` ou `await using` para tipos que implementam `IDisposable` ou `IAsyncDisposable`.

---

## 4. Regras de Performance, Memória e Console/AOT-Safety (Crítico)

A Starlight Engine separa o **Host do Editor** do **Runtime do Jogo**. O código de Runtime (`Starlight.Runtime`, `Starlight.Core`, Behaviors e código gerado) tem metas de fluidez e baixa alocação verificadas por perfil e hardware. Compatibilidade **AOT e consoles** exige validação por target; não é uma garantia universal nem um limite fixo de FPS:

- **Meta de Baixa Alocação em Caminhos Quentes (Hot Path / Game Loop):**
  - Nas 9 fases do loop por frame (`PreEvents`, `Event Sheet`, `PostEvents`, `Physics`, `Render Prepare`, `Draw`), **evite alocações recorrentes e meça o orçamento de memória**. Carregamento e criação legítima de entidades podem alocar; não transforme uma recomendação de desempenho em proibição funcional.
  - **Evitar em hot paths medidos:** Consultas LINQ (`Where`, `Select`, `ToList`), closures que capturem variáveis em lambdas, *boxing* de `struct` para `object` ou interfaces, concatenação de strings e instanciação de coleções temporárias.
  - **Alternativas a avaliar por perfil:** Loops `for`/`foreach` sobre structs enumeradoras, `Span<T>`, `ReadOnlySpan<T>`, `ArrayPool<T>` e coleções pré-alocadas reutilizadas por frame.
- **Sem descoberta dinâmica ou geração de gameplay em runtime (ADR-SL-018):**
  - O código de runtime não pode usar `System.Reflection.Emit`, `dynamic`, `Assembly.LoadFrom` arbitrário ou descoberta de tipos via reflexão no startup do jogo.
  - Registros de Plugins, Behaviors e ACEs devem usar **Source Generators** ou tabelas de despacho estáticas geradas em tempo de build (`Generated Registries`).
  - É estritamente proibido usar reflexão para acessar membros `private` ou `internal` do MonoGame.

---

## 5. Contratos Arquiteturais Específicos da Starlight Engine

Ao escrever código, respeite os limites de projeto da solução:

1. **Isolamento Estrito do MonoGame (ADR-SL-016):**
   - `Starlight.Core`, `Starlight.ProjectModel`, `Starlight.Events` e contratos de plugins **NUNCA** podem referenciar `Microsoft.Xna.Framework` nem backends nativos (`SDL`, `OpenGL`, `DirectX`, `SharpDX`, `WinForms`).
   - Apenas `Starlight.Runtime.MonoGame` e `Starlight.Rendering` podem conversar com a API pública do MonoGame.
   - Nunca use diretivas `#if CONSOLE` ou flags booleanas `IsConsole` espalhadas na lógica; consulte sempre `IPlatformCapabilities` (ADR-SL-017).
2. **Serialização Determinística e Dados Opacos (ADR-SL-005 / 006 / 007):**
   - Use exclusivamente `System.Text.Json` (prefira Source Generation `JsonSerializerContext` para performance e compatibilidade AOT).
   - Todo documento raiz persistido deve conter o envelope padrão: `schema`, `schemaVersion`, `id` (GUID prefixado imutável) e `name` no JSON; propriedades C# podem usar PascalCase com mapeamento explícito.
   - Modelos de domínio serializáveis devem incluir uma propriedade com `[JsonExtensionData]` (`public Dictionary<string, JsonElement>? ExtensionData { get; set; }`) para preservar dados opacos de plugins desconhecidos sem corromper arquivos ao salvar.
   - Nunca serialize objetos vivos do MonoGame (`Texture2D`, `SoundEffect`); serialize apenas `AssetGuid` fortemente tipado.
3. **Mutação Transacional do Projeto (ADR-SL-003):**
   - Alterações no `ProjectModel` originadas pelo Editor nunca devem mutar propriedades soltas ou salvar arquivos diretamente da camada de IPC. Toda mutação durável deve ser encapsulada em uma implementação de `IProjectCommand` dentro de uma `ProjectTransaction` com suporte a `Validate()`, `Apply()` e `Invert()` (Undo/Redo).
4. **Compilador de Event Sheets e Código Gerado (ADR-SL-009 / 014):**
   - Todo código C# emitido pelo `Starlight.Events.Compiler` em `.starlight/generated/` deve incluir cabeçalho `<auto-generated />`, `#nullable enable` e instrumentar instruções com o `SourceId` (GUID do nó da AST) para rastreamento de erros e depuração visual.
   - O código gerado deve chamar exclusivamente a API de alto nível do `Starlight.Runtime` (ex: `Input.IsActionPressed(...)`), nunca APIs diretas de dispositivo do MonoGame.

---

## 6. Documentação e Testes

- **Comentários XML (`///`):** Obrigatórios em todas as interfaces, classes, métodos e propriedades `public` ou `protected` dos pacotes `Starlight.Core`, `Starlight.SDK` e `Starlight.Editor.Protocol`.
- **Comentários de Implementação (`//`):** Explique o **porquê** (decisões arquiteturais, invariantes matemáticas ou contornos de plataforma), nunca o *quê* o código óbvio está fazendo. Não deixe código comentado morto.
- **Testabilidade Headless:** Qualquer lógica de `ProjectModel`, `EventCompiler` e `Behaviors` (exceto submissão gráfica final) deve poder ser instanciada e testada via **xUnit** em modo *headless*, sem exigir uma janela aberta ou instância ativa de `GraphicsDevice`.

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
