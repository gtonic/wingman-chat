import { useState } from 'react';
import { Copy as CopyIcon, CopyCheck as CopyCheckIcon } from "lucide-react";
import { Button } from "@headlessui/react";

type CopyButtonProps = {
  text: string;
  className?: string;
};

export const CopyButton = ({ text, className }: CopyButtonProps) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (error) {
            console.error("failed to copy", error);
        }
    };

    const buttonClasses = "text-neutral-400 hover:text-neutral-600 dark:text-neutral-400 dark:hover:text-neutral-300 transition-colors opacity-60 hover:opacity-100 p-1";

    return (
        <Button
            onClick={handleCopy}
            className={buttonClasses}
            title="Copy message to clipboard"
        >
            {copied ? (
                <CopyCheckIcon className={className || "h-4 w-4"} />
            ) : (
                <CopyIcon className={className || "h-4 w-4"} />
            )}
        </Button>
    );
};