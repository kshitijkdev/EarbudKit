---
name: Sonic Neo-Glass
colors:
  surface: '#fcf8ff'
  surface-dim: '#dbd8e6'
  surface-bright: '#fcf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f5f2ff'
  surface-container: '#efecfa'
  surface-container-high: '#e9e6f4'
  surface-container-highest: '#e4e1ee'
  on-surface: '#1b1b24'
  on-surface-variant: '#484555'
  inverse-surface: '#302f39'
  inverse-on-surface: '#f2effd'
  outline: '#797587'
  outline-variant: '#c9c4d8'
  surface-tint: '#603ce2'
  primary: '#5e39e0'
  on-primary: '#ffffff'
  primary-container: '#7757fa'
  on-primary-container: '#fffbff'
  inverse-primary: '#cabeff'
  secondary: '#af0093'
  on-secondary: '#ffffff'
  secondary-container: '#fe4ed7'
  on-secondary-container: '#5f004f'
  tertiary: '#006947'
  on-tertiary: '#ffffff'
  tertiary-container: '#00855b'
  on-tertiary-container: '#f5fff6'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e6deff'
  primary-fixed-dim: '#cabeff'
  on-primary-fixed: '#1c0062'
  on-primary-fixed-variant: '#4816cb'
  secondary-fixed: '#ffd8ee'
  secondary-fixed-dim: '#ffade3'
  on-secondary-fixed: '#3a0030'
  on-secondary-fixed-variant: '#860070'
  tertiary-fixed: '#6ffbbe'
  tertiary-fixed-dim: '#4edea3'
  on-tertiary-fixed: '#002113'
  on-tertiary-fixed-variant: '#005236'
  background: '#fcf8ff'
  on-background: '#1b1b24'
  surface-variant: '#e4e1ee'
typography:
  display:
    fontFamily: Space Grotesk
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.03em
  display-mobile:
    fontFamily: Space Grotesk
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Space Grotesk
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Space Grotesk
    fontSize: 26px
    fontWeight: '600'
    lineHeight: 34px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Space Grotesk
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Space Grotesk
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: -0.005em
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: 0em
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
    letterSpacing: 0.01em
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
    letterSpacing: 0.03em
  label-sm:
    fontFamily: Space Grotesk
    fontSize: 10px
    fontWeight: '700'
    lineHeight: 14px
    letterSpacing: 0.05em
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
  space-xl: 2.5rem
---

## Brand & Style

This design system establishes a high-fidelity auditory companion experience for EarbudKit. The brand balances ethereal acoustic lightness with razor-sharp precision audio engineering. It rejects heavy, brooding tech aesthetics in favor of a luminous, crystalline sensory atmosphere.

### Aesthetic Movement & Personality
- **Primary Direction:** Ethereal Neo-Glass & Luminous Pastels.
- **Personality:** Pristine, acoustic, sensory, vibrant, fluid.
- **Emotional Intent:** To evoke the feeling of weightless sound clarity, immediate tactical responsiveness, and delightful auditory immersion.
- **Visual Mechanics:** Multi-layered translucent panels layered over subtle chromatic light blooms. High-contrast midnight typography anchors floating interfaces, while sharp energetic neon accents direct immediate attention to EQ frequencies, active noise control, and playback telemetry.

## Colors

The palette operates on a high-clarity luminous structure. The foundational canvas transitions across soft acoustic lavenders and crisp frosted tints, illuminated by electric spectral accents.

