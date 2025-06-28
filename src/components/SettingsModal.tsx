import { Fragment, useState } from 'react';
import { X, Settings, MessageSquare, Trash2, ChevronsUpDown, Check } from 'lucide-react';
import { Dialog, Transition, Listbox } from '@headlessui/react';
import { useSettings } from '../hooks/useSettings';
import { useChat } from '../hooks/useChat';
import type { Theme } from '../contexts/ThemeContext';
import type { LayoutMode } from '../types/settings';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const themeOptions: { value: Theme; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

const layoutOptions: { value: LayoutMode; label: string }[] = [
  { value: 'normal', label: 'Normal' },
  { value: 'wide', label: 'Wide' },
];

const sections = [
  { id: 'general', label: 'General', icon: Settings },
  { id: 'chats', label: 'Chats', icon: MessageSquare },
];

// A generic, reusable Select component using Headless UI Listbox
function Select<T extends string | null>({ label, value, onChange, options, helpText, containerClassName }: { label?: string, value: T, onChange: (value: T) => void, options: { value: T, label: string }[], helpText?: string, containerClassName?: string }) {
  return (
    <div className={containerClassName}>
      {label && <label className="block text-sm font-medium text-neutral-900 dark:text-neutral-100 mb-2">{label}</label>}
      <Listbox value={value} onChange={onChange}>
        <Listbox.Button className="relative w-full cursor-pointer rounded-lg bg-white dark:bg-neutral-800/60 py-2 pl-3 pr-10 text-left border border-neutral-300 dark:border-neutral-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 data-[headlessui-state=open]:ring-2 data-[headlessui-state=open]:ring-blue-500">
          <span className="block truncate">{options.find(o => o.value === value)?.label ?? 'None'}</span>
          <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
            <ChevronsUpDown className="h-5 w-5 text-neutral-400" aria-hidden="true" />
          </span>
        </Listbox.Button>
        <Transition as={Fragment} leave="transition ease-in duration-100" leaveFrom="opacity-100" leaveTo="opacity-0">
          <Listbox.Options anchor="bottom" className="mt-1 w-[var(--button-width)] max-h-60 overflow-auto rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-100/80 dark:bg-neutral-800/80 p-1 backdrop-blur-xl focus:outline-none sm:text-sm z-10 transition duration-100 ease-in data-[leave]:data-[closed]:opacity-0">
            {options.map((option) => (
              <Listbox.Option
                key={String(option.value)}
                className="group relative cursor-pointer select-none py-2 pl-10 pr-4 rounded-lg text-neutral-900 dark:text-neutral-100 data-[focus]:bg-neutral-200 dark:data-[focus]:bg-neutral-700/80"
                value={option.value}
              >
                <span className="block truncate font-normal group-data-[selected]:font-semibold">{option.label}</span>
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-blue-600 dark:text-blue-400 group-data-[selected]:visible invisible">
                  <Check className="h-5 w-5" aria-hidden="true" />
                </span>
              </Listbox.Option>
            ))}
          </Listbox.Options>
        </Transition>
      </Listbox>
      {helpText && <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-2">{helpText}</p>}
    </div>
  );
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const {
    theme, setTheme, layoutMode, setLayoutMode,
    backgroundPacks, backgroundSetting, setBackground
  } = useSettings();
  const { chats, deleteChat } = useChat();
  const [activeSection, setActiveSection] = useState('general');

  const handleDeleteAllChats = () => {
    if (window.confirm(`Are you sure you want to delete all ${chats.length} chat${chats.length === 1 ? '' : 's'}? This action cannot be undone.`)) {
      chats.forEach(chat => deleteChat(chat.id));
    }
  };

  const backgroundOptions = [{ value: null, label: 'None' }, ...backgroundPacks.map(p => ({ value: p.name, label: p.name }))];
  const sectionOptions = sections.map(s => ({ value: s.id, label: s.label }));

  const renderSectionContent = () => {
    switch (activeSection) {
      case 'general':
        return (
          <div className="space-y-6">
            <Select label="Theme" value={theme} onChange={setTheme} options={themeOptions} helpText="System will follow your device's theme setting." />
            {backgroundPacks.length > 0 && <Select label="Background" value={backgroundSetting} onChange={setBackground} options={backgroundOptions} helpText="Choose a background image pack." />}
            <Select label="Layout" value={layoutMode} onChange={setLayoutMode} options={layoutOptions} helpText="Choose between normal or wide layout for larger screens." />
          </div>
        );
      case 'chats':
        return (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-neutral-900 dark:text-neutral-100 mb-1">Chat Management</h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">You have {chats.length} chat{chats.length === 1 ? '' : 's'} saved locally.</p>
            </div>
            <button
              onClick={handleDeleteAllChats}
              disabled={chats.length === 0}
              className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors border bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 border-red-200 dark:border-red-800 disabled:bg-neutral-100 dark:disabled:bg-neutral-800 disabled:text-neutral-400 dark:disabled:text-neutral-600 disabled:cursor-not-allowed disabled:border-transparent"
            >
              <Trash2 size={16} />
              Delete All Chats
            </button>
          </div>
        );
      default: return null;
    }
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
          <div className="fixed inset-0 bg-black/30 dark:bg-black/50" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
              <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white dark:bg-neutral-900 text-left align-middle shadow-xl transition-all flex flex-col">
                <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-700">
                  <Dialog.Title as="h3" className="hidden sm:block text-lg font-medium leading-6 text-neutral-900 dark:text-neutral-100">Settings</Dialog.Title>
                  <div className="sm:hidden flex-1 pr-4">
                    <Select 
                      value={activeSection} 
                      onChange={v => setActiveSection(v as string)} 
                      options={sectionOptions} 
                    />
                  </div>
                  <button onClick={onClose} className="p-1 rounded-full text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
                    <X size={20} />
                  </button>
                </div>

                <div className="flex flex-1 min-h-0">
                  <nav className="hidden sm:block w-48 border-r border-neutral-200 dark:border-neutral-800 p-1">
                    <div className="space-y-1">
                      {sections.map((section) => (
                        <button
                          key={section.id}
                          onClick={() => setActiveSection(section.id)}
                          className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium transition-colors rounded-md text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-200 dark:hover:bg-neutral-700/80 data-[active=true]:text-neutral-900 dark:data-[active=true]:text-neutral-100 data-[active=true]:bg-neutral-200 dark:data-[active=true]:bg-neutral-700/80 cursor-pointer"
                          data-active={activeSection === section.id}
                        >
                          <section.icon size={16} />
                          {section.label}
                        </button>
                      ))}
                    </div>
                  </nav>
                  <div className="flex-1 p-6 overflow-y-auto">
                    {renderSectionContent()}
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
