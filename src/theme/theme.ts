/**
 * EarbudKit "Soft Studio" Design System Theme
 * Apple Music-inspired editorial companion interface for high-fidelity audio hardware.
 * Clean, tactile, acoustic minimalism with OLED pitch black canvas, pure white light mode,
 * and dynamic multi-accent studio lighting (Crimson, Cool Sky Blue, Amber, Emerald).
 */

import { Platform } from 'react-native';

export type StudioAccentKey = 'crimson' | 'blue' | 'amber' | 'emerald';

export interface StudioAccent {
  key: StudioAccentKey;
  label: string;
  color: string;
  onColor: string;
  container: string;
  glow: string;
  tint: string;
}

export const STUDIO_ACCENTS: Record<StudioAccentKey, StudioAccent> = {
  crimson: {
    key: 'crimson',
    label: 'Brand Crimson',
    color: '#FA2D48',
    onColor: '#FFFFFF',
    container: 'rgba(250, 45, 72, 0.14)',
    glow: 'rgba(250, 45, 72, 0.35)',
    tint: '#FA2D48',
  },
  blue: {
    key: 'blue',
    label: 'Cool Sky Blue',
    color: '#74D1FF',
    onColor: '#002B40',
    container: 'rgba(116, 209, 255, 0.16)',
    glow: 'rgba(116, 209, 255, 0.35)',
    tint: '#74D1FF',
  },
  amber: {
    key: 'amber',
    label: 'Warm Amber',
    color: '#FBBF24',
    onColor: '#452B00',
    container: 'rgba(251, 191, 36, 0.16)',
    glow: 'rgba(251, 191, 36, 0.35)',
    tint: '#FBBF24',
  },
  emerald: {
    key: 'emerald',
    label: 'Emerald Studio',
    color: '#34D399',
    onColor: '#003822',
    container: 'rgba(52, 211, 153, 0.16)',
    glow: 'rgba(52, 211, 153, 0.35)',
    tint: '#34D399',
  },
};

export interface ThemeColors {
  // Surfaces (Soft Studio Tonal Layers)
  background: string;              // Pitch Black #000000 / Light #F2F2F7
  surface: string;                 // Canvas level
  surfaceDim: string;
  surfaceBright: string;
  surfaceContainerLowest: string;
  surfaceContainerLow: string;
  surfaceContainer: string;         // Card Surface #1C1C1E / #FFFFFF
  surfaceContainerHigh: string;     // Inset Surface #2C2C2E / #E5E5EA
  surfaceContainerHighest: string;  // Raised Inset #353437 / #D1D1D6
  surfaceVariant: string;

  // Content
  onBackground: string;            // Text #FFFFFF / #000000
  onSurface: string;               // Primary text
  onSurfaceVariant: string;        // Secondary subdued #8E8E93 / #6C6C70

  // Primary Accent (Dynamic Studio Accent)
  primary: string;                 // #FA2D48 default
  onPrimary: string;
  primaryContainer: string;
  onPrimaryContainer: string;
  inversePrimary: string;

  // Secondary Accent
  secondary: string;
  onSecondary: string;
  secondaryContainer: string;
  onSecondaryContainer: string;

  // Tertiary
  tertiary: string;
  onTertiary: string;
  tertiaryContainer: string;
  onTertiaryContainer: string;
  tertiaryFixed: string;
  tertiaryFixedDim: string;

  // Studio Core Colors & Backwards Compat Aliases
  accent: string;
  accentKey: StudioAccentKey;
  electricViolet: string;           // Aliased to active accent
  hotPink: string;                  // Aliased to active accent
  limeNeon: string;                 // Clean status green #34C759
  voidBlack: string;                // Pure #000000 / #F2F2F7

  // Soft Studio Hairline & Surface Tokens
  hairline: string;                 // rgba(255,255,255,0.10) / rgba(0,0,0,0.08)
  glassFill: string;                // Flat card surface #1C1C1E / #FFFFFF
  glassBorder: string;              // 0.5px hairline border
  glassActiveFill: string;          // Dynamic accent container
  glassActiveBorder: string;        // Dynamic accent border
  glassGlow: string;                // Dynamic ambient glow

