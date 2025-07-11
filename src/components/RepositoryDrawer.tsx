import { useState } from 'react';
import { Plus, Folder, FileText, Upload, X, ChevronDown, Check, Edit, Trash2, Loader2 } from 'lucide-react';
import { Button, Menu } from '@headlessui/react';
import { useRepositories } from '../hooks/useRepositories';
import { useRepository } from '../hooks/useRepository';
import { Repository, RepositoryFile } from '../types/repository';

interface RepositoryDetailsProps {
  repository: Repository;
}

function RepositoryDetails({ repository }: RepositoryDetailsProps) {
  const { files, addFile, removeFile } = useRepository(repository.id);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const droppedFiles = Array.from(e.dataTransfer.files);
    for (const file of droppedFiles) {
      await addFile(file);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    for (const file of selectedFiles) {
      await addFile(file);
    }
    // Reset input
    e.target.value = '';
  };

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {repository.instructions && (
        <div className="p-4 border-b border-neutral-200 dark:border-neutral-700">
          <div className="text-xs text-neutral-500 dark:text-neutral-500 bg-neutral-100 dark:bg-neutral-800 p-2 rounded">
            <strong>Instructions:</strong> {repository.instructions}
          </div>
        </div>
      )}

      {/* File upload area */}
      <div
        className={`m-4 border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer bg-white/30 dark:bg-neutral-800/60 backdrop-blur-lg
          ${isDragOver 
            ? 'border-slate-400 bg-slate-50/50 dark:bg-neutral-700/70' 
            : 'border-neutral-300 dark:border-neutral-600 hover:border-slate-400 dark:hover:border-slate-500 hover:bg-white/40 dark:hover:bg-neutral-800/70'
          }`}
        onDrop={handleDrop}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onClick={() => document.getElementById('file-upload')?.click()}
      >
        <Upload size={24} className="mx-auto mb-2 text-neutral-400" />
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Drop files here or click to upload
        </p>
        <input
          type="file"
          multiple
          onChange={handleFileSelect}
          className="hidden"
          id="file-upload"
        />
      </div>

      {/* Files list */}
      <div className="flex-1 overflow-auto p-4">
        <h4 className="font-medium text-neutral-900 dark:text-neutral-100 mb-3">
          Files ({files.length})
        </h4>
        
        {files.length === 0 ? (
          <p className="text-sm text-neutral-500 dark:text-neutral-400 text-center py-8">
            No files uploaded yet
          </p>
        ) : (
          <div className="flex flex-wrap gap-3">
            {files
              .slice()
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((file: RepositoryFile) => (
              <div
                key={file.id}
                className="relative group"
                title={file.name}
              >
                <div className={`relative w-20 h-20 ${
                  file.status === 'processing' 
                    ? 'bg-white/30 dark:bg-neutral-800/60 backdrop-blur-lg border-2 border-dashed border-white/50 dark:border-white/30'
                    : file.status === 'error'
                    ? 'bg-red-100/40 dark:bg-red-900/25 backdrop-blur-lg border border-red-300/40 dark:border-red-600/25'
                    : 'bg-white/40 dark:bg-neutral-800/60 backdrop-blur-lg border border-white/40 dark:border-white/25'
                } rounded-xl shadow-sm flex flex-col items-center justify-center p-2 hover:shadow-md hover:border-white/60 dark:hover:border-white/40 transition-all`}>
                  
                  {file.status === 'processing' ? (
                    <div className="flex flex-col items-center justify-center">
                      <Loader2 size={20} className="animate-spin text-neutral-500 dark:text-neutral-400 mb-1" />
                      <div className="text-xs text-neutral-600 dark:text-neutral-400 font-medium">
                        {file.progress}%
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-center w-full h-full">
                      <FileText size={18} className={`mb-1 flex-shrink-0 ${
                        file.status === 'error' 
                          ? 'text-red-600 dark:text-red-400' 
                          : 'text-neutral-600 dark:text-neutral-300'
                      }`} />
                      <div className={`text-xs font-medium truncate w-full leading-tight ${
                        file.status === 'error' 
                          ? 'text-red-700 dark:text-red-300' 
                          : 'text-neutral-700 dark:text-neutral-200'
                      }`}>
                        {file.name}
                      </div>
                      {file.status === 'error' && (
                        <div className="text-xs mt-0.5 text-red-600 dark:text-red-400">
                          Error
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Remove button - always available */}
                  <button
                    type="button"
                    className="absolute top-1 right-1 size-5 bg-neutral-800/80 hover:bg-neutral-900 dark:bg-neutral-200/80 dark:hover:bg-neutral-100 text-white dark:text-neutral-900 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all backdrop-blur-sm shadow-sm cursor-pointer"
                    onClick={() => removeFile(file.id)}
                    title={file.status === 'processing' ? 'Cancel upload and remove file' : 'Remove file'}
                  >
                    <X size={10} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface EditRepositoryFormProps {
  repository: Repository;
  onSubmit: (id: string, name: string, instructions: string) => void;
  onCancel: () => void;
  onDelete: (id: string) => void;
}

function EditRepositoryForm({ repository, onSubmit, onCancel, onDelete }: EditRepositoryFormProps) {
  const [name, setName] = useState(repository.name);
  const [instructions, setInstructions] = useState(repository.instructions || '');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onSubmit(repository.id, name.trim(), instructions.trim());
    }
  };

  const handleDelete = () => {
    onDelete(repository.id);
    onCancel();
  };

  if (showDeleteConfirm) {
    return (
      <div className="p-4">
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
          Delete Repository
        </h3>
        <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-6">
          Are you sure you want to delete "{repository.name}"? This action cannot be undone and will remove all files in this repository.
        </p>
        <div className="flex gap-2">
          <Button
            onClick={handleDelete}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md 
                     transition-colors cursor-pointer"
          >
            Delete Repository
          </Button>
          <Button
            onClick={() => setShowDeleteConfirm(false)}
            className="flex-1 bg-neutral-200 dark:bg-neutral-700 hover:bg-neutral-300 dark:hover:bg-neutral-600 
                     text-neutral-700 dark:text-neutral-300 px-4 py-2 rounded-md transition-colors cursor-pointer"
          >
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
        Edit Repository
      </h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
            Name *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md 
                     bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100
                     focus:ring-2 focus:ring-slate-500 focus:border-transparent"
            placeholder="Enter repository name"
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
            Instructions
          </label>
          <textarea
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md 
                     bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100
                     focus:ring-2 focus:ring-slate-500 focus:border-transparent resize-none"
            placeholder="Optional instructions for this repository"
          />
        </div>
        
        <div className="flex gap-2 pt-2">
          <Button
            type="submit"
            className="flex-1 bg-slate-600 hover:bg-slate-700 text-white px-4 py-2 rounded-md 
                     transition-colors cursor-pointer"
          >
            Save Changes
          </Button>
          <Button
            type="button"
            onClick={onCancel}
            className="flex-1 bg-neutral-200 dark:bg-neutral-700 hover:bg-neutral-300 dark:hover:bg-neutral-600 
                     text-neutral-700 dark:text-neutral-300 px-4 py-2 rounded-md transition-colors cursor-pointer"
          >
            Cancel
          </Button>
        </div>
        
        <div className="pt-4 border-t border-neutral-200 dark:border-neutral-700">
          <Button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="w-full flex items-center justify-center gap-2 text-red-600 dark:text-red-400 
                     hover:text-red-700 dark:hover:text-red-300 text-sm cursor-pointer"
          >
            <Trash2 size={14} />
            Delete Repository
          </Button>
        </div>
      </form>
    </div>
  );
}

export function RepositoryDrawer() {
  const { 
    repositories, 
    currentRepository, 
    createRepository, 
    setCurrentRepository,
    updateRepository,
    deleteRepository,
    setShowRepositoryDrawer
  } = useRepositories();
  
  const [editingRepository, setEditingRepository] = useState<Repository | null>(null);
  const [inlineEditingId, setInlineEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newRepositoryName, setNewRepositoryName] = useState('');

  const handleCreateRepository = (name: string) => {
    createRepository(name);
    setIsCreatingNew(false);
    setNewRepositoryName('');
  };

  const handleEditRepository = (id: string, name: string, instructions: string) => {
    updateRepository(id, {
      name,
      instructions: instructions || undefined
    });
    setEditingRepository(null);
  };

  const handleDeleteRepository = async (id: string) => {
    await deleteRepository(id);
    setEditingRepository(null);
  };

  const startInlineEdit = (repository: Repository) => {
    setInlineEditingId(repository.id);
    setEditingName(repository.name);
  };

  const saveInlineEdit = () => {
    if (inlineEditingId && editingName.trim()) {
      updateRepository(inlineEditingId, { name: editingName.trim() });
      setInlineEditingId(null);
      setEditingName('');
    }
  };

  const cancelInlineEdit = () => {
    setInlineEditingId(null);
    setEditingName('');
  };

  const startCreatingNew = () => {
    setIsCreatingNew(true);
    setNewRepositoryName('');
  };

  const saveNewRepository = (closeMenu?: () => void) => {
    if (newRepositoryName.trim()) {
      handleCreateRepository(newRepositoryName.trim());
    }
    closeMenu?.();
  };

  const cancelNewRepository = (closeMenu?: () => void) => {
    setIsCreatingNew(false);
    setNewRepositoryName('');
    closeMenu?.();
  };

  const handleKeyDown = (e: React.KeyboardEvent, closeMenu?: () => void) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (isCreatingNew) {
        saveNewRepository(closeMenu);
      } else {
        saveInlineEdit();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      if (isCreatingNew) {
        cancelNewRepository(closeMenu);
      } else {
        cancelInlineEdit();
      }
    }
  };

  if (editingRepository) {
    return (
      <EditRepositoryForm
        repository={editingRepository}
        onSubmit={handleEditRepository}
        onCancel={() => setEditingRepository(null)}
        onDelete={handleDeleteRepository}
      />
    );
  }



  return (
    <div className="h-full flex flex-col rounded-xl overflow-hidden animate-in fade-in duration-200">
      {/* Header with Unified Repository Selector */}
      <div className="p-4 border-b border-neutral-200 dark:border-neutral-700">
        <Menu as="div" className="relative w-full">
          <Menu.Button className="relative w-full cursor-pointer rounded-lg bg-white/60 dark:bg-neutral-800 py-2 pl-3 pr-10 text-left shadow-md border border-neutral-300 dark:border-neutral-600 focus:ring-2 focus:ring-slate-500 hover:border-neutral-400 dark:hover:border-neutral-500 transition-colors backdrop-blur-lg">
            <span className="flex items-center gap-2">
              <Folder size={16} className="text-slate-600 dark:text-slate-400" />
              <span className="block truncate text-neutral-900 dark:text-neutral-100 font-medium">
                {currentRepository?.name || 'None'}
              </span>
            </span>
            <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
              <ChevronDown size={16} className="text-neutral-400" />
            </span>
          </Menu.Button>

          <Menu.Items className="absolute z-20 mt-1 w-full max-h-80 overflow-auto rounded-md bg-white/60 dark:bg-neutral-800 py-1 shadow-lg ring-1 ring-black ring-opacity-5 backdrop-blur-lg">
            {/* None Option */}
            <Menu.Item>
              {({ active }) => (
                <button
                  onClick={() => {
                    setCurrentRepository(null);
                    setShowRepositoryDrawer(false);
                  }}
                  className={`${
                    active ? 'bg-slate-50 dark:bg-slate-900/20' : ''
                  } group relative flex items-center justify-between px-3 py-2 w-full text-left border-b border-neutral-200 dark:border-neutral-600 cursor-pointer`}
                >
                  <div className="flex items-center gap-2">
                    <X size={16} className="text-slate-600 dark:text-slate-400 flex-shrink-0" />
                    <span className={`block truncate text-sm ${
                      !currentRepository
                        ? 'font-semibold text-neutral-900 dark:text-neutral-100' 
                        : 'text-neutral-700 dark:text-neutral-300'
                    }`}>
                      None
                    </span>
                  </div>
                </button>
              )}
            </Menu.Item>

            {/* Create New Repository Option */}
            <Menu.Item disabled={isCreatingNew}>
              {({ active, close }) => (
                <div
                  className={`${
                    active && !isCreatingNew ? 'bg-slate-100 dark:bg-slate-700' : ''
                  } group relative flex items-center justify-between px-3 py-2 border-b border-neutral-200 dark:border-neutral-600`}
                >
                  {isCreatingNew ? (
                    <div className="flex items-center gap-2 flex-1">
                      <Plus size={16} className="text-slate-600 dark:text-slate-400 flex-shrink-0" />
                      <input
                        type="text"
                        value={newRepositoryName}
                        onChange={(e) => setNewRepositoryName(e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, close)}
                        autoFocus
                        className="flex-1 text-sm bg-white dark:bg-neutral-700 border border-slate-500 rounded px-2 py-1 text-neutral-900 dark:text-neutral-100 focus:ring-1 focus:ring-slate-500"
                        placeholder="Repository name"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          saveNewRepository(close);
                        }}
                        className="p-1 text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 rounded transition-colors cursor-pointer"
                        title="Create"
                      >
                        <Check size={12} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          cancelNewRepository(close);
                        }}
                        className="p-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 rounded transition-colors cursor-pointer"
                        title="Cancel"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        startCreatingNew();
                      }}
                      className="flex items-center gap-2 w-full text-sm text-slate-600 dark:text-slate-400 font-medium cursor-pointer"
                    >
                      <Plus size={16} />
                      Create New Repository
                    </button>
                  )}
                </div>
              )}
            </Menu.Item>

            {/* Existing Repositories */}
            {repositories
              .slice()
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((repository) => {
              const isCurrentRepo = currentRepository?.id === repository.id;
              const isBeingEdited = inlineEditingId === repository.id;
              
              return (
                <Menu.Item key={`${repository.id}-${repository.name}`}>
                  {({ active }) => (                  <div
                    className={`${
                      active ? 'bg-slate-50 dark:bg-slate-900/20' : ''
                    } group relative flex items-center justify-between px-3 py-2`}
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <Folder size={16} className="text-slate-600 dark:text-slate-400 flex-shrink-0" />
                        
                        {isBeingEdited ? (
                          <div className="flex items-center gap-2 flex-1">
                            <input
                              type="text"
                              value={editingName}
                              onChange={(e) => setEditingName(e.target.value)}
                              onKeyDown={handleKeyDown}
                              autoFocus
                              className="flex-1 text-sm bg-white dark:bg-neutral-700 border border-slate-500 rounded px-2 py-1 text-neutral-900 dark:text-neutral-100 focus:ring-1 focus:ring-slate-500"
                              onClick={(e) => e.stopPropagation()}
                            />
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                saveInlineEdit();
                              }}
                              className="p-1 text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 rounded transition-colors cursor-pointer"
                              title="Save"
                            >
                              <Check size={12} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                cancelInlineEdit();
                              }}
                              className="p-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 rounded transition-colors cursor-pointer"
                              title="Cancel"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setCurrentRepository(repository)}
                            className="flex items-center gap-2 flex-1 text-left min-w-0 cursor-pointer"
                          >
                            <span className={`block truncate text-sm ${
                              isCurrentRepo
                                ? 'font-semibold text-neutral-900 dark:text-neutral-100' 
                                : 'text-neutral-700 dark:text-neutral-300'
                            }`}>
                              {repository.name}
                            </span>
                          </button>
                        )}
                      </div>
                      
                      {/* Action buttons - shown on hover/focus, hidden during inline edit */}
                      {!isBeingEdited && (
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity ml-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              startInlineEdit(repository);
                            }}
                            className="p-1 text-neutral-400 hover:text-slate-600 dark:hover:text-slate-400 rounded transition-colors cursor-pointer"
                            title="Edit repository name"
                          >
                            <Edit size={12} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (window.confirm(`Are you sure you want to delete "${repository.name}"?`)) {
                                deleteRepository(repository.id);
                                if (isCurrentRepo) {
                                  setCurrentRepository(null);
                                }
                              }
                            }}
                            className="p-1 text-neutral-400 hover:text-red-600 dark:hover:text-red-400 rounded transition-colors cursor-pointer"
                            title="Delete repository"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </Menu.Item>
              );
            })}


          </Menu.Items>
        </Menu>
      </div>

      {/* Repository Details */}
      {currentRepository ? (
        <RepositoryDetails 
          key={currentRepository.id} 
          repository={currentRepository}
        />
      ) : (
        <div className="flex flex-col items-center justify-center h-full p-8 text-center">
          <Folder size={48} className="text-neutral-300 dark:text-neutral-600 mb-4" />
          <h3 className="text-lg font-medium text-neutral-900 dark:text-neutral-100 mb-2">
            No Repository Selected
          </h3>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-6">
            {repositories.length === 0 
              ? "Create your first repository to organize documents and instructions"
              : "Select a repository from the dropdown above to view and manage its files"
            }
          </p>
        </div>
      )}
    </div>
  );
}
