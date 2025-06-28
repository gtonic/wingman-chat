import { useLayout } from './useLayout';
import { useTheme } from '../contexts/ThemeContext';
import { useBackground } from './useBackground';

export const useSettings = () => {
  // Use existing context hooks
  const layoutContext = useLayout();
  const themeContext = useTheme();
  const backgroundContext = useBackground();
  
  return {
    // Layout settings
    layoutMode: layoutContext.layoutMode,
    setLayoutMode: layoutContext.setLayoutMode,
    // Theme settings (re-export for convenience)
    theme: themeContext.theme,
    setTheme: themeContext.setTheme,
    isDark: themeContext.isDark,
    // Background settings
    backgroundPacks: backgroundContext.backgroundPacks,
    backgroundSetting: backgroundContext.backgroundSetting,
    setBackground: backgroundContext.setBackground,
  };
};
