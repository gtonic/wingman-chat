import { useState, useMemo, useEffect, useRef } from 'react';
import type React from 'react';
import { Code, Eye } from 'lucide-react';
import { Button } from '@headlessui/react';
import { useArtifacts } from '../hooks/useArtifacts';

interface CsvEditorProps {
  path: string;
  content: string;
}

// Utility function to detect separator (comma, semicolon, or tab)
const detectSeparator = (csv: string): string => {
  if (!csv.trim()) return ',';

  const firstLine = csv.trim().split('\n')[0];
  let commaCount = 0;
  let semicolonCount = 0;
  let tabCount = 0;
  let inQuotes = false;

  for (let i = 0; i < firstLine.length; i++) {
    const char = firstLine[i];
    const nextChar = firstLine[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        i++; // Skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (!inQuotes) {
      if (char === ',') commaCount++;
      if (char === ';') semicolonCount++;
      if (char === '\t') tabCount++;
    }
  }

  // Return the separator with the highest count
  if (tabCount > 0 && tabCount >= commaCount && tabCount >= semicolonCount) return '\t';
  if (semicolonCount > commaCount) return ';';
  return ',';
};

// Utility function to parse CSV content
const parseCSV = (csv: string): string[][] => {
  if (!csv.trim()) return []; // Return empty array for empty content

  const separator = detectSeparator(csv);
  const lines = csv.trim().split('\n');
  const result: string[][] = [];

  for (const line of lines) {
    const row: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          // Escaped quote
          current += '"';
          i++; // Skip next quote
        } else {
          // Toggle quote state
          inQuotes = !inQuotes;
        }
      } else if (char === separator && !inQuotes) {
        // End of field
        row.push(current);
        current = '';
      } else {
        current += char;
      }
    }

    // Add the last field
    row.push(current);
    result.push(row);
  }

  return result;
};

export function CsvEditor({ path, content }: CsvEditorProps) {
  const [viewMode, setViewMode] = useState<'table' | 'code'>('table');
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

  const parsedData = useMemo(() => parseCSV(editorValue), [editorValue]);

  const headers = parsedData.length > 0 ? parsedData[0] : [];
  const rows = parsedData.slice(1);

  return (
    <div className="flex-1 flex flex-col overflow-hidden relative">
      {/* Subtle View Mode Toggle - Top Right */}
      <div className="absolute top-2 right-2 z-10">
        <Button
          onClick={() => setViewMode(viewMode === 'table' ? 'code' : 'table')}
          className="p-1.5 rounded-md transition-colors bg-white/80 dark:bg-neutral-700/80 backdrop-blur-sm border border-neutral-200/50 dark:border-neutral-500/50 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100/80 dark:hover:bg-neutral-600/80"
          title={viewMode === 'table' ? 'Switch to code view' : 'Switch to table view'}
        >
          {viewMode === 'table' ? <Code size={16} /> : <Eye size={16} />}
        </Button>
      </div>

      <div className="flex-1 overflow-auto">
        {viewMode === 'code' ? (
          <div className="p-4">
            <textarea
              value={editorValue}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setEditorValue(e.target.value)}
              onBlur={handleBlur}
              className="w-full h-64 md:h-[60vh] resize-none outline-none bg-transparent text-sm text-gray-800 dark:text-neutral-200 font-mono leading-5"
              spellCheck={false}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            {parsedData.length > 0 ? (
              <table className="min-w-full divide-y divide-gray-200 dark:divide-neutral-700">
                <thead className="bg-gray-50 dark:bg-neutral-800">
                  <tr>
                    {headers.map((header, index) => (
                      <th
                        key={index}
                        className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-neutral-400 uppercase tracking-wider border-r border-gray-200 dark:border-neutral-600 last:border-r-0"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-neutral-900 divide-y divide-gray-200 dark:divide-neutral-700">
                  {rows.map((row, rowIndex) => (
                    <tr key={rowIndex} className="hover:bg-gray-50 dark:hover:bg-neutral-800">
                      {row.map((cell, cellIndex) => (
                        <td
                          key={cellIndex}
                          className="px-3 py-2 text-sm text-gray-900 dark:text-neutral-100 border-r border-gray-200 dark:border-neutral-600 last:border-r-0"
                        >
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="flex items-center justify-center h-24 text-gray-500 dark:text-neutral-500">
                <div className="text-center">
                  <p>No CSV data to display</p>
                  <p className="text-xs mt-1">The file appears to be empty or invalid</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
