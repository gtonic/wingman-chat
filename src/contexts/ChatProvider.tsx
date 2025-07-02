import { useState, useCallback } from "react";
import { Message, Model, Tool, Role } from "../types/chat";
import { useModels } from "../hooks/useModels";
import { useChats } from "../hooks/useChats";
import { useRepositories } from "../hooks/useRepositories";
import { useRepository } from "../hooks/useRepository";
import { useBridge } from "../hooks/useBridge";
import { useProfile } from "../hooks/useProfile";
import { getConfig } from "../config";
import { ChatContext, ChatContextType } from './ChatContext';

interface ChatProviderProps {
  children: React.ReactNode;
}

export function ChatProvider({ children }: ChatProviderProps) {
  const config = getConfig();
  const client = config.client;

  const { models, selectedModel, setSelectedModel } = useModels();
  const { chats, createChat: createChatHook, updateChat, deleteChat: deleteChatHook } = useChats();
  const { currentRepository } = useRepositories();
  const { queryTools } = useRepository(currentRepository?.id || '');
  const { bridgeTools } = useBridge();
  const { settings: profile, generateInstructions } = useProfile();
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
    async (message: Message, tools?: Tool[]) => {
      const { id, chat: chatObj } = getOrCreateChat();

      const existingMessages = chats.find(c => c.id === id)?.messages || [];
      const conversation = [...existingMessages, message];
      const updateMessages = (msgs: Message[]) => updateChat(id, { messages: msgs });

      updateMessages([...conversation, { role: Role.Assistant, content: '' }]);

      try {
        // Get repository tools dynamically
        const repositoryTools = currentRepository ? queryTools() : [];
        const completionTools = [...bridgeTools, ...repositoryTools, ...(tools || [])];

        let instructions = '';

        // Add profile instructions first if they exist
        const profileInstructions = generateInstructions();
        if (profileInstructions.trim()) {
          instructions = profileInstructions + '\n\n';
        }

        if (repositoryTools.length > 0) {
          instructions += `You are an intelligent document-retrieval assistant.

          Your mission:
          1. For *every* user query, you MUST first invoke the \`query_knowledge_database\` tool with a concise, natural-language query.
          2. Examine the tool's results.
             - If you get ≥1 relevant documents or facts, answer the user *solely* using those results.
             - Include source citations (e.g. doc IDs, relevance scores, or text snippets).
          3. Only if the tool returns no relevant information, you may answer from general knowledge—but still note "no document match; using fallback knowledge".
          4. If the tool call fails, report the failure and either retry or ask the user to clarify.
          5. Be concise, accurate, and transparent about sources.

          Use GitHub Flavored Markdown to format your responses including tables, code blocks, links, and lists.`;
        }

        const completion = await client.complete(
          model!.id,
          instructions,
          conversation,
          completionTools,
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
    }, [getOrCreateChat, chats, updateChat, currentRepository, queryTools, bridgeTools, profile, generateInstructions, client, model]);

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
