import { useContext } from "react";
import { TranslateContext } from '../contexts/TranslateContext';

export function useTranslate() {
  const context = useContext(TranslateContext);
  if (context === undefined) {
    throw new Error("useTranslate must be used within a TranslateProvider");
  }
  return context;
}
