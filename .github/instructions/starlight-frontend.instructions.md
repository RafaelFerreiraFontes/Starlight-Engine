---
description: "Interface React e shell Tauri subordinados ao Host"
applyTo: "editor/**"
---

# Interface React e shell Tauri subordinados ao Host

Antes de modificar ou estender `editor/frontend/`, consulte o [guia de arquitetura e implementação do frontend](../../docs/10_Starlight_Editor_Frontend_Architecture_and_Implementation_Guide.md), distinguindo o protótipo existente dos contratos ainda pendentes.

Use React/TypeScript, Dockview, Tailwind, Shadcn UI/Radix, Zustand para estado efêmero e estrutura preparada para Monaco/TanStack Virtual conforme baseline verificada. pnpm com lockfile e scripts reproduzíveis de typecheck/build/testes.
A interface contém Scene/Layout View, Project Explorer, Inspector e Console com estados vazios honestos. Não simule respostas do Host, nem chame canvas decorativo de editor concluído.
UI e Tauri não contêm domínio nem escrevem arquivos canônicos. Consuma contratos tipados aprovados do Host C#. Tauri 2 é shell; sua inicialização deve ser testada separadamente do Vite.
ADR-SL-023 pendente: PixiJS/WebGL não é dependência obrigatória. IPC, concorrência e consistência complexos exigem coordenação com C#.
Não gere contratos ou código dependente de documentação ausente.
