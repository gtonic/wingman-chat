import { memo, useState, useEffect, useRef } from 'react';
import type React from 'react';
import { Code, Eye } from 'lucide-react';
import { Button } from '@headlessui/react';
import { useTheme } from '../hooks/useTheme';
import { useArtifacts } from '../hooks/useArtifacts';

interface MermaidEditorProps {
  path: string;
  content: string;
}

interface MermaidAPI {
  initialize: (config: Record<string, unknown>) => void;
  render: (id: string, definition: string) => Promise<{ svg: string }>;
}

// Component to display Mermaid diagram
function MermaidPreview({ content }: { content: string }) {
  const [svg, setSvg] = useState<string>('');
  const [isLoaded, setIsLoaded] = useState(false);
  const elementId = useRef(`mermaid-${Math.random().toString(36).substr(2, 9)}`);
  const mermaidRef = useRef<MermaidAPI | null>(null);
  const { isDark } = useTheme();

  // Dynamically import and configure mermaid
  useEffect(() => {
    const loadMermaid = async () => {
      if (!mermaidRef.current) {
        try {
          const mermaidModule = await import('mermaid');
          mermaidRef.current = mermaidModule.default;
          setIsLoaded(true);
        } catch (error) {
          console.error('Failed to load Mermaid:', error);
        }
      }
    };

    loadMermaid();
  }, []);

  // Configure mermaid theme when loaded or theme changes
  useEffect(() => {
    if (!mermaidRef.current || !isLoaded) return;

    const themeConfig = {
      startOnLoad: false,
      securityLevel: 'loose' as const,
      suppressErrorRendering: true,
      theme: 'base' as const,
      themeVariables: isDark ? {
        // Dark mode configuration
        primaryColor: '#64748b',
        primaryBorderColor: '#475569',
        lineColor: '#94a3b8',
        secondaryColor: '#1e293b',
        tertiaryColor: '#334155',
        background: '#1f2937',
        mainBkg: '#1f2937',
        secondBkg: '#374151',
        tertiaryBkg: '#4b5563',
        primaryTextColor: '#ffffff',
        secondaryTextColor: '#e5e7eb',
        tertiaryTextColor: '#d1d5db',
      } : {
        // Light mode configuration
        primaryColor: '#64748b',
        primaryBorderColor: '#475569',
        lineColor: '#94a3b8',
        secondaryColor: '#1e293b',
        tertiaryColor: '#334155',
        background: '#ffffff',
        mainBkg: '#ffffff',
        secondBkg: '#f8fafc',
        tertiaryBkg: '#f1f5f9',
        primaryTextColor: '#0f172a',
        secondaryTextColor: '#1f2937',
        tertiaryTextColor: '#374151',
      }
    };

    mermaidRef.current.initialize(themeConfig);
  }, [isDark, isLoaded]);

  // Render mermaid chart
  useEffect(() => {
    const renderMermaid = async () => {
      if (!mermaidRef.current || !isLoaded || !content.trim()) return;

      try {
        // Generate a new element ID to force re-render when theme changes
        elementId.current = `mermaid-${Math.random().toString(36).substr(2, 9)}`;

        const { svg: renderedSvg } = await mermaidRef.current.render(elementId.current, content);
        setSvg(renderedSvg);
      } catch (error) {
        console.error('Mermaid rendering error:', error);
        setSvg('');
      }
    };

    // Debounce rendering to avoid excessive re-renders
    const timeoutId = setTimeout(renderMermaid, 300);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [content, isDark, isLoaded]);

  if (!isLoaded) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex items-center space-x-3 text-neutral-500">
          <div className="animate-spin rounded-full h-5 w-5 border-2 border-gray-300 border-t-gray-600 dark:border-neutral-600 dark:border-t-neutral-400"></div>
          <span>{!isLoaded ? 'Loading diagram renderer...' : 'Loading preview...'}</span>
        </div>
      </div>
    );
  }

  if (!svg) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-neutral-500">Unable to render diagram</div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto p-4">
      <div
        className="mermaid-diagram flex justify-center"
        dangerouslySetInnerHTML={{ __html: svg }}
      />
    </div>
  );
}

const NonMemoizedMermaidEditor = ({ path, content }: MermaidEditorProps) => {
  const [viewMode, setViewMode] = useState<'code' | 'preview'>('code');
  const { fs } = useArtifacts();

  // Local editable value
  const [editorValue, setEditorValue] = useState<string>(content);
  const lastSavedRef = useRef<string>(content);

  // Keep local state in sync when file changes or new content arrives
  useEffect(() => {
    setEditorValue(content);
    lastSavedRef.current = content;
  }, [content, path]);

  // Listen for external file updates and sync editor (without losing caret)
  useEffect(() => {
    if (!fs) return;

    const unsubscribe = fs.subscribe('fileUpdated', (updatedPath: string) => {
      if (updatedPath === path) {
        const file = fs.getFile(path);
        if (file && file.content !== editorValue) {
          setEditorValue(file.content);
          lastSavedRef.current = file.content;
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [fs, path, editorValue]);

  // Debounced autosave to filesystem
  useEffect(() => {
    if (!fs || !path) return;

    const timer = setTimeout(() => {
      const file = fs.getFile(path);
      if (!file || file.content !== editorValue) {
        fs.updateFile(path, editorValue);
        lastSavedRef.current = editorValue;
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [fs, path, editorValue]);

  const handleBlur = () => {
    if (!fs || !path) return;
    const file = fs.getFile(path);
    if (!file || file.content !== editorValue) {
      fs.updateFile(path, editorValue);
      lastSavedRef.current = editorValue;
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden relative">
      {/* Subtle View Mode Toggle - Top Right */}
      <div className="absolute top-2 right-2 z-10">
        <Button
          onClick={() => setViewMode(viewMode === 'code' ? 'preview' : 'code')}
          className="p-1.5 rounded-md transition-colors bg-white/80 dark:bg-neutral-700/80 backdrop-blur-sm border border-neutral-200/50 dark:border-neutral-500/50 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100/80 dark:hover:bg-neutral-600/80"
          title={viewMode === 'code' ? 'Switch to preview' : 'Switch to code'}
        >
          {viewMode === 'code' ? <Eye size={16} /> : <Code size={16} />}
        </Button>
      </div>

      <div className="flex-1 overflow-auto">
        {viewMode === 'preview' ? (
          <MermaidPreview content={editorValue} />
        ) : (
          <div className="h-full p-4">
            <textarea
              value={editorValue}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setEditorValue(e.target.value)}
              onBlur={handleBlur}
              className="w-full h-full resize-none outline-none bg-transparent text-sm text-gray-800 dark:text-neutral-200 font-mono leading-5"
              spellCheck={false}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export const MermaidEditor = memo(
  NonMemoizedMermaidEditor,
  (prevProps: MermaidEditorProps, nextProps: MermaidEditorProps) =>
    prevProps.path === nextProps.path &&
    prevProps.content === nextProps.content
);
