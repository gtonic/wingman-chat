import { Eye, Code } from 'lucide-react';
import { Button } from '@headlessui/react';

type PreviewButtonProps = {
  showCode: boolean;
  onToggle: () => void;
  className?: string;
};

export const PreviewButton = ({ showCode, onToggle, className }: PreviewButtonProps) => {
  return (
    <Button
      onClick={onToggle}
      className="text-neutral-400 hover:text-neutral-600 dark:text-neutral-400 dark:hover:text-neutral-300 transition-colors opacity-60 hover:opacity-100 p-1"
      title={showCode ? 'Show preview' : 'Show code'}
    >
      {showCode ? <Eye className={className || "h-4 w-4"} /> : <Code className={className || "h-4 w-4"} />}
    </Button>
  );
};
