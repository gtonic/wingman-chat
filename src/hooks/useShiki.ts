import { useEffect, useCallback, useMemo } from 'react';
import { useTheme } from './useTheme';
import type { Highlighter } from 'shiki';

// Singleton highlighter instance
let highlighter: Highlighter | null = null;
let highlighterPromise: Promise<Highlighter> | null = null;
const highlighterLanguages = new Set<string>();

const getShikiHighlighter = async (): Promise<Highlighter> => {
  if (highlighter) {
    return highlighter;
  }

  if (highlighterPromise) {
    return highlighterPromise;
  }

  highlighterPromise = (async () => {
    try {
      const { createHighlighter } = await import('shiki');
      highlighter = await createHighlighter({
        themes: ['one-dark-pro', 'one-light'],
        langs: [] // Start with no languages, load them dynamically
      });
      return highlighter;
    } catch (error) {
      console.error('Failed to initialize Shiki:', error);
      highlighterPromise = null; // Reset promise on error so we can retry
      throw error;
    }
  })();

  return highlighterPromise;
};

// Pre-load a language if not already loaded
const loadLanguage = async (shiki: Highlighter, language: string): Promise<void> => {
  if (highlighterLanguages.has(language)) {
    return;
  }

  try {
    const { bundledLanguages } = await import('shiki');
    if (bundledLanguages[language as keyof typeof bundledLanguages]) {
      await shiki.loadLanguage(language as keyof typeof bundledLanguages);
      highlighterLanguages.add(language);
    }
  } catch {
    // Language loading failed, but Shiki might still recognize it as an alias
    // Mark as loaded to avoid retrying
    highlighterLanguages.add(language);
  }
};

export function useShiki() {
  const { isDark } = useTheme();

  // Memoize the theme to avoid unnecessary re-renders
  const theme = useMemo(() => isDark ? 'one-dark-pro' : 'one-light', [isDark]);

  useEffect(() => {
    // Pre-initialize the highlighter on first use
    getShikiHighlighter().catch(console.error);
  }, []);

  const codeToHtml = useCallback(async (code: string, language: string) => {
    try {
      // Get the singleton highlighter instance
      const shiki = await getShikiHighlighter();
      
      // Pre-load the language if needed
      await loadLanguage(shiki, language);

      return shiki.codeToHtml(code, {
        lang: language,
        theme,
        colorReplacements: {
          '#fafafa': 'transparent', // one-light background
          '#282c34': 'transparent', // one-dark-pro background
        }
      });
    } catch (error) {
      console.error('Code highlighting failed:', error);
      return `<pre><code>${code}</code></pre>`;
    }
  }, [theme]); // Use memoized theme instead of isDark

  return {
    codeToHtml
  };
}