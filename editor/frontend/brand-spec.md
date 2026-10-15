# Starlight editorial prototype

Direction: tech-utility; utilitarian IDE density, dark mode required by the brief.
The source direction tokens are kept verbatim in styles.css and dark mode overrides their lightness. No external font or image requests.

| Token | Dark value |
|---|---|
| --bg | oklch(16% 0.012 250) |
| --surface | oklch(20% 0.012 250) |
| --fg | oklch(94% 0.006 240) |
| --muted | oklch(73% 0.018 240) |
| --border | oklch(30% 0.012 240) |
| --accent | oklch(76% 0.16 145) |

Display/body: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', system-ui, sans-serif (utility exception: one family). Mono: 'JetBrains Mono', 'IBM Plex Mono', ui-monospace, Menlo, monospace.

1. Hairline boundaries and compact, resizable panes; no card dashboard.
2. Green is reserved for selection and the preview action; amber communicates fallback.
3. Scene pixels are a procedural validation fixture, never a purported game project.
4. Project model and runtime actions show honest disconnected states.
5. Focus rings, paired hover colors and tabular numeric values throughout.
