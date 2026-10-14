# Starlight Engine

**A visual-first, C#-powered game engine built on MonoGame.**

Starlight is an open-source game engine and visual authoring environment in early development. Its goal is to bring together approachable visual workflows, reusable game-object composition, and the flexibility of C# in a native desktop tool, with a portable MonoGame-based runtime. The architecture describes the intended product; the repository is currently documentation and contributor-configuration groundwork, not a usable engine.

**Em português:** Starlight é uma engine de jogos de código aberto, baseada em C# e MonoGame, com foco em criação visual para desktop. O projeto está em fase inicial; ainda não há uma engine funcional. A documentação principal está em inglês.

**Status:** Early Development / Pre-Alpha · **License:** pending

## Vision

Starlight aims to combine visual, event-based game programming with handwritten C#, reusable Object-Refs, component composition, and extensible plugins and Behaviors. A desktop authoring environment is intended to make common 2D workflows approachable while keeping the runtime independent from editor tooling. Visual programming should help people express game logic without taking C# away from developers who need direct code and shared runtime APIs.

The project draws ideas from Construct 3, GDevelop, GameMaker, Godot, and other tools. It is an independent project, not a source-code fork or affiliated product.

## Development status

The bootstrap report says code generation was blocked until architectural specifications were available. The specifications are now present in `docs/`, but there are still no engine source projects or application manifests in this checkout. No gameplay, authoring, build, or export capability has been verified. A repository scaffold or the presence of design documents should not be read as a functioning engine.

| Area | Current status |
|---|---|
| Architecture and product objectives | Documented in `docs/`; ADR-SL-001–022 are the approved architectural decisions. |
| ADR-SL-023–027 | Proposed / Pending Approval; they are not implementation requirements. |
| Editor, .NET Host, runtime, and gameplay | Not implemented in this checkout. |
| Build, tests, Development Player, and export | No solution, project files, package manifest, or runnable path is present; not verified. |
| Contributor configuration | Custom VS Code agents and instructions are present under `.github/`. |
| Licensing | No license file is present; licensing is pending. |

## Intended capabilities

These are architectural goals, not currently available features.

- **Visual Layout Editor:** author scenes or rooms, position objects, manage layers, and preview supported visual effects. The Layout Editor is for authoring; it does not run gameplay.
- **Event Sheets:** build logic from Actions, Conditions, Expressions, subevents, and functions using a typed expression AST. The intended compiler generates C# and uses Roslyn.
- **C# scripting:** handwritten gameplay code and generated Event Sheet code are intended to use the same portable Starlight gameplay APIs.
- **Object-Refs and Containers:** define reusable object types from plugins, components, child objects, and Behaviors, with Families and instance overrides in the project model.
- **Plugins and Behaviors:** extend the engine with C# and declarative editor metadata; runtime registries are intended to be generated at build time.
- **Native Level Editor:** create levels with semantic grids and tilesets. Orthogonal levels and planned 16/47-tile auto-tiling are described in the architecture; they are not implemented here.
- **Development Player:** build a separate MonoGame executable for gameplay tests and structured diagnostics, independent of the editor process.
- **Portable runtime:** keep gameplay contracts independent of MonoGame-specific rendering types and isolate framework details in adapters. Desktop is the initial export focus; console support is not promised.

## Architecture stack

This table records the approved architecture, not installed or working dependencies in this repository.

| Component | Intended technology |
|---|---|
| Desktop shell | Tauri 2 |
| Editor frontend | React + TypeScript |
| Docking UI | Dockview |
| UI components | Shadcn UI / Radix UI / Tailwind CSS |
| Code editor | Monaco |
| Editor services | C# / .NET |
| C# tooling | Roslyn |
| Game runtime | MonoGame |
| Visual programming | Typed Event AST → generated C# |
| Testing | xUnit, Vitest, Playwright |

Zustand is intended for ephemeral editor UI state only; it is not the canonical project store. Project data and durable operations belong to the .NET Host and project files.

## High-level architecture

```text
Starlight Editor
  Tauri 2 + React/TypeScript
          |
          | Typed JSON-RPC
          v
Starlight.Editor.Host (.NET)
  Project Model
  Asset Database
  Event Compiler
  Build System
          |
          | Build / Runtime Projection
          v
Starlight Runtime
  C# Gameplay + Behaviors
  Plugins + Generated Events
          |
          v
MonoGame
```

This is the intended design. Exported games are designed to run without React, Tauri, the WebView, or editor services. Event Sheets and handwritten C# share portable gameplay APIs. MonoGame and rendering backend types belong behind runtime adapters rather than in portable engine contracts.

## Project and asset model

The documented format uses `.starlight` project manifests, `.layout` layouts, `.level` levels, `.object` definitions, `.event` Event Sheets, and `.tileset` resources. `.meta` sidecars carry asset identity; C# scripts and addons extend project content. Resource identity is GUID-based, data is serialized in granular files, and caches are reconstructible. Source assets and project data are distinct from generated build artifacts. These formats are specified but not implemented in this checkout.

See [Project Model](docs/05_Starlight_Project_Model.docx), [File Formats and Metadata Contracts](docs/06_Starlight_File_Formats_and_Metadata_Contracts.docx), [Asset GUIDs and Asset Database](docs/04_Starlight_Asset_GUIDs_and_Asset_Database.docx), and [Project Resource and Build Pipeline](docs/03_Starlight_Project_Resource_and_Build_Pipeline.docx).

## Repository structure

Current top-level contents (excluding Git internals):

```text
.
├── .github/
│   ├── agents/          # Custom VS Code agents
│   ├── instructions/    # Repository and area instructions
│   └── copilot-instructions.md
├── docs/                # Architecture specifications and research
└── BOOTSTRAP_REPORT.md  # Bootstrap findings and implementation blockers
```