### Palette Architecture
- **Primary (`#7C5CFF` - Electric Violet):** Connective tissue of the app; primary actions, audio waveform spikes, and active spatial audio indicators.
- **Secondary (`#FF4FD8` - Playful Hot Pink):** Dynamic acoustic accents, personalized EQ curves, active charging pulses, and gesture triggers.
- **Tertiary (`#10B981` - Energetic Mint/Lime Spectrum):** Optimal battery states, active transparency pass-through, low-latency gaming mode indicators, and sound calibration success states. Paired with lime (`#84CC16`) and deep mint (`#059669`) for rich tonal feedback.
- **Neutral Foreground (`#11111A` - Midnight Slate):** Crisp, high-contrast text and solid iconography preventing wash-out against radiant glass.
- **Surface & Canvas:**
  - Ambient Base: Linear gradient from `#F8F7FD` to `#ECE9F7`.
  - Glass Surface Base: `rgba(255, 255, 255, 0.65)` to `rgba(255, 255, 255, 0.40)`.
  - Border Sheen: `rgba(255, 255, 255, 0.85)` top-left rim, blending to `rgba(124, 92, 255, 0.15)` bottom-right.
  - Subdued Text & Secondary Labels: `#525166`.
  - Muted Borders & Dividers: `rgba(17, 17, 26, 0.06)`.

## Typography

The type system pairs the technical, synthetic energy of `Space Grotesk` with the hyper-legible neutrality of `Inter`.

### Role Distribution
- **Space Grotesk:** Reserved for telemetry, device statuses, frequency headers, decibel indicators, and primary pill buttons. It provides an engineered, acoustic instrument vibe.
- **Inter:** Drives body content, configuration summaries, onboarding explanations, and fine print, guaranteeing crystal-clear legibility against frosted backgrounds.

### Layout Considerations
- Large metrics (e.g., decibel levels, battery percentages, latency ms) make use of `display` and `display-mobile` with tight tracking (`-0.03em`).
- Headings and stat labels default to uppercase tracking for `label-sm` to maintain a hardware-calibrated tone.

## Layout & Spacing

The layout is built around a dynamic fluid grid engineered to house audio components: floating earbud telemetry pods, modular EQ sliders, and noise control dials.

### Responsive Breakpoints & Grids
- **Mobile (< 768px):** 4-column fluid layout with `1rem` outer canvas margin and `1rem` gutters. Elements stack vertically, prioritizing the active earbud model render and quick-toggle modes.
- **Tablet (768px - 1024px):** 8-column layout with `2rem` margins and `1rem` gutters. Two-column split: left rail for device status and audio modes; right rail for graphic EQ and spatial tuning.
- **Desktop (> 1024px):** 12-column layout with `3rem` margins and `1.5rem` gutters. Max container width capped at `1280px` to maintain focused visual density.

### Spacing Rules
- Dense telemetry groups (battery, codec, latency) utilize `space-xs` and `space-sm`.
- Card internal padding standardizes on `space-md` on compact screens and `space-lg` on wide screens.
- Distinct audio modules (Noise Control vs. Sound Profile) are separated by `space-xl`.

## Elevation & Depth

Sonic Neo-Glass uses translucent optical layering instead of heavy drop shadows. Spatial hierarchy is communicated through backdrop filtration, dual specular highlights, and chromatic aura glows.

### Elevation Architecture
- **Base Canvas:** The ambient pastel foundation (`#F8F7FD` to `#ECE9F7`) contains soft, dispersed radial light spots in lavender (`rgba(124, 92, 255, 0.08)`) and cyan-mint (`rgba(16, 185, 129, 0.06)`).
- **Surface Level 1 (Frosted Glass Panels):**
  - Background: `rgba(255, 255, 255, 0.55)`.
  - Backdrop Blur: `20px` to `24px`.
  - Border: `1px solid rgba(255, 255, 255, 0.8)` with an inner highlight inset of `0 1px 0 0 rgba(255, 255, 255, 0.9)`.
  - Shadow: `0 8px 32px 0 rgba(17, 17, 26, 0.04)`.
- **Surface Level 2 (Interactive Floating Modals & Overlays):**
  - Background: `rgba(255, 255, 255, 0.75)`.
  - Backdrop Blur: `32px`.
  - Border: `1.5px solid rgba(255, 255, 255, 0.95)`.
  - Shadow: `0 16px 40px -8px rgba(124, 92, 255, 0.12), 0 4px 16px 0 rgba(17, 17, 26, 0.04)`.
