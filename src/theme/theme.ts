/**
 * EarbudKit Material 3 inspired theme system
 * Supports light and dark modes
 */

export interface ThemeColors {
  // Surfaces
  background: string;
  surface: string;
  surfaceVariant: string;
  surfaceContainer: string;
  surfaceContainerHigh: string;

  // Content
  onBackground: string;
  onSurface: string;
  onSurfaceVariant: string;

  // Primary
  primary: string;
  onPrimary: string;
  primaryContainer: string;
  onPrimaryContainer: string;

  // Secondary
  secondary: string;
  onSecondary: string;
  secondaryContainer: string;
  onSecondaryContainer: string;

  // Tertiary
  tertiary: string;
  onTertiary: string;

  // Error
  error: string;
  onError: string;
  errorContainer: string;

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

export interface Theme {
  dark: boolean;
  colors: ThemeColors;
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    xxl: number;
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
};

const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 28,
  full: 9999,
};

const typography = {
  displayLarge: 57,
  displayMedium: 45,
  headlineLarge: 32,
  headlineMedium: 28,
  titleLarge: 22,
  titleMedium: 16,
  bodyLarge: 16,
  bodyMedium: 14,
  bodySmall: 12,
  labelLarge: 14,
  labelMedium: 12,
  labelSmall: 11,
};

export const LightTheme: Theme = {
  dark: false,
  colors: {
    background: '#F8F9FF',
    surface: '#FFFFFF',
    surfaceVariant: '#E1E2EC',
    surfaceContainer: '#F0F0FA',
    surfaceContainerHigh: '#E9E9F3',

    onBackground: '#1A1C1E',
    onSurface: '#1A1C1E',
    onSurfaceVariant: '#44474F',

    primary: '#3F5AA9',
    onPrimary: '#FFFFFF',
    primaryContainer: '#D9E2FF',
    onPrimaryContainer: '#001945',

    secondary: '#585E71',
    onSecondary: '#FFFFFF',
    secondaryContainer: '#DCE2F9',
    onSecondaryContainer: '#151B2C',

    tertiary: '#745470',
    onTertiary: '#FFFFFF',

    error: '#BA1A1A',
    onError: '#FFFFFF',
    errorContainer: '#FFDAD6',

    outline: '#757780',
    outlineVariant: '#C5C6D0',

    success: '#386A20',
    warning: '#7D5800',

    shadow: '#000000',
    scrim: '#000000',
    inverseSurface: '#2F3033',
    inverseOnSurface: '#F1F0F4',
  },
  spacing,
  borderRadius,
  typography,
};

export const DarkTheme: Theme = {
  dark: true,
  colors: {
    background: '#121316',
    surface: '#1A1C1E',
    surfaceVariant: '#44474F',
    surfaceContainer: '#1E2022',
    surfaceContainerHigh: '#292A2D',

    onBackground: '#E3E2E6',
    onSurface: '#E3E2E6',
    onSurfaceVariant: '#C5C6D0',

    primary: '#B0C6FF',
    onPrimary: '#08286E',
    primaryContainer: '#263F8F',
    onPrimaryContainer: '#D9E2FF',

    secondary: '#C0C6DC',
    onSecondary: '#2A3042',
    secondaryContainer: '#404659',
    onSecondaryContainer: '#DCE2F9',

    tertiary: '#E2BBDB',
    onTertiary: '#422740',

    error: '#FFB4AB',
    onError: '#690005',
    errorContainer: '#93000A',

    outline: '#8F909A',
    outlineVariant: '#44474F',

    success: '#9CD67D',
    warning: '#FABD00',

    shadow: '#000000',
    scrim: '#000000',
    inverseSurface: '#E3E2E6',
    inverseOnSurface: '#2F3033',
  },
  spacing,
  borderRadius,
  typography,
};
