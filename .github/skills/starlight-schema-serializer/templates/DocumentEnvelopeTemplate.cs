using System;
using System.Collections.Generic;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace Starlight.ProjectModel.Serialization.Templates;

/// <summary>
/// Reference template for canonical root document DTOs in Starlight Engine.
/// Strictly implements ADR-SL-006 (Opaque Data Preservation) and ADR-SL-007 (Root Envelope & Identity).
/// 
/// Canonical documents: .starlight, .layout, .level, .object, .event, .tileset, .meta, .addon.
/// </summary>
public sealed class DocumentEnvelopeTemplate
{
    /// <summary>
    /// Schema discriminator string (e.g. "starlight.layout", "starlight.object", "starlight.event").
    /// </summary>
    [JsonPropertyName("schema")]
    [JsonPropertyOrder(1)]
    public string Schema { get; set; } = "starlight.example";

    /// <summary>
    /// Schema version number, sequential integer starting at 1.
    /// Incrementing indicates a structural migration is required.
    /// </summary>
    [JsonPropertyName("schemaVersion")]
    [JsonPropertyOrder(2)]
    public int SchemaVersion { get; set; } = 1;

    /// <summary>
    /// Canonical immutable identity in prefixed UUID form: lowercase kind + ':' + 36-char UUID (D-format).
    /// Examples: "layout:00000002-1a2b-4c3d-8e9f-0123456789ab", "asset:f54d0e9a-5a42-4dd4-9b4f-9a11d61bca62".
    /// </summary>
    [JsonPropertyName("id")]
    [JsonPropertyOrder(3)]
    public string Id { get; set; } = string.Empty;

    /// <summary>
    /// Human-readable display label/name. Mutable without breaking references.
    /// For .meta files, initially defaults to the source filename (candidate ADR-SL-026).
    /// </summary>
    [JsonPropertyName("name")]
    [JsonPropertyOrder(4)]
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// Strongly-typed payload or document body.
    /// </summary>
    [JsonPropertyName("data")]
    [JsonPropertyOrder(5)]
    public DocumentBodyTemplate Data { get; set; } = new();

    /// <summary>
    /// MANDATORY ROOT EXTENSION DATA (ADR-SL-006):
    /// Captures any unknown JSON properties at the root level so they are preserved
    /// intact during round-trip serialization (avoiding data loss from newer engine versions or disabled plugins).
    /// </summary>
    [JsonExtensionData]
    public Dictionary<string, JsonElement>? UnknownFields { get; set; }

    /// <summary>
    /// Helper to validate the prefixed UUID format.
    /// Format: [kind]:[8-4-4-4-12 hex digits]
    /// </summary>
    public bool HasValidPrefixedId(string expectedPrefix)
    {
        if (string.IsNullOrWhiteSpace(Id)) return false;
        var parts = Id.Split(':', 2);
        if (parts.Length != 2 || parts[0] != expectedPrefix) return false;
        return Guid.TryParseExact(parts[1], "D", out _);
    }
}

/// <summary>
/// Demonstrates that nested child objects MUST ALSO declare [JsonExtensionData]
/// to prevent opaque data loss inside subtrees (e.g. custom plugin properties, experimental features).
/// </summary>
public sealed class DocumentBodyTemplate
{
    [JsonPropertyName("description")]
    public string Description { get; set; } = string.Empty;

    [JsonPropertyName("items")]
    public List<NestedItemTemplate> Items { get; set; } = new();

    /// <summary>
    /// MANDATORY NESTED EXTENSION DATA (ADR-SL-006):
    /// Preserves unknown properties within child blocks.
    /// </summary>
    [JsonExtensionData]
    public Dictionary<string, JsonElement>? UnknownBodyFields { get; set; }
}

public sealed class NestedItemTemplate
{
    /// <summary>
    /// Instance UID or component slot ID.
    /// Note: Instance UID != EntityId. EntityId is an ephemeral runtime index+generation, never serialized here!
    /// </summary>
    [JsonPropertyName("slotId")]
    public string SlotId { get; set; } = string.Empty;

    [JsonPropertyName("pluginId")]
    public string PluginId { get; set; } = string.Empty;

    /// <summary>
    /// Preserves custom plugin properties even when the plugin assembly is not currently loaded.
    /// </summary>
    [JsonExtensionData]
    public Dictionary<string, JsonElement>? UnknownItemFields { get; set; }
}

/// <summary>
/// Standard serializer configuration helper enforcing deterministic JSON output.
/// </summary>
public static class StarlightJsonOptions
{
    public static readonly JsonSerializerOptions CanonicalOptions = new()
    {
        WriteIndented = true,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        DefaultIgnoreCondition = JsonIgnoreCondition.Never
    };
}
