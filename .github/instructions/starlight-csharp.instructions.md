---
description: "Regras C# disponíveis; incorporação do original bloqueada"
applyTo: "**/*.cs"
---

# Regras C# disponíveis; incorporação do original bloqueada

Status: PARCIAL / BLOCKED para conversão integral. O original informado, instruções-de-gente-csharp-starlight-engine.md, não foi encontrado. Localize seu nome real sem renomeá-lo e incorpore integralmente as diretrizes normativas de nomenclatura, performance, segurança e demais regras antes de implementar código dependente. Este arquivo não substitui esse original.
Do pedido disponível: use projetos SDK-style, nullable consistente, implicit usings quando apropriado, dependências sem ciclos e testes xUnit reais. Escolha SDK estável/suportado após verificação de ferramentas e dependências, sem inventar versões.
Não exponha MonoGame em Core/ProjectModel/Protocol. Use System.Text.Json, envelopes aprovados, schemaVersion, GUIDs estáveis, JsonExtensionData para dados opacos, modelo persistido separado do runtime e serialização determinística conforme norma.
Não invente FrameTime, IDs prefixados, diagnósticos ou interfaces sem consultar os contratos. Não implemente ADR-SL-026 pendente. Não use TODO/NotImplementedException para simular funcionalidade pronta.
