---
description: "Events e compilação conforme semânticas aprovadas"
applyTo: "src/Starlight.Events*/**"
---

# Events e compilação conforme semânticas aprovadas

AST tipada, validação/símbolos, Capability Registry, Event IR, geração C#, Roslyn e SourceId pertencem às responsabilidades Events/Events.Compiler; o detalhamento depende dos documentos aprovados.
Preserve diagnósticos rastreáveis e seleção de instâncias conforme contratos. Mudança relevante de seleção exige revisão arquitetural independente via Coordinator.
Não implemente semânticas avançadas de ADR-SL-027 pendente. Não torne JavaScript obrigatório para gameplay. Testes devem verificar compilação e comportamento real, sem mocks que ocultem o compilador ausente.
