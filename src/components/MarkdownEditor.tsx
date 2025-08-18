import { useState, useEffect, useRef } from 'react';
import type React from 'react';
import { Code, Eye } from 'lucide-react';
import { Button } from '@headlessui/react';
import { useArtifacts } from '../hooks/useArtifacts';
import { Markdown } from './Markdown';

// Component to display Markdown content as rendered HTML
function MarkdownPreview({ content }: { content: string }) {
  return (
    <div className="h-full overflow-auto p-4 bg-white dark:bg-neutral-900">
      <div className="prose prose-neutral dark:prose-invert max-w-none">
        <Markdown>{content}</Markdown>
      </div>
    </div>
  );
}

interface MarkdownEditorProps {
  path: string;
  content: string;
}

export function MarkdownEditor({ path, content }: MarkdownEditorProps) {
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
          <MarkdownPreview content={editorValue} />
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
}