  // Error & Status
  error: string;
  onError: string;
  errorContainer: string;
  onErrorContainer: string;
  success: string;
  warning: string;

  // Outline & Structural
  outline: string;
  outlineVariant: string;

  // Misc
  shadow: string;
  scrim: string;
  inverseSurface: string;
  inverseOnSurface: string;
}

export interface ThemeFonts {
  display: string;
  headline: string;
  title: string;
  label: string;
  body: string;
  bodyMedium: string;
  bodyBold: string;
}

export interface Theme {
  dark: boolean;
  colors: ThemeColors;
  fonts: ThemeFonts;
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    xxl: number;
    gutter: number;
  };
  borderRadius: {
    sm: number;
    md: number;
    lg: number;
    xl: number;
    full: number;
  };
  typography: {
    displayLarge: number;
    headlineLarge: number;
    headlineMedium: number;
    titleLarge: number;
    titleMedium: number;
    bodyLarge: number;
    bodyMedium: number;
    bodySmall: number;
    labelLarge: number;
    labelMedium: number;
    labelSmall: number;
  };
}

const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  gutter: 16,
};

const borderRadius = {
  sm: 8,
  md: 14,
  lg: 20,    // Soft Studio fixed card & artwork radius (DESIGN.md)
  xl: 20,
  full: 9999, // Absolute pill geometry for buttons and chips (DESIGN.md)
};

const typography = {
  displayLarge: 34,
  headlineLarge: 28,
  headlineMedium: 20,
  titleLarge: 17,
  titleMedium: 16,
  bodyLarge: 17,
  bodyMedium: 15,
  bodySmall: 13,
  labelLarge: 15,
  labelMedium: 13,
  labelSmall: 11,
};

export const fonts: ThemeFonts = {
  display: Platform.select({ ios: 'System', android: 'sans-serif-medium', default: 'System' }),
  headline: Platform.select({ ios: 'System', android: 'sans-serif-medium', default: 'System' }),
  title: Platform.select({ ios: 'System', android: 'sans-serif-medium', default: 'System' }),
  label: Platform.select({ ios: 'System', android: 'sans-serif-medium', default: 'System' }),
  body: Platform.select({ ios: 'System', android: 'sans-serif', default: 'System' }),
  bodyMedium: Platform.select({ ios: 'System', android: 'sans-serif-medium', default: 'System' }),
  bodyBold: Platform.select({ ios: 'System', android: 'sans-serif', default: 'System' }),
};

