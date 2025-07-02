import { createContext } from "react";

// Types
export interface Language {
  code: string;
  name: string;
}

export interface TranslateContextType {
  // State
  sourceText: string;
  translatedText: string;
  targetLang: string;
  isLoading: boolean;
  selectedFile: File | null;
  translatedFileUrl: string | null;
  translatedFileName: string | null;
  
  // Data
  languages: Language[];
  selectedLanguage: Language | undefined;
  
  // Actions
  setSourceText: (text: string) => void;
  setTargetLang: (langCode: string) => void;
  performTranslate: (langCode?: string, textToTranslate?: string) => Promise<void>;
  handleReset: () => void;
  selectFile: (file: File) => void;
  clearFile: () => void;
}

export const TranslateContext = createContext<TranslateContextType | undefined>(undefined);

// Available languages
export const LANGUAGES: Language[] = [
  { code: "en", name: "English" },
  { code: "de", name: "German" },
  { code: "fr", name: "French" },
  { code: "it", name: "Italian" },
  { code: "es", name: "Spanish" },
];
