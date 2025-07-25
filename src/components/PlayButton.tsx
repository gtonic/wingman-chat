import { useState } from 'react';
import { Play, Square, Loader2 } from 'lucide-react';
import { Button } from "@headlessui/react";
import { Client } from '../lib/client';

type PlayButtonProps = {
  text: string;
  voice?: string;
  size?: number;
};

export function PlayButton({ text, ...props }: PlayButtonProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handlePlay = async () => {
    if (isPlaying || isLoading) {
      return;
    }

    setIsLoading(true);
    setIsPlaying(true);

    try {
      const client = new Client();
      await client.speakText("", text);
    } catch (error) {
      console.error('Failed to play text:', error);
    } finally {
      setIsLoading(false);
      setIsPlaying(false);
    }
  };

  const buttonClasses = "text-neutral-400 hover:text-neutral-600 dark:text-neutral-400 dark:hover:text-neutral-300 transition-colors opacity-60 hover:opacity-100 disabled:opacity-30 p-1";
  const iconSize = `h-${props.size ?? 3} w-${props.size ?? 3}`;

  return (
    <Button
      onClick={handlePlay}
      disabled={isLoading || isPlaying}
      className={buttonClasses}
      title={isLoading ? "Generating audio..." : isPlaying ? "Playing audio..." : "Play message"}
    >
      {isLoading ? (
        <Loader2 className={`${iconSize} animate-spin`} />
      ) : isPlaying ? (
        <Square className={iconSize} />
      ) : (
        <Play className={iconSize} />
      )}
    </Button>
  );
}
