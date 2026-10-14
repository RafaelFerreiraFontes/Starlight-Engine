# Starlight Engine

Engine com editor React/Tauri, Host C# e runtime portável. Consulte [arquitetura](instructions/starlight-architecture.instructions.md) e as instruções de área antes de editar.

As especificações esperadas ficam em ../docs/: objetivos funcionais, ADRs aprovados, índice 00 e documentos 01–09, registro de decisões e review. Hoje estão ausentes: não gere código dependente nem invente contratos. Os originais C#/MonoGame também precisam ser localizados e incorporados integralmente.

Código e instruções são subordinados aos contratos aprovados. Consulte os ADRs relevantes por tarefa. ADR-SL-023–027 permanecem propostas, não normas. Preserve arquivos existentes; não faça reset/clean destrutivo, commit ou push nesta tarefa.

Trabalhe em incrementos pequenos, teste comportamento real, obtenha revisão independente para mudanças importantes e documente evidências e bloqueios. Use o Starlight Coordinator para delegação delimitada; os arquivos VS Code não são agentes executados automaticamente pelo Codex CLI. Veja [relatório](../BOOTSTRAP_REPORT.md).
