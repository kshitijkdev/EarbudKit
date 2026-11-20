---
name: Sonic Neo-Glass
colors:
  surface: '#131318'
  surface-dim: '#131318'
  surface-bright: '#39383e'
  surface-container-lowest: '#0e0e13'
  surface-container-low: '#1b1b20'
  surface-container: '#1f1f24'
  surface-container-high: '#2a292f'
  surface-container-highest: '#35343a'
  on-surface: '#e4e1e9'
  on-surface-variant: '#c9c4d8'
  inverse-surface: '#e4e1e9'
  inverse-on-surface: '#303036'
  outline: '#938ea1'
  outline-variant: '#484555'
  surface-tint: '#cabeff'
  primary: '#cabeff'
  on-primary: '#31009a'
  primary-container: '#947dff'
  on-primary-container: '#2a0088'
  inverse-primary: '#603ce2'
  secondary: '#ffade3'
  on-secondary: '#5f004f'
  secondary-container: '#c000a2'
  on-secondary-container: '#ffe0f0'
  tertiary: '#a2d801'
  on-tertiary: '#263500'
  tertiary-container: '#759e00'
  on-tertiary-container: '#202e00'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#e6deff'
  primary-fixed-dim: '#cabeff'
  on-primary-fixed: '#1c0062'
  on-primary-fixed-variant: '#4816cb'
  secondary-fixed: '#ffd8ee'
  secondary-fixed-dim: '#ffade3'
  on-secondary-fixed: '#3a0030'
  on-secondary-fixed-variant: '#860070'
  tertiary-fixed: '#bdf532'
  tertiary-fixed-dim: '#a2d801'
  on-tertiary-fixed: '#141f00'
  on-tertiary-fixed-variant: '#384e00'
  background: '#131318'
  on-background: '#e4e1e9'
  surface-variant: '#35343a'
typography:
  display-hero:
    fontFamily: Space Grotesk
    fontSize: 56px
    fontWeight: '700'
    lineHeight: 64px
    letterSpacing: -0.03em
  display-hero-mobile:
    fontFamily: Space Grotesk
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 48px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Space Grotesk
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Space Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Space Grotesk
    fontSize: 20px
    fontWeight: '500'
    lineHeight: 28px
  title-md:
    fontFamily: Space Grotesk
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  label-lg:
    fontFamily: Space Grotesk
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 18px
    letterSpacing: 0.02em
  label-md:
    fontFamily: Space Grotesk
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.04em
  label-sm:
    fontFamily: Space Grotesk
    fontSize: 10px
    fontWeight: '700'
    lineHeight: 14px
    letterSpacing: 0.08em
rounded:
  sm: 0.5rem
  DEFAULT: 1rem
  md: 1.5rem
  lg: 2rem
  xl: 3rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-desktop: 1.5rem
  margin: 1rem
  margin-tablet: 2rem
  margin-desktop: 3rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
---

## Brand & Style
The design system targets digital natives, audio obsessives, and tech enthusiasts seeking premium agency over unbranded or budget-tier Bluetooth hardware. The brand identity fuses the kinetic, expressive youth culture of modern music streaming platforms with the stripped-back, technical transparency of contemporary hardware interfaces. It delivers an emotional experience that is tactile, dynamic, and hyper-modern: turning utilitarian Bluetooth connection management into an immersive, club-adjacent audio console.

The style synthesizes **Glassmorphism**, **Neo-Brutalism data density**, and **Techno-Minimalism**:
- **Deep Void Backgrounds:** Obsidian and deep-space tones absorb glare and let neon accents emit raw visual energy.
- **Luminous Glass Surfaces:** Frosted, translucent card surfaces layered with crisp, ultra-fine 1px reactive glowing borders.
- **Hardware-Informed Modular Grids:** Bento-style modular layouts framing battery telemetry, spatial EQ nodes, latency toggles, and gesture mapping.
- **Electric Micro-Interactions:** Snappy mechanical feedback loops accompanied by neon glows for status switching, dynamic frequency visualizers, and state transitions.

## Colors
The palette relies on a pitch-black foundation paired with high-frequency neon accents to replicate LED indicators, audio spectrum analysers, and festival nightscapes.

- **Base Void (`#0B0B10`):** The primary canvas substrate, absorbing ambient distractions and preserving OLED energy efficiency.
- **Electric Violet (`#7C5CFF`):** The primary action and brand accent. Used for core interactive triggers, selected states, and connectivity beams.
- **Hot Pink (`#FF4FD8`):** The secondary accent. Assigned to acoustic profile shifts, spatial audio modes, and high-frequency gain peaks.
- **Lime Neon (`#C6FF3D`):** The high-alert tertiary accent. Dedicated strictly to live telemetry, active audio streams, pairing confirmation, low-latency mode toggles, and battery health above 20%.
- **Surface Translucencies:** Built using layered opacities of neutral whites and slate purples (`rgba(255, 255, 255, 0.04)` to `rgba(124, 92, 255, 0.08)`) with `backdrop-filter: blur(24px)`.
- **Borders & Seams:** Razor-thin strokes (`rgba(255, 255, 255, 0.12)`) shifting dynamically to 30% alpha of primary/tertiary colors when cards become active or hovered.

## Typography
Typography is an intentional contrast between expressive technical display styles and highly neutral, transparent body text.

