---
name: starlight-schema-serializer
description: Guia a criação e manutenção de DTOs e serializadores JSON determinísticos para os documentos canônicos da Starlight (.starlight, .layout, .level, .object, .event, .tileset, .meta) conforme ADR-SL-004 a 007. Use ao criar modelos de persistência, DTOs em C# ou testes de round-trip.
---

# Starlight Schema Serializer

Esta skill define as diretrizes contratuais e técnicas para criação, manutenção e teste de DTOs de persistência e serializadores JSON dos documentos canônicos do projeto na Starlight Engine, com base nos **ADR-SL-004**, **ADR-SL-005**, **ADR-SL-006** e **ADR-SL-007**.

## Quando Usar Esta Skill

Carregue esta skill quando:
- Criar ou alterar classes DTO no namespace `Starlight.ProjectModel` ou `Starlight.Editor.Protocol`.
- Implementar serialização ou desserialização de arquivos `.starlight`, `.layout`, `.level`, `.object`, `.event`, `.tileset` ou sidecars `.meta`.
- Escrever testes automatizados de round-trip de persistência em xUnit.
- Lidar com versionamento de schemas JSON e migração de dados sem perda de extensibilidade.

## Regras Normativas de Serialização

### 1. Autoridade Exclusiva do Host .NET e `System.Text.Json` (`ADR-SL-007`)
- O **Host .NET (`Starlight.Editor.Host`)** é a **única autoridade** para serialização e desserialização de documentos canônicos do projeto em disco.
- O frontend em React/TypeScript **nunca** grava ou serializa diretamente esses arquivos.
- A serialização deve utilizar exclusivamente o `System.Text.Json` configurado para saída determinística:
  - Codificação UTF-8 padronizada.
  - Ordenação estável e ordinal de chaves JSON (via `[JsonPropertyOrder]`).
  - Formatação indentada consistente.
  - Proibição de valores especiais não-padronizados (`NaN`, `Infinity`).

### 2. Envelope Canônico Raiz Obrigatório (`ADR-SL-007`)
Todo documento persistido como raiz de arquivo em disco deve conter obrigatoriamente os 4 campos do envelope padrão:

| Campo | Tipo | Descrição e Contrato | Exemplo |
|---|---|---|---|
| `schema` | `string` | Identificador do tipo de schema do documento. | `"starlight.layout"` |
| `schemaVersion` | `int` | Versão do schema, inteiro sequencial iniciando em `1`. | `1` |
| `id` | `string` | Prefixo do tipo + `:` + UUID canônico no formato D (36 caracteres). | `"layout:00000002-1a2b-4c3d-8e9f-0123456789ab"` |
| `name` | `string` | Rótulo/nome legível pelo usuário (mutável sem quebrar referências). | `"Forest Level"` |

*Nota:* Registros aninhados dentro de um documento (como instâncias em um layout ou nós de AST) são registros filhos e **não** repetem o envelope raiz completo.

### 3. Matriz Estrita de Identificadores (Semântica de Identidade)
Para evitar corrupção do modelo e garantir rastreabilidade, diferencie com rigor os seguintes conceitos:

- **`AssetGuid` (`.meta`):** Identidade imutável de um asset físico importado (textura, som, fonte, script). Reside no sidecar `.meta` (`asset:f54d0e9a-...`). Movimentação externa sem `.meta` exige detecção assistida e diagnóstico, nunca gerando novo GUID silenciosamente.
- **`ResourceGuid` (Documentos):** Identidade imutável de recursos autorais (`layout:...`, `level:...`, `object:...`, `event:...`, `tileset:...`).
- **`Instance UID` (Layout/Level):** Identidade persistida no documento de cena atribuída a uma ocorrência de objeto (`instance:...`).
- **`EntityId` (Runtime Session):** Handle efêmero de sessão de gameplay em memória (índice + geração). **NUNCA** pode ser serializado em documentos duráveis!
- **`packageId` (Addon):** Namespace reverso do pacote (ex.: `com.example.platformer`).
- **`Plugin/Behavior ID`:** Identificador estável da capacidade (ex.: `com.starlight.standard:sprite`).
- **`ACE ID`:** Identificador estável de Action, Condition ou Expression (ex.: `com.starlight.platformer:jump`).
- **`SourceId` (AST Node):** UUID atribuído a cada nó de evento para vinculação a probes de debug e diagnósticos.

### 4. Preservação Obrigatória de Dados Opacos (`ADR-SL-006`)
- Para garantir compatibilidade com versões futuras da engine e permitir a abertura de projetos que usem plugins que não estejam instalados no ambiente atual, **todos os DTOs raiz e objetos aninhados extensíveis** devem declarar:
  ```csharp
  [JsonExtensionData]
  public Dictionary<string, JsonElement>? UnknownFields { get; set; }
  ```
- O ciclo de leitura → modificação → gravação (ou Undo/Redo) deve manter todas as propriedades desconhecidas **100% intactas**.
- Capacidades desconhecidas opcionais são preservadas silenciosamente; capacidades declaradas como obrigatórias (`required capabilities`) que estejam ausentes impedem o build, mas **nunca** apagam ou corrompem o arquivo ao abrir no editor.

### 5. Trava de Decisão (Decision Gate — `ADR-SL-026`)
> [!WARNING]
> O envelope padrão para manifestos `.addon` (com `id` em GUID e `packageId` separado) e a política de envelopes para caches e arquivos não-nomeáveis (`.starlight/cache/`, `.starlight/editor/`) estão catalogados como **`Proposed / Pending Approval (ADR-SL-026)`**.
> Nenhum DTO ou serializador pode alterar silenciosamente esses campos ou remover os campos obrigatórios do envelope antes da ratificação formal do ADR-SL-026.

## Critérios de Aceite e Testes xUnit

Toda implementação de DTO de persistência deve ser acompanhada de testes unitários de round-trip cobrindo:
1. **Serialização determinística:** Objeto populado serializado duas vezes produz JSON idêntico com ordenação de chaves previsível.
2. **Preservação de campos desconhecidos (Round-Trip Opaque):**
   - Injetar propriedades desconhecidas (`"_customPluginData": { "foo": 42 }`) no JSON de entrada.
   - Desserializar no DTO.
   - Modificar uma propriedade conhecida legítima.
   - Re-serializar e validar que o campo `_customPluginData` permanece intacto com tipo e valor exatos.
3. **Validação de ID prefixado:** Rejeitar IDs malformados que não correspondam ao padrão `prefixo:uuid-d`.

## Template de Referência

Consulte o template C# fornecido pela skill para implementar DTOs de envelope:
[DocumentEnvelopeTemplate.cs](./templates/DocumentEnvelopeTemplate.cs)