There are no `src/`, `editor/`, `tests/`, `samples/`, or `templates/` directories in the current checkout.

## Getting started

### Development

There is no verified build or run command yet. This checkout contains no `.sln`, `.csproj`, `package.json`, Tauri configuration, or test projects, so .NET restore/build/test, frontend installation, and Tauri startup commands cannot be provided accurately. The bootstrap report recorded .NET SDK 7.0.410, Node.js 24.19.0, and pnpm 12.8.1 on the inspected machine; these observations do not establish project requirements. Rust/Cargo and the Tauri CLI were not found during that inspection.

Start by reading the architecture index, approved decisions, and bootstrap report before proposing implementation work. Do not infer package versions, schemas, or supported targets from the architecture stack table alone.

### Target workflow

The planned end-to-end workflow is to create a project, import resources, define Object-Refs, create Layouts and Levels, program with Event Sheets or C#, build and run the Development Player, then export for a supported target. This workflow has not been implemented or verified end to end.

## Documentation

The architecture specifications are `.docx` files that can be downloaded and opened in a compatible word processor.

**Architecture and editor**

- [Architecture definitions index](docs/00_Starlight_Architecture_Definitions_Index.docx)
- [Technology stack and architecture](docs/01_Starlight_Technology_Stack_and_Architecture.docx)
- [Editor, Layout, and Development Player](docs/02_Starlight_Editor_Layout_and_Development_Player.docx)

**Project data and pipeline**

- [Project Model](docs/05_Starlight_Project_Model.docx)
- [File Formats and Metadata Contracts](docs/06_Starlight_File_Formats_and_Metadata_Contracts.docx)
- [Asset GUIDs and Asset Database](docs/04_Starlight_Asset_GUIDs_and_Asset_Database.docx)
- [Project Resource and Build Pipeline](docs/03_Starlight_Project_Resource_and_Build_Pipeline.docx)

**Engine systems**

- [Level Editor and Tile Rule System](docs/07_Starlight_Level_Editor_and_Tile_Rule_System.docx)
- [Addon, Plugin, and Behavior Architecture](docs/08_Starlight_Addon_Plugin_and_Behavior_Architecture.docx)
- [Event Sheet and C# Compilation Pipeline](docs/09_Starlight_Event_Sheet_and_CSharp_Compilation_Pipeline.docx)

**Decisions and research**

- [Objectives](docs/Objetivos%20com%20a%20engine.md)
- [Decision register and ADRs](docs/Quest%C3%B5es%20em%20Aberto%20-%20Decis%C3%B5es.md) — ADR-SL-001–022 approved; ADR-SL-023–027 proposed/pending.
- [Architecture review report](docs/Starlight_Architecture_Review_Report.md)
- [MonoGame runtime architecture study](docs/MonoGame_Runtime_Architecture_Study_for_Starlight_Engine.docx)
- [GDevelop / Construct 3 architecture study](docs/GDevelop5_Construct3_Architecture_Study_for_Starlight_Engi.docx)
- [FlatRedBall / Gum architecture study](docs/FlatRedBall_Gum_Architecture_Study_for_Starlight_Engine.docx)
- [MonoGame best practices](docs/MonoGame%20-%20Best%20Practices.md)
- [C# contributor instructions](docs/instru%C3%A7%C3%B5es-de-gente-csharp-starlight-engine.md)
- [MonoGame contributor instructions](docs/instru%C3%A7%C3%B5es-de-agente-monogame-starlight-engine.md)
- [Bootstrap report](BOOTSTRAP_REPORT.md)

## AI-assisted development

The repository includes custom VS Code agents in `.github/agents/`, area instructions in `.github/instructions/`, and shared guidance in `.github/copilot-instructions.md`. The agents cover coordination, architecture review, C# core, MonoGame runtime, Event compiler, editor frontend, documentation research, and QA. Their files are guidance for compatible VS Code agent workflows; they are not evidence of engine implementation or automatic validation. Contributors and agents should follow approved ADRs, add tests with future code changes, and submit changes for review.

## Roadmap

The architecture suggests these planning stages; this is an organizational outline, not an approved schedule. No milestone below is marked complete.

1. Core foundation and Project Model.
2. Asset Database and serialization.
3. Editor and Host integration.
4. Layout authoring.
5. Event Sheets and C# compilation.
6. MonoGame Development Player.
7. Native Level Editor and tile rules.
8. Desktop build and export.

The architecture index describes a first end-to-end integration milestone and its acceptance evidence. Level editing and 16/47 auto-tiling are later work in that plan; dates and delivery commitments have not been established.

## Contributing

Contributions and careful architecture review are welcome. Before a substantial change, read the project objectives, relevant specifications, and approved ADRs. Keep changes focused, follow the C# and MonoGame guidance where applicable, include tests as implementation becomes possible, avoid unapproved API or schema changes, and document new architectural decisions. ADR-SL-023–027 need explicit approval before they can be treated as normative.

## License

Licensing is being finalized. The project is intended to be open-source, but repository permissions remain governed by applicable copyright law until a license is published.

## Acknowledgments

Starlight takes inspiration and research references from [MonoGame](https://www.monogame.net/), [Construct 3](https://www.construct.net/), [GDevelop](https://gdevelop.io/), [GameMaker](https://gamemaker.io/), [Godot](https://godotengine.org/), [LDtk](https://ldtk.io/), [Tiled](https://www.mapeditor.org/), [FlatRedBall](https://flatredball.com/), and [Gum](https://docs.flatredball.com/gum/). These references are not claims of dependency, affiliation, or endorsement.