- **Headlines & Technical Badges (Space Grotesk):** Provides chunky geometric architecture, distinctive square terminals, and rhythmic digital character. Used for model codes, decibel displays, battery percentages, and screen titles. Uppercase treatments with tracking (`+0.04em` to `+0.08em`) are mandatory for metadata tags and status indicators.
- **Interface & Operational Text (Inter):** Neutral, clean, and legible at small scales. Used for device descriptions, gesture setup steps, troubleshooting, and modal subtext to ensure effortless scanning against deep blurred layers.

## Layout & Spacing
The layout model employs a fluid bento-grid system calibrated to modular technical tiles.

- **Grid Architecture:** 
  - **Mobile (< 768px):** 4-column layout with `1rem` margins and `1rem` gutters. Cards snap into full-width or 2-column square modules.
  - **Tablet (768px - 1024px):** 8-column layout with `2rem` margins and `1rem` gutters.
  - **Desktop (> 1024px):** 12-column layout capped at `1280px` max-width with `3rem` margins and `1.5rem` gutters.
- **Rhythm & Safe Areas:** Interface cards stick to an 8pt base grid for all interior padding. Navigation anchors float `1.5rem` above the bottom screen safe area, maintaining clear clearance for single-handed thumb operations.

## Elevation & Depth
Elevation abandons traditional drop shadows in favor of translucent layering, spatial blur, and localized neon luminosity.

- **Surface Tiers:**
  - **Canvas Base:** `#0B0B10` solid backdrop.
  - **Level 1 (Bento Panels):** Semi-opaque background (`rgba(255, 255, 255, 0.03)`), backdrop blur `24px`, bound by a crisp 1px stroke (`rgba(255, 255, 255, 0.08)`).
  - **Level 2 (Active/Hover Panels):** Translucent tint (`rgba(124, 92, 255, 0.06)`), 1px border (`rgba(124, 92, 255, 0.35)`), and an ambient outer glow (`box-shadow: 0 0 24px -4px rgba(124, 92, 255, 0.2)`).
  - **Level 3 (Modals & Overlays):** `#12121A` at 85% opacity, backdrop blur `32px`, border (`rgba(255, 255, 255, 0.16)`), with directional drop blur (`0 16px 40px rgba(0, 0, 0, 0.8)`).
- **Floating Controls:** Floating navigation shells use `backdrop-filter: blur(20px)` at 70% dark opacity with subtle neon edge refraction.

## Shapes
A unified pill and super-ellipse shape vocabulary echoes contemporary earbud charging cases and fluid acoustic hardware styling.

- **Container Curves:** Primary bento panels and sheets use standard large radiuses (`24px` / `1.5rem`), creating a soft, tactile frame around dense technological readouts.
- **Interactive Units:** Buttons, status badges, frequency tags, and tab rails enforce full pill morphology (`rounded-full` / `9999px`).
- **Inner Nodes:** Sliders, EQ curve anchor points, and toggles adopt circular forms to emphasize touch manipulation.

## Components

### Buttons & Interactive Pills
- **Primary Action Pill:** Solid Electric Violet (`#7C5CFF`) background with crisp white typography. Interactive hover/press triggers a Lime Neon halo (`box-shadow: 0 0 16px rgba(198, 255, 61, 0.4)`).
- **Secondary Action Pill:** Translucent surface (`rgba(255, 255, 255, 0.06)`), 1px border (`rgba(255, 255, 255, 0.12)`), text in `#FFFFFF`. Hover brightens the border to `#FF4FD8`.
- **Ghost/Tertiary:** Zero background fill, pure neon text (`#C6FF3D`), targeted for contextual inline toggles (e.g., "DISCONNECT").

### Bento Cards & Telemetry Tiles
- Modules house distinct metrics: left/right earbud battery levels, charging case status, active codec (LDAC, AAC), and low-latency gaming mode.
- Each tile features a 24px border radius, frosted glass backdrop, and an optional reactive top-right indicator node that pulses in Lime Neon when real-time telemetry updates.

### Floating Pill Navigation
- Centered dock elevated over content using 9999px border radius and 24px backdrop blur.
- Hosts micro-sized iconography with Space Grotesk labels that shift from muted grey (`#6B6B7B`) to vibrant Electric Violet with Hot Pink micro-dots when active.

### Sliders & EQ Nodes
- **Equalizer Trackers:** Slim, un-grooved 4px tracks in deep charcoal (`#1C1C26`) with dynamic gradients running between Electric Violet and Hot Pink for active ranges.
- **Knobs:** Pure white 20px circular thumbs bordered with a 2px glowing Lime Neon rim during drag operations.

### Input Fields & Toggles
- **Search & Alias Inputs:** Pill or 24px rounded inputs with inner glass depth (`rgba(0, 0, 0, 0.4)`), interior stroke `rgba(255, 255, 255, 0.08)`, and neon violet focus rings.
- **Toggle Switches:** Chunky pill track (`44px x 24px`) with a sliding circular thumb. "On" state floods the track with Lime Neon (`#C6FF3D`) and pairs with black indicator symbols.

### Chips & Glowing Status Badges
- Compact pill-shaped metadata chips displaying connection protocols, bitrate, and codec tags.
- Prefixed with an animated or solid 6px dot: Green (`#C6FF3D`) for paired/active, Violet (`#7C5CFF`) for searching/pairing, and Pink (`#FF4FD8`) for gaming/spatial mode enabled.