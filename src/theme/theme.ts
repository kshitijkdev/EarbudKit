/**
 * EarbudKit "Sonic Neo-Glass" Design System Theme
 * Fuses Glassmorphism, Neo-Brutalism data density, and Techno-Minimalism.
 * Deep void backgrounds, luminous glass surfaces, electric violet, hot pink, and lime neon.
 */

export interface ThemeColors {
  // Surfaces
  background: string;
  surface: string;
  surfaceDim: string;
  surfaceBright: string;
  surfaceContainerLowest: string;
  surfaceContainerLow: string;
  surfaceContainer: string;
  surfaceContainerHigh: string;
  surfaceContainerHighest: string;
  surfaceVariant: string;

  // Content
  onBackground: string;
  onSurface: string;
  onSurfaceVariant: string;

  // Primary (Electric Violet family)
  primary: string;
  onPrimary: string;
  primaryContainer: string;
  onPrimaryContainer: string;
  inversePrimary: string;

  // Secondary (Hot Pink family)
  secondary: string;
  onSecondary: string;
  secondaryContainer: string;
  onSecondaryContainer: string;

  // Tertiary (Lime Neon family)
  tertiary: string;
  onTertiary: string;
  tertiaryContainer: string;
  onTertiaryContainer: string;
  tertiaryFixed: string;
  tertiaryFixedDim: string;

  // Sonic Neo-Glass Core Accents
  electricViolet: string;
  hotPink: string;
  limeNeon: string;
  voidBlack: string;

  // Glassmorphic tokens
  glassFill: string;
  glassBorder: string;
  glassActiveFill: string;
  glassActiveBorder: string;
  glassGlow: string;

  // Error
  error: string;
  onError: string;
  errorContainer: string;
  onErrorContainer: string;

  // Outline
  outline: string;
  outlineVariant: string;

  // Status
  success: string;
  warning: string;

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
    displayMedium: number;
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
  lg: 24,
  xl: 32,
  xxl: 48,
  gutter: 16,
};

const borderRadius = {
  sm: 8,
  md: 16,
  lg: 20,
  xl: 24,    // Standard Bento panel radius (DESIGN.md)
  full: 9999, // Pill morphology (DESIGN.md)
};

const typography = {
  displayLarge: 48,
  displayMedium: 36,
  headlineLarge: 32,
  headlineMedium: 24,
  titleLarge: 20,
  titleMedium: 18,
  bodyLarge: 16,
  bodyMedium: 14,
  bodySmall: 12,
  labelLarge: 14,
  labelMedium: 12,
  labelSmall: 10,
};

export const fonts: ThemeFonts = {
  display: 'SpaceGrotesk_700Bold',
  headline: 'SpaceGrotesk_600SemiBold',
  title: 'SpaceGrotesk_600SemiBold',
  label: 'SpaceGrotesk_600SemiBold',
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodyBold: 'Inter_600SemiBold',
};

export const DarkTheme: Theme = {
  dark: true,
  fonts,
  colors: {
    background: '#0B0B10', // Base Void (DESIGN.md)
    surface: '#131318',
    surfaceDim: '#131318',
    surfaceBright: '#39383E',
    surfaceContainerLowest: '#0E0E13',
    surfaceContainerLow: '#1B1B20',
    surfaceContainer: '#1F1F24',
    surfaceContainerHigh: '#2A292F',
    surfaceContainerHighest: '#35343A',
    surfaceVariant: '#2A292F',

    onBackground: '#E4E1E9',
    onSurface: '#E4E1E9',
    onSurfaceVariant: '#C9C4D8',

    // Electric Violet family
    primary: '#7C5CFF',
    onPrimary: '#FFFFFF',
    primaryContainer: '#947DFF',
    onPrimaryContainer: '#1C0062',
    inversePrimary: '#603CE2',

    // Hot Pink family
    secondary: '#FF4FD8',
    onSecondary: '#FFFFFF',
    secondaryContainer: '#C000A2',
    onSecondaryContainer: '#FFE0F0',

    // Lime Neon family
    tertiary: '#C6FF3D',
    onTertiary: '#1A2E00',
    tertiaryContainer: '#759E00',
    onTertiaryContainer: '#202E00',
    tertiaryFixed: '#BDF532',
    tertiaryFixedDim: '#A2D801',

    // Accents
    electricViolet: '#7C5CFF',
    hotPink: '#FF4FD8',
    limeNeon: '#C6FF3D',
    voidBlack: '#0B0B10',

    // Glassmorphic tokens
    glassFill: 'rgba(255, 255, 255, 0.04)',
    glassBorder: 'rgba(255, 255, 255, 0.10)',
    glassActiveFill: 'rgba(124, 92, 255, 0.10)',
    glassActiveBorder: 'rgba(124, 92, 255, 0.45)',
    glassGlow: 'rgba(124, 92, 255, 0.25)',

    // Error
    error: '#FFB4AB',
    onError: '#690005',
    errorContainer: '#93000A',
    onErrorContainer: '#FFDAD6',

    // Outline
    outline: '#938EA1',
    outlineVariant: '#484555',

    // Status
    success: '#C6FF3D',
    warning: '#FABD00',

    // Misc
    shadow: '#000000',
    scrim: '#000000',
    inverseSurface: '#E4E1E9',
    inverseOnSurface: '#303036',
  },
  spacing,
  borderRadius,
  typography,
};

export const LightTheme: Theme = {
  dark: false,
  fonts,
  colors: {
    background: '#FCF8FF',
    surface: '#FCF8FF',
    surfaceDim: '#DBD8E6',
    surfaceBright: '#FCF8FF',
    surfaceContainerLowest: '#FFFFFF',
    surfaceContainerLow: '#F5F2FF',
    surfaceContainer: '#EFECFA',
    surfaceContainerHigh: '#E9E6F4',
    surfaceContainerHighest: '#E4E1EE',
    surfaceVariant: '#E4E1EE',

    onBackground: '#1B1B24',
    onSurface: '#1B1B24',
    onSurfaceVariant: '#484555',

    // Violet family
    primary: '#5E39E0',
    onPrimary: '#FFFFFF',
    primaryContainer: '#7757FA',
    onPrimaryContainer: '#FFFBFF',
    inversePrimary: '#CABEFF',

    // Hot pink family
    secondary: '#AF0093',
    onSecondary: '#FFFFFF',
    secondaryContainer: '#FE4ED7',
    onSecondaryContainer: '#5F004F',

    // Lime/Emerald family
    tertiary: '#006947',
    onTertiary: '#FFFFFF',
    tertiaryContainer: '#00855B',
    onTertiaryContainer: '#F5FFF6',
    tertiaryFixed: '#6FFBBE',
    tertiaryFixedDim: '#4EDEA3',

    // Accents
    electricViolet: '#5E39E0',
    hotPink: '#AF0093',
    limeNeon: '#00855B',
    voidBlack: '#FCF8FF',

    // Glassmorphic tokens
    glassFill: 'rgba(255, 255, 255, 0.85)',
    glassBorder: 'rgba(94, 57, 224, 0.12)',
    glassActiveFill: 'rgba(94, 57, 224, 0.08)',
    glassActiveBorder: 'rgba(94, 57, 224, 0.35)',
    glassGlow: 'rgba(94, 57, 224, 0.15)',

    // Error
    error: '#BA1A1A',
    onError: '#FFFFFF',
    errorContainer: '#FFDAD6',
    onErrorContainer: '#93000A',

    // Outline
    outline: '#797587',
    outlineVariant: '#C9C4D8',

    // Status
    success: '#006947',
    warning: '#7D5800',

    // Misc
    shadow: '#1B1B24',
    scrim: '#000000',
    inverseSurface: '#302F39',
    inverseOnSurface: '#F2EFFD',
  },
  spacing,
  borderRadius,
  typography,
};
