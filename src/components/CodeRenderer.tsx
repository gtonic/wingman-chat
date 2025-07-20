import { memo, useState, useEffect } from 'react';
import { useTheme } from '../hooks/useTheme';
import { CopyButton } from './CopyButton';

interface CodeRendererProps {
  code: string;
  language: string;
}

interface SyntaxHighlighterType {
  default: React.ComponentType<any>;
}

interface StylesType {
  oneDark: any;
  oneLight: any;
}

// Language aliases and normalization mappings (only for actual transformations)
const languageMap: Record<string, string> = {
  'bash': 'shell',
  'c++': 'cpp',
  'cs': 'csharp',
  'html': 'markup',
  'js': 'javascript',
  'jsx': 'javascript',
  'md': 'markdown',
  'plaintext': 'text',
  'py': 'python',
  'rb': 'ruby',
  'rs': 'rust',
  'sh': 'shell',
  'ts': 'typescript',
  'tsx': 'typescript',
  'xml': 'markup',
  'yml': 'yaml'
};

const NonMemoizedCodeRenderer = ({ code, language }: CodeRendererProps) => {
  const { isDark } = useTheme();
  const [SyntaxHighlighter, setSyntaxHighlighter] = useState<React.ComponentType<any> | null>(null);
  const [styles, setStyles] = useState<StylesType | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Dynamically import syntax highlighter
  useEffect(() => {
    const loadSyntaxHighlighter = async () => {
      try {
        const [highlighterModule, stylesModule] = await Promise.all([
          import("react-syntax-highlighter").then(module => ({ 
            default: module.Prism 
          })) as Promise<SyntaxHighlighterType>,
          import("react-syntax-highlighter/dist/esm/styles/prism").then(module => ({
            oneDark: module.oneDark,
            oneLight: module.oneLight
          })) as Promise<StylesType>
        ]);

        setSyntaxHighlighter(() => highlighterModule.default);
        setStyles(stylesModule);
        setIsLoading(false);
      } catch (error) {
        console.error('Failed to load syntax highlighter:', error);
        setIsLoading(false);
      }
    };

    loadSyntaxHighlighter();
  }, []);

  const normalizedLanguage = languageMap[language.toLowerCase()] || language.toLowerCase();

  // Show loading state while syntax highlighter is loading
  if (isLoading) {
    return (
      <div className="relative my-4">
        <div className="flex justify-between items-center bg-gray-100 dark:bg-neutral-800 pl-4 pr-2 py-1.5 rounded-t-md text-xs text-gray-700 dark:text-neutral-300">
          <span>{language}</span>
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-3 w-3 border border-blue-500 border-t-transparent"></div>
            <CopyButton text={code} />
          </div>
        </div>
        <div className="bg-white dark:bg-neutral-900 p-4 rounded-b-md border-l border-r border-b border-gray-100 dark:border-neutral-800">
          <pre className="text-gray-800 dark:text-neutral-300 text-sm whitespace-pre-wrap overflow-x-auto">
            <code>{code}</code>
          </pre>
        </div>
      </div>
    );
  }

  // Fallback to plain text if syntax highlighter failed to load
  if (!SyntaxHighlighter || !styles) {
    return (
      <div className="relative my-4">
        <div className="flex justify-between items-center bg-gray-100 dark:bg-neutral-800 pl-4 pr-2 py-1.5 rounded-t-md text-xs text-gray-700 dark:text-neutral-300">
          <span>{language}</span>
          <CopyButton text={code} />
        </div>
        <div className="bg-white dark:bg-neutral-900 p-4 rounded-b-md border-l border-r border-b border-gray-100 dark:border-neutral-800">
          <pre className="text-gray-800 dark:text-neutral-300 text-sm whitespace-pre-wrap overflow-x-auto">
            <code>{code}</code>
          </pre>
        </div>
      </div>
    );
  }

  return (
    <div className="relative my-4">
      <div className="flex justify-between items-center bg-gray-100 dark:bg-neutral-800 pl-4 pr-2 py-1.5 rounded-t-md text-xs text-gray-700 dark:text-neutral-300">
        <span>{language}</span>
        <CopyButton text={code} />
      </div>
      <div className="bg-white dark:bg-neutral-900 rounded-b-md overflow-hidden border-l border-r border-b border-gray-100 dark:border-neutral-800">
        <SyntaxHighlighter
          key={isDark ? 'dark' : 'light'}
          language={normalizedLanguage}
          style={isDark ? styles.oneDark : styles.oneLight}
          customStyle={{
            margin: 0,
            padding: '1rem',
            backgroundColor: 'transparent',
            fontSize: '0.875rem',
            lineHeight: '1.25rem'
          }}
          codeTagProps={{
            style: {
              fontFamily: 'Fira Code, Monaco, Cascadia Code, Roboto Mono, monospace'
            }
          }}
        >
          {code}
        </SyntaxHighlighter>
      </div>
    </div>
  );
};

export const CodeRenderer = memo(
  NonMemoizedCodeRenderer,
  (prevProps, nextProps) => 
    prevProps.code === nextProps.code && 
    prevProps.language === nextProps.language
);
