---
name: Soft Studio Audio
colors:
  surface: '#131315'
  surface-dim: '#131315'
  surface-bright: '#39393b'
  surface-container-lowest: '#0e0e10'
  surface-container-low: '#1b1b1d'
  surface-container: '#1f1f21'
  surface-container-high: '#2a2a2c'
  surface-container-highest: '#353437'
  on-surface: '#e4e2e4'
  on-surface-variant: '#e6bdbc'
  inverse-surface: '#e4e2e4'
  inverse-on-surface: '#303032'
  outline: '#ad8887'
  outline-variant: '#5d3f3f'
  surface-tint: '#ffb3b2'
  primary: '#ffb3b2'
  on-primary: '#680013'
  primary-container: '#ff525e'
  on-primary-container: '#5b0010'
  inverse-primary: '#bf002c'
  secondary: '#c6c6cb'
  on-secondary: '#2f3034'
  secondary-container: '#46464b'
  on-secondary-container: '#b5b4ba'
  tertiary: '#c8c6c8'
  on-tertiary: '#303032'
  tertiary-container: '#919092'
  on-tertiary-container: '#29292b'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#ffdad9'
  primary-fixed-dim: '#ffb3b2'
  on-primary-fixed: '#410008'
  on-primary-fixed-variant: '#92001f'
  secondary-fixed: '#e3e2e7'
  secondary-fixed-dim: '#c6c6cb'
  on-secondary-fixed: '#1a1b1f'
  on-secondary-fixed-variant: '#46464b'
  tertiary-fixed: '#e4e2e4'
  tertiary-fixed-dim: '#c8c6c8'
  on-tertiary-fixed: '#1b1b1d'
  on-tertiary-fixed-variant: '#474649'
  background: '#131315'
  on-background: '#e4e2e4'
  surface-variant: '#353437'
typography:
  headline-lg:
    fontFamily: Inter
    fontSize: 34px
    fontWeight: '700'
    lineHeight: 41px
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 34px
  headline-sm:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '700'
    lineHeight: 25px
  body-lg:
    fontFamily: Inter
    fontSize: 17px
    fontWeight: '600'
    lineHeight: 22px
  body-md:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 13px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-mobile: 0.75rem
  margin: 1.5rem
  margin-mobile: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.25rem
  space-xl: 1.5rem
---

## Brand & Style

The design system establishes an ultra-refined, editorial companion interface for high-fidelity audio hardware on Android. The aesthetic balances Apple Music's crisp architectural restraint with physical studio monitor precision. 

- **Personality:** Tactile, pristine, acoustic, whisper-quiet confidence.
- **Visual Style:** Soft Studio minimalism. Surfaces rely on pure flat foundations activated by subtle ambient back-glows that trace hardware acoustics. Structural discipline replaces ornamentation: hairline segmentations, rigorous typographic scale, and ample negative space ensure hardware controls feel physical, tactile, and immediate.
- **Imagery & Iconography:** Strictly clean vector iconography with continuous geometric strokes. Emojis and novelty decorations are forbidden; audio device renders, frequency graphs, and precision gauges serve as the visual centerpieces.

## Colors

The palette centers on pure functional contrast, led by an electric audio-red accent against deliberate dark and light acoustic surfaces.

### Dark Mode (Default)
- **Canvas (Background):** `#000000` (Pure pitch black for OLED contrast)
- **Card Surface:** `#1C1C1E` (Subtle dark graphite container)
- **Raised / Inset Surface:** `#2C2C2E` (Secondary recessed controls, toggles, and tracks)
- **Primary Text & Icons:** `#FFFFFF`
- **Secondary / Subdued Text:** `#8E8E93`
- **Hairline Divider / Border:** `rgba(255, 255, 255, 0.10)`

### Light Mode
- **Canvas (Background):** `#F2F2F7` (System neutral off-white)
- **Card Surface:** `#FFFFFF` (Pure white acoustic plates)
- **Raised / Inset Surface:** `#E5E5EA` (Recessed wells, sliders, track grooves)
- **Primary Text & Icons:** `#000000`
- **Secondary / Subdued Text:** `#6C6C70`
- **Hairline Divider / Border:** `rgba(0, 0, 0, 0.08)`

### Accent Application
- **Vivid Accent (`#FA2D48`):** Reserved exclusively for active operational states: EQ active nodes, noise cancellation active states, volume/battery levels above safety limits, primary interactive controls, and playback/connectivity indicators.
- **Ambient Device Glow:** A diffused radial tint derived from `#FA2D48` (12% to 18% opacity, blur radius 40px–60px) cast directly behind transparent device cutouts to indicate connection status and soundstage activation.

## Typography

Typography relies entirely on `Inter` to deliver an uncompromising neutral, typographic hierarchy akin to high-end audio engineering documentation.

- **Large Title (`headline-lg` / `headline-lg-mobile`):** 34px (desktop/tablet) / 28px (mobile), weight 700. For primary screen headings and connected device names. Tracking is tight (-0.4px).
- **Section Titles (`headline-sm`):** 20px, weight 700. Structural group headers dividing audio categories (e.g., "Noise Control", "Spatial Audio", "Equalizer").
- **List Items & Primary Row Labels (`body-lg`):** 17px, weight 600. Navigation items, toggle labels, and slider identifiers.
- **Standard Body & Readouts (`body-md`):** 15px, weight 400. Descriptive text, setup guidance, and diagnostic feedback.
- **Secondary Metadata (`label-md`):** 13px, weight 400. Battery percentages, codec labels (e.g., "LDAC 990kbps"), and subordinate settings.
- **Metric Badges / Audio Chips (`label-sm`):** 11px, weight 600, uppercase letter-spacing (+0.5px). For compact pill tags such as "ANC ON", "LOSSLESS", and "LOW LATENCY".

