import { useColorScheme } from 'react-native';
import { LightColors, DarkColors, ColorTheme } from './colors';

export function useTheme(): ColorTheme {
  const scheme = useColorScheme();
  return scheme === 'dark' ? DarkColors : LightColors;
}