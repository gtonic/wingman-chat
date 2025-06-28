import { createContext, useState, useCallback } from "react";
import { Chat, Message, Model, Role } from "../models/chat";
import { useModels } from "../hooks/useModels";
import { useChats } from "../hooks/useChats";
import { getConfig } from "../config";

export interface ChatContextType {
  // Models
  models: Model[];
  model: Model | null; // Current effective model (derived from chat.model || selectedModel || models[0])
  setModel: (model: Model | null) => void;

  // Chats
  chats: Chat[];
  chat: Chat | null;
  messages: Message[];

  // Chat actions
  createChat: () => Chat;
  selectChat: (chatId: string) => void;
  deleteChat: (chatId: string) => void;
  updateChat: (chatId: string, updates: Partial<Chat>) => void;

  addMessage: (message: Message) => void;
  sendMessage: (message: Message) => Promise<void>;

}

export const ChatContext = createContext<ChatContextType | undefined>(undefined);

interface ChatProviderProps {
  children: React.ReactNode;
}

export function ChatProvider({ children }: ChatProviderProps) {
  const config = getConfig();
  const client = config.client;
  const bridge = config.bridge;

  const { models, selectedModel, setSelectedModel } = useModels();
  const { chats, createChat: createChatHook, updateChat, deleteChat: deleteChatHook } = useChats();
  const [chatId, setChatId] = useState<string | null>(null);

  const chat = chats.find(c => c.id === chatId) ?? null;
  const model = chat?.model ?? selectedModel ?? models[0];
  const messages = chat?.messages ?? [];


  // Handler functions with stable references
  const createChat = useCallback(() => {
    const newChat = createChatHook();
    setChatId(newChat.id);
    return newChat;
  }, [createChatHook]);

  const selectChat = useCallback((chatId: string) => {
    setChatId(chatId);
  }, []);

  const deleteChat = useCallback(
    (id: string) => {
      deleteChatHook(id);
      if (chatId === id) {
        setChatId(null);
      }
    },
    [deleteChatHook, chatId]
  );

  // Unified setModel function that does the right thing based on context
  const setModel = useCallback((model: Model | null) => {
    if (chat) {
      // Update existing chat's model
      updateChat(chat.id, { model });
    } else {
      // Store selected model for when a new chat is created
      setSelectedModel(model);
    }
  }, [chat, updateChat, setSelectedModel]);

  // Helper to get or create a chat and its id
  const getOrCreateChat = useCallback(() => {
    if (!model) {
      throw new Error('no model selected');
    }

    let id = chatId;
    let chatItem = id ? chats.find(c => c.id === id) || null : null;

    if (!chatItem) {
      chatItem = createChatHook();
      chatItem.model = model;

      setChatId(chatItem.id);
      updateChat(chatItem.id, { model });

      id = chatItem.id;
    }

    return { id: id!, chat: chatItem! };
  }, [model, createChatHook, updateChat, setChatId, chatId, chats]);

  const addMessage = useCallback(
    (message: Message) => {
      if (!message.content.trim()) return;

      const { id } = getOrCreateChat();
      const existingMessages = chats.find(c => c.id === id)?.messages || [];
      updateChat(id, { messages: [...existingMessages, message] });
    },
    [getOrCreateChat, updateChat, chats]
  );

  const sendMessage = useCallback(
    async (message: Message) => {
      const { id, chat: chatObj } = getOrCreateChat();

      const existingMessages = chats.find(c => c.id === id)?.messages || [];
      const conversation = [...existingMessages, message];
      const updateMessages = (msgs: Message[]) => updateChat(id, { messages: msgs });

      updateMessages([...conversation, { role: Role.Assistant, content: '' }]);

    try {
      const tools = await bridge.listTools();

      const completion = await client.complete(
        model!.id,
        tools,
        conversation,
        (_, snapshot) => updateMessages([...conversation, { role: Role.Assistant, content: snapshot }])
      );

      updateMessages([...conversation, completion]);

      if (!chatObj.title || conversation.length % 3 === 0) {
        client
          .summarize(model!.id, conversation)
          .then(title => updateChat(id, { title }));
      }
    } catch (error) {
      console.error(error);

      if (error?.toString().includes('missing finish_reason')) return;

      const errorMessage = { role: Role.Assistant, content: `An error occurred:\n${error}` };
      updateMessages([...conversation, errorMessage]);
    }
  }, [getOrCreateChat, updateChat, bridge, client, model, chats]);

  const value: ChatContextType = {
    // Models
    models,
    model,
    setModel,

    // Chats
    chats,
    chat,
    messages,

    // Chat actions
    createChat,
    selectChat,
    deleteChat,
    updateChat,

    // Message actions
    addMessage,
    sendMessage,

  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}
