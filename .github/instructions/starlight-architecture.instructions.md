---
description: "Arquitetura global e autoridade normativa"
applyTo: "**"
---

# Arquitetura global e autoridade normativa

Starlight é uma engine com editor, Host C# e runtime portável. As regras abaixo derivam do pedido de bootstrap; os documentos normativos ainda não estão neste workspace.
Ordem de autoridade: objetivos funcionais → ADR-SL-001–022 aprovados → documentos 00–09 → estudos de referência → instruções dos agentes. Consulte os documentos reais antes de definir contratos.
Fontes esperadas (ausentes; estes caminhos não comprovam existência):
- [Objetivos com a engine.md](../../docs/Objetivos%20com%20a%20engine.md)
- [Índice 00](../../docs/00_Starlight_Architecture_Definitions_Index.docx)
- [Questões em Aberto - Decisões.md](../../docs/Questões%20em%20Aberto%20-%20Decisões.md)
- [Architecture Review Report](../../docs//Starlight_Architecture_Review_Report.md)
- Documentos 01–09 e estudos em ../../docs/: localizar nomes reais antes de citar.
Preserve Build Boundary: editor, compilação e ferramentas de desenvolvimento não devem vazar para runtime exportável. O grafo exato depende dos documentos ausentes.
Separe Editor UI, shell Tauri, Host e runtime. Persistência autoritativa em C#; UI não escreve documentos canônicos. Core/ProjectModel/Protocol não expõem MonoGame; gameplay não exige JavaScript.
ADRs 023–027 permanecem propostas. Não decidir PixiJS obrigatório, colisões, casos especiais de persistência ou seleção avançada silenciosamente.
Exija build/testes reais, revisão independente para mudanças importantes e rastreabilidade. Sem normas acessíveis, bloqueie código dependente; não invente contratos.