export function createTheme(mode: 'dark' | 'light', accentKey: StudioAccentKey = 'crimson'): Theme {
  const isDark = mode === 'dark';
  const accent = STUDIO_ACCENTS[accentKey] ?? STUDIO_ACCENTS.crimson;

  if (isDark) {
    return {
      dark: true,
      fonts,
      spacing,
      borderRadius,
      typography,
      colors: {
        background: '#000000',               // Pure pitch black for OLED contrast
        surface: '#000000',
        surfaceDim: '#0E0E10',
        surfaceBright: '#39393B',
        surfaceContainerLowest: '#0A0A0C',
        surfaceContainerLow: '#131315',
        surfaceContainer: '#1C1C1E',          // Subtle dark graphite container
        surfaceContainerHigh: '#2C2C2E',     // Secondary recessed controls & tracks
        surfaceContainerHighest: '#353437',
        surfaceVariant: '#2C2C2E',

        onBackground: '#FFFFFF',
        onSurface: '#FFFFFF',
        onSurfaceVariant: '#8E8E93',         // Subdued secondary text

        // Primary Accent
        primary: accent.color,
        onPrimary: accent.onColor,
        primaryContainer: accent.container,
        onPrimaryContainer: accent.color,
        inversePrimary: '#BF002C',

        // Secondary
        secondary: '#C6C6CB',
        onSecondary: '#2F3034',
        secondaryContainer: '#46464B',
        onSecondaryContainer: '#B5B4BA',

        // Tertiary
        tertiary: '#C8C6C8',
        onTertiary: '#303032',
        tertiaryContainer: '#919092',
        onTertiaryContainer: '#29292B',
        tertiaryFixed: '#E4E2E4',
        tertiaryFixedDim: '#C8C6C8',

        // Core & Aliases
        accent: accent.color,
        accentKey,
        electricViolet: accent.color,
        hotPink: accent.color,
        limeNeon: '#34C759',                  // Clean audio status green
        voidBlack: '#000000',

        // Soft Studio planar tokens
        hairline: 'rgba(255, 255, 255, 0.10)',
        glassFill: '#1C1C1E',
        glassBorder: 'rgba(255, 255, 255, 0.10)',
        glassActiveFill: accent.container,
        glassActiveBorder: accent.color,
        glassGlow: accent.glow,

        // Status
        error: '#FF453A',
        onError: '#FFFFFF',
        errorContainer: 'rgba(255, 69, 58, 0.15)',
        onErrorContainer: '#FFDAD6',
        success: '#34C759',
        warning: '#FBBF24',

        outline: '#8E8E93',
        outlineVariant: 'rgba(255, 255, 255, 0.10)',

        shadow: '#000000',
        scrim: '#000000',
        inverseSurface: '#FFFFFF',
        inverseOnSurface: '#1C1C1E',
      },
    };
  }

  // Light Mode (Pure white acoustic plates)
  return {
    dark: false,
    fonts,
    spacing,
    borderRadius,
    typography,
    colors: {
      background: '#F2F2F7',                 // Neutral system off-white
      surface: '#F2F2F7',
      surfaceDim: '#E5E5EA',
      surfaceBright: '#FFFFFF',
      surfaceContainerLowest: '#FFFFFF',
      surfaceContainerLow: '#FFFFFF',
      surfaceContainer: '#FFFFFF',           // Pure white acoustic cards
      surfaceContainerHigh: '#E5E5EA',       // Recessed track grooves & switch wells
      surfaceContainerHighest: '#D1D1D6',
      surfaceVariant: '#E5E5EA',

      onBackground: '#000000',
      onSurface: '#000000',
      onSurfaceVariant: '#6C6C70',          // Subdued secondary text

      // Primary Accent
      primary: accent.color,
      onPrimary: accent.onColor,
      primaryContainer: accent.container,
      onPrimaryContainer: accent.color,
      inversePrimary: '#BF002C',

      // Secondary
      secondary: '#48484A',
      onSecondary: '#FFFFFF',
      secondaryContainer: '#D1D1D6',
      onSecondaryContainer: '#1C1C1E',

      // Tertiary
      tertiary: '#636366',
      onTertiary: '#FFFFFF',
      tertiaryContainer: '#E5E5EA',
      onTertiaryContainer: '#1C1C1E',
      tertiaryFixed: '#E5E5EA',
      tertiaryFixedDim: '#D1D1D6',

      // Core & Aliases
      accent: accent.color,
      accentKey,
      electricViolet: accent.color,
      hotPink: accent.color,
      limeNeon: '#34C759',
      voidBlack: '#F2F2F7',

      // Soft Studio planar tokens
      hairline: 'rgba(0, 0, 0, 0.08)',
      glassFill: '#FFFFFF',
      glassBorder: 'rgba(0, 0, 0, 0.08)',
      glassActiveFill: accent.container,
      glassActiveBorder: accent.color,
      glassGlow: accent.glow,

      // Status
      error: '#D32F2F',
      onError: '#FFFFFF',
      errorContainer: 'rgba(211, 47, 47, 0.12)',
      onErrorContainer: '#93000A',
      success: '#34C759',
      warning: '#D97706',

      outline: '#6C6C70',
      outlineVariant: 'rgba(0, 0, 0, 0.08)',

      shadow: '#000000',
      scrim: '#000000',
      inverseSurface: '#1C1C1E',
      inverseOnSurface: '#FFFFFF',
    },
  };
}

export const DarkTheme = createTheme('dark', 'crimson');
export const LightTheme = createTheme('light', 'crimson');
