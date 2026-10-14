---
description: "Runtime e isolamento MonoGame; incorporação do original bloqueada"
applyTo: "src/Starlight.Runtime*/**"
---

# Runtime e isolamento MonoGame; incorporação do original bloqueada

Status: PARCIAL / BLOCKED para conversão integral. instruções-de-agente-monogame-starlight-engine.md está ausente. Localize o original pelo nome real e preserve todas as regras, inclusive asset pipeline, performance, segurança, nomenclatura e isolamento MonoGame. Não considere este texto uma conversão integral.
Leia também [C#](starlight-csharp.instructions.md). Isole dependências MonoGame no adaptador Runtime.MonoGame, mantendo contratos portáveis em Runtime/Core. Respeite ciclo de vida e descarte de recursos gráficos, conteúdo, áudio e input conforme normas quando acessíveis.
Identifique assets por IDs estáveis, nunca exclusivamente por caminho. Não implemente colisões pendentes. Valide inicialização real separadamente de gameplay e Development Player completo; registre bloqueios nativos.
