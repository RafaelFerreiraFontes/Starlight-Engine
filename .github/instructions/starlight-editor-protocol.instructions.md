---
description: "Protocolo e autoridade de persistência do Host"
applyTo: "src/Starlight.Editor.*/**"
---

# Protocolo e autoridade de persistência do Host

Leia o ADR-SL-002 real antes de implementar. O pedido descreve sidecar .NET, bootstrap stdin/stdout, transporte principal WebSocket local/JSON-RPC, token de sessão e contratos tipados. Essa descrição não especifica envelopes ou métodos suficientes para inventá-los.
Host C# é autoridade do Project Model. Protocol não depende de MonoGame nem UI. Não exponha edição sem autenticação e validação. Se houver ping/handshake, implemente e teste segurança mínima e operação real.
Não declare IPC completo sem testar ciclo de vida, inclusive encerramento e falhas. Schemas e compatibilidade exigem rastreabilidade normativa e revisão independente.
