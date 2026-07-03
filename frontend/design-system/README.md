# Ouija design system

Dark-only, two-tone. The palette is sampled directly from the Ouija badge.

## Palette

| Token | Hex | Role |
| --- | --- | --- |
| `--color-perception` | `#F82090` | signature hot pink — primary signal / data accent |
| `--color-operator` | `#B96CE6` | violet — chrome / secondary accent |
| `--color-adaptation` | `#FF7AB8` | light pink — tertiary |
| `--color-obsidian` | `#060309` | near-black ground |
| `--color-panel` | `#130A16` | dark-magenta panel |
| `--foreground` | `#F7EEF6` | off-white text |

### Mind-state scale (pink→violet arc)

| State | Token | Hex |
| --- | --- | --- |
| calm | `--color-state-calm` | `#B98CE6` |
| focused | `--color-state-focused` | `#F82090` |
| stressed | `--color-state-stressed` | `#FF3366` |
| fatigued | `--color-state-fatigued` | `#7A5CB0` |

## Where it lives

The single source of truth is the Tailwind v4 `@theme` block in
[`../app/globals.css`](../app/globals.css) — there is no `tailwind.config` file.
Editing the CSS custom properties there re-skins every component, since they all
consume the semantic tokens (`text-perception`, `bg-state-focused`, …) rather
than hard-coded colors.

`STATE_VISUALS` in [`../lib/state-visuals.ts`](../lib/state-visuals.ts) maps each
mind-state to its utility classes and glow, and is the one place a state's hue is
defined for components.

The visual language and several presentational components (radar, sparkline,
radial gauge, glass panels, corner brackets) are forked from Ethereal Computing's
Providence console and retuned to this palette.