- **Active State Chromatic Blooms:** Focused controls (e.g., active Noise Cancelling, boosted Bass node) emit an ambient backlight:
  - Electric Violet Glow: `0 0 24px rgba(124, 92, 255, 0.35)`.
  - Hot Pink Accent Glow: `0 0 20px rgba(255, 79, 216, 0.3)`.

## Shapes

The design system adopts a pure Pill-shaped (`3`) geometry. Curvilinear forms echo acoustic transducers, earbud contours, sound waves, and human tactile interaction.

### Shape Guidelines
- **Buttons, Chips, Sliders & Badges:** Full capsule/pill geometry (`border-radius: 9999px` or `rounded-xl`).
- **Cards & Enclosures:** Curvature scales proportionally, utilizing `2rem` (`rounded-lg`) on mobile devices up to `3rem` (`rounded-xl`) on larger containers.
- **Sliders & Range Thumbs:** Circular or bulbous pill shapes that look soft and smooth to swipe.
- **Nested Radii:** Child elements inside cards must mirror the inner perimeter radius to avoid corner pinching (e.g., card radius `2rem`, nested container radius `1.25rem`).

## Components

### Buttons
- **Primary Pill:** Background fill of `#7C5CFF` with `#FFFFFF` text. High-tension gloss via a subtle gradient overlay (`linear-gradient(180deg, rgba(255, 255, 255, 0.25) 0%, rgba(255, 255, 255, 0) 100%)`). Interactive hover introduces a vibrant violet glow.
- **Secondary Glass Pill:** Translucent surface (`rgba(255, 255, 255, 0.6)`), midnight slate text (`#11111A`), `1px` white border, `12px` backdrop blur. Hover shifts fill to `rgba(255, 255, 255, 0.85)`.
- **Tertiary Accent Pill (Playful Pink / Mint):** Solid fill with high-contrast text for high-impact context actions (e.g., "Find My Earbuds" or "Low Latency Mode").

### Chips & Segmented Controls
- **Segmented Audio Modes (ANC / Off / Transparency):** Encased in an ultra-frosted capsule trough (`rgba(17, 17, 26, 0.04)`). The active indicator is a sliding white glass pill with soft shadow (`0 4px 12px rgba(17, 17, 26, 0.08)`), tinted slightly with Electric Violet or Energetic Mint.
- **Filter Chips:** Pill shape with translucent backdrop and `label-md` typography. Unselected: `#525166` text. Selected: `#11111A` text with an Electric Violet border and glowing ping indicator.

### Input Fields & Search
- Frosted capsule inputs with inset padding for icons.
- Surface: `rgba(255, 255, 255, 0.5)`.
- Focus State: Border transitions to `#7C5CFF` with a soft `0 0 0 3px rgba(124, 92, 255, 0.15)` bloom ring. No harsh squared outlines.

### Checkboxes, Toggles & Radios
- **Switches:** Pill tracks with a tactile frosted glass ball that glides over glowing mint or violet when active.
- **Radio Buttons:** Concentric circular rings. Active state features a central `#FF4FD8` or `#7C5CFF` illuminated bead surrounded by a frosted gap.

### Cards & Pods
- **Telemetry Pods (Earbud L / R / Case):** Translucent frosted cards displaying battery bars with animated gradient fills (green `#10B981` transitioning to lime `#84CC16` when healthy; `#FF4FD8` for low power alerts).
- **Equalizer Card:** Integrated multi-band slider array. Fader tracks are narrow pill slots with luminous draggable beads reflecting the current frequency amplitude.

### Sliders (Volume & EQ)
- **Track:** High-translucency pill groove with subtle inset shadow.
- **Progress Fill:** Fluid chromatic gradient spanning Electric Violet to Hot Pink.
- **Thumb:** Circular frosted glass cabochon with an illuminated central core point.