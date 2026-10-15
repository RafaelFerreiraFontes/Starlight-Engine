---
name: starlight-addon-scaffold
description: Padroniza a criação de Plugins, Behaviors e declarações de capacidades no CapabilityRegistry (ADR-SL-008, 009, 018, 021). Use ao criar novos addons, comportamentos de gameplay, componentes ou catálogos de ações, condições e expressões (ACE).
---

# Starlight Addon Scaffold

Esta skill estabelece a arquitetura obrigatória para a estruturação de pacotes de extensibilidade (Addons, Plugins, Behaviors e catálogo ACE) na Starlight Engine, com base nos **ADR-SL-008**, **ADR-SL-009**, **ADR-SL-018** e **ADR-SL-021**.

## Quando Usar Esta Skill

Carregue esta skill quando:
- Criar novos componentes visuais ou lógicos (Plugins) ou comportamentos de instâncias (Behaviors).
- Declarar novas Ações, Condições ou Expressões (catálogo ACE) para uso no editor de Event Sheets.
- Escrever schemas JSON de propriedades para geração automática de interfaces no Inspector React (*schema-driven UI*).
- Implementar o registro estático de capacidades gerado em tempo de compilação.

## Diretrizes Estruturais de um Addon

Todo Addon da Starlight deve ser estruturado em camadas independentes para respeitar a *Build Boundary* e os requisitos de segurança:

```text
meu-addon/
├── addon.manifest.json       # Manifesto declarativo do pacote (descoberta segura)
├── schemas/
│   └── properties.json       # JSON Schema das propriedades (renderização do Inspector)
├── editor/                   # Extensões opcionais exclusivas do editor (TypeScript / React)
└── runtime/                  # Código C# executável no jogo
    ├── MeuBehavior.cs        # Implementação de IBehavior com FrameTime
    └── GeneratedRegistry.cs  # Registro estático de tipos (emitido no build)
```

### 1. Segurança e Descoberta Declarativa no Editor (`ADR-SL-021`)
- O Editor da Starlight **nunca carrega ou executa DLLs C# arbitrárias** ao escanear a pasta de addons ou ao abrir um projeto.
- A descoberta inicial de capacidades, menus do editor, ícones e parâmetros de propriedades baseia-se **exclusivamente** na leitura dos arquivos declarativos JSON (`addon.manifest.json` e schemas adjacentes).
- Essa separação impede que código malicioso ou instável seja executado no processo do editor durante a navegação em projetos.

### 2. Catálogo ACE com Identificadores Estáveis (`ADR-SL-009`)
- Cada Ação, Condição e Expressão exposta pelo addon deve possuir um `id` imutável no formato namespaced:
  `pacote.vendor:ace-id` (ex.: `com.starlight.standard.platformer:jump`).
- O nome de exibição (`name`) e a descrição (`description`) podem ser traduzidos ou refatorados sem quebrar as folhas de eventos que já utilizam a capacidade.

### 3. Registro Estático em Tempo de Compilação (`ADR-SL-018`)
- É **proibido** o escaneamento dinâmico de assemblies (`Assembly.Load` / reflexão irrestrita) na inicialização do jogo exportado.
- Durante o build, a ferramenta de geração estática da Starlight inspeciona os addons referenciados pelo projeto e gera classes estáticas de registro (*generated registries*), garantindo compatibilidade total com plataformas fechadas, NativeAOT e consoles.

### 4. Ciclo de Vida do Behavior e Tempo Portável (`ADR-SL-010`)
- Behaviors devem implementar a interface `IBehavior` recebendo `FrameTime` nas fases contratuais de ciclo de vida:
  ```csharp
  using Starlight.Core;

  public sealed class PlatformerBehavior : IBehavior
  {
      // Executado na Fase 3 do loop determinístico de 9 fases
      public void PreEvents(FrameTime time)
      {
          // Atualiza física prévia, timers e coleta de intenção
      }

      // Executado na Fase 5 do loop determinístico de 9 fases
      public void PostEvents(FrameTime time)
      {
          // Reage às alterações provocadas pelas Event Sheets na Fase 4
      }
  }
  ```
- O ciclo segue rigorosamente o loop de 9 fases da Starlight: (1) Input, (2) Service PreUpdate, (3) **Behavior PreEvents**, (4) Event Sheets & Triggers, (5) **Behavior PostEvents**, (6) Physics, (7) Render Prepare, (8) Draw, (9) Debug.

### 5. Trava de Decisão (Decision Gate — `ADR-SL-026`)
> [!WARNING]
> O envelope padrão para manifestos `.addon` (utilizando um `id` GUID prefixado como descriptor independente de `packageId`) está classificado como **`Proposed / Pending Approval (ADR-SL-026)`**.
> Mantenha a separação entre o GUID do envelope e o identificador reverso `packageId`, sem alterar os campos obrigatórios antes da homologação final da proposta.

## Template de Referência

Consulte o template JSON completo de manifesto de addon fornecido pela skill:
[addon.manifest.json](./templates/addon.manifest.json)