## Layout & Spacing

The layout model is anchored to a mobile-first, vertical modular flow designed for fluid thumb accessibility and rapid hardware parameter manipulation.

- **Grid & Margins:** Fluid single-column architecture for mobile (margins: `1rem` / 16px), expanding into an 8-column layout for tablets and foldable inner displays (margins: `1.5rem` / 24px).
- **Spacing Rhythm:** Built on an absolute 4px/8px modular base. 
  - `space-xs` (4px): Sub-element padding, icon-to-label separation.
  - `space-sm` (8px): Internal grouping within cards and metric displays.
  - `space-md` (16px): Standard internal card padding and intra-list item spacing.
  - `space-lg` (20px): Card padding for prominent hero tiles and device showcases.
  - `space-xl` (24px): Structural gaps between card sections and grouped feature modules.
- **Touch Target Integrity:** Every interactive zone maintains an absolute minimum hit-box of 48px × 48px, even when the visual asset (such as an audio toggle or slider handle) is styled more delicately.

## Elevation & Depth

This design system avoids traditional dropped drop shadows or floating elevations. Depth is defined through planar tonal stratification and translucent hairline containment.

- **Tonal Layers:** The lowest tier is Canvas (`#000000` / `#F2F2F7`). Resting atop this are Card Surfaces (`#1C1C1E` / `#FFFFFF`), followed by Inset Surfaces (`#2C2C2E` / `#E5E5EA`) for interactive troughs, segmented switch track wells, and text inputs.
- **Hairlines:** Card components, sheets, and grouped audio modules are enclosed in ultra-crisp `0.5px` hairline borders (`rgba(255, 255, 255, 0.10)` in dark mode; `rgba(0, 0, 0, 0.08)` in light mode).
- **Active Ambient Device Glow:** Interactive hardware status is communicated via radial lighting beneath the device display. Instead of an exterior box shadow, hardware hero components render a soft, tinted gradient (`#FA2D48`, 15% opacity, 50px blur, no spread) centered beneath the hardware silhouette.
- **Modal Sheets:** Bottom audio sheets use Card Surface tonal styling with a 0.5px top border, resting over an ambient `rgba(0, 0, 0, 0.70)` canvas wash.

## Shapes

The geometry balances soft, generous container curvature with absolute pill geometry for micro-controls.

- **Cards, Containers & Artwork:** Fixed `20px` border-radius (`rounded-lg` equivalent). Applied consistently to audio card modules, album art, EQ spectrum containers, and bottom-sheet top quadrants.
- **Buttons, Chips & Micro-Interactions:** Fully rounded `9999px` pill contours. Applied to noise control selector tabs, action triggers, volume knobs, status tags, and audio profile chips.
- **Gauges & Sliders:** Fluid pill-ended tracks (`9999px`) with circular control thumbs (28px diameter with a 48px invisible touch field).

## Components

### Buttons & Action Controls
- **Primary Button:** Pill-shaped (`9999px` radius), height 50px. Solid `#FA2D48` fill with pure `#FFFFFF` 17px semibold text. Pressed state drops opacity to 85% with a subtle scale transform (0.98).
- **Secondary Button:** Pill-shaped, height 50px. Inset Surface fill (`#2C2C2E` dark / `#E5E5EA` light), 0.5px hairline border, with Primary Text color.
- **Icon Action Buttons:** 48px circle with an Inset Surface fill and 20px centered vector stroke icon.

### Cards & Audio Modules
- **Surface:** Solid Card Surface (`#1C1C1E` / `#FFFFFF`) with a `20px` border radius and `0.5px` border.
- **Section Headers:** Placed outside or top-anchored inside cards, set in 20px bold (`headline-sm`).
- **Device Showcase Card:** Features the connected earbud asset centered above the dynamic `#FA2D48` glow, flanked by battery indicators for Left, Right, and Case.

### Segmented Modes (Noise Cancellation Selector)
- **Container:** Pill-shaped enclosure (`9999px`), height 44px, filled with Inset Surface (`#2C2C2E` / `#E5E5EA`).
- **Segment Item:** 3-state horizontal toggle (e.g., "Noise Cancellation", "Off", "Transparency"). The active state transitions with a smooth sliding pill in Card Surface (`#1C1C1E` / `#FFFFFF`), elevated by a hairline border and displaying an active `#FA2D48` accent icon.

### Lists & Settings Rows
- **Layout:** Contained within `20px` radius grouped cards. Height 54px per row.
- **Dividers:** 0.5px hairline borders inset by 16px to align with text, omitted on the final row.
- **Typography:** Row titles at 17px semibold; secondary values at 15px regular in Secondary Text. Trailing chevron is 14px in Secondary Text.

### Sliders (Volume, Ambient Sound, Equalizer)
- **Track:** 8px thick pill track (`9999px` radius) set to Inset Surface. Active fill uses `#FA2D48`.
- **Thumb:** 28px diameter circle with pure `#FFFFFF` fill, 0.5px hairline border, and a 48px touch target.
- **EQ Sliders:** Multi-band vertical sliders featuring central detent indicators and live decibel readouts (`label-sm`) in `#FA2D48`.

### Chips & Status Indicators
- **Audio Chips:** Pill-shaped height 28px, padding 4px 12px. Inset Surface background with 0.5px hairline. Active state transitions to `#FA2D48` tint background (15% opacity) with active text in `#FA2D48`.
- **Battery Indicators:** Compact horizontal layout featuring a hairline glyph battery bar with dynamic color fills (Green `#34C759` for normal, `#FA2D48` below 20%).