---
description: "Critérios transversais de teste e evidência"
applyTo: "**"
---

# Critérios transversais de teste e evidência

Execute validações pertinentes ao código alterado: dotnet restore, dotnet build Starlight.sln e dotnet test Starlight.sln quando solução/ferramentas existirem; instalação pnpm reproduzível com lockfile, scripts frontend de typecheck/build/testes; validação nativa Tauri separada.
Teste contratos, parsing inválido, serialização/round-trip e determinismo conforme normas. Não invente expectativas sem contrato.
Revise scripts antes de executá-los. Não use flags que escondam erros. Não trate arquivos criados como prova de compilação, Vite como desktop, ou configuração como disponibilidade do modelo.
Reporte PASS validado por execução; FAIL tentativa falhou; BLOCKED impedimento; NOT RUN não executado; MANUAL VALIDATION REQUIRED interação externa. Informe comandos, exit codes, escopo e limitações. Revisão importante deve ser independente; o revisor não corrige silenciosamente a implementação.
