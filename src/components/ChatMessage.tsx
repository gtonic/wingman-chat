import { Markdown } from './Markdown';
import { CopyButton } from './CopyButton';
import { PlayButton } from './PlayButton';
import { Bot, User, File, Brain } from "lucide-react";

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
        <div className="mr-3 pt-3">
          <Bot className="w-6 h-6" />
        </div>
        <div className="flex items-center pt-5">
          <Brain className="w-5 h-5 animate-bounce text-neutral-600 dark:text-neutral-400" />
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex chat-bubble ${isUser ? "justify-end" : "justify-start"} mb-4`}
    >
      {!isUser && (
        <div className="mr-3 pt-3">
          <Bot className="w-6 h-6" />
        </div>
      )}

      <div
        className={`max-w-[80%] rounded-lg p-3 ${isUser ? "chat-bubble-user" : "chat-bubble-assistant group"} break-words overflow-x-auto`}
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
          <div className="flex justify-between items-center mt-2">
            <div className="flex items-center gap-2">
              <CopyButton text={message.content} />
              {enableTTS && <PlayButton text={message.content} />}
            </div>
          </div>
        )}
      </div>

      {isUser && (
        <div className="ml-3 pt-3">
          <User className="w-6 h-6" />
        </div>
      )}
    </div>
  );
}
