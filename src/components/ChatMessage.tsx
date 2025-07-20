import { Markdown } from './Markdown';
import { CopyButton } from './CopyButton';
import { PlayButton } from './PlayButton';
import { File } from "lucide-react";

import { AttachmentType, Message, Role } from "../types/chat";
import { getConfig } from "../config";

type ChatMessageProps = {
  message: Message;
};

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === Role.User;
  
  const config = getConfig();
  const enableTTS = config.tts;

  if (!isUser && !message.content) {
    return (
      <div className="flex justify-start mb-4">
        <div className="flex-1 py-3">
          <div className="space-y-2">
            <div className="flex space-x-1">
              <div className="h-2 w-2 bg-neutral-400 dark:bg-neutral-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="h-2 w-2 bg-neutral-400 dark:bg-neutral-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="h-2 w-2 bg-neutral-400 dark:bg-neutral-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex chat-bubble ${isUser ? "justify-end" : "justify-start"} mb-4 group`}
    >
      <div
        className={`${
          isUser 
            ? "rounded-lg py-3 px-3 chat-bubble-user" 
            : "flex-1 py-3"
        } break-words overflow-x-auto`}
      >
        <Markdown>{message.content}</Markdown>

        {message.attachments && message.attachments.length > 0 && (
          <div className="flex flex-col gap-2 pt-2">
            <div className="grid grid-cols-2 gap-2">
              {message.attachments
                .filter(
                  (attachment) => attachment.type !== AttachmentType.Image
                )
                .map((attachment, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm">
                    <File className="w-4 h-4 shrink-0" />
                    <span className="truncate">{attachment.name}</span>
                  </div>
                ))}
            </div>

            <div className="flex flex-wrap gap-4">
              {message.attachments
                .filter(
                  (attachment) => attachment.type === AttachmentType.Image
                )
                .map((attachment, index) => (
                  <img
                    key={index}
                    src={attachment.data}
                    className="max-h-60 rounded-md"
                    alt={attachment.name}
                  />
                ))}
            </div>
          </div>
        )}
        
        {!isUser && (
          <div className="flex justify-between items-center mt-2 chat-message-actions">
            <div className="flex items-center gap-2">
              <CopyButton text={message.content} />
              {enableTTS && <PlayButton text={message.content} />}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
