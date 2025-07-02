import { memo, useEffect, useRef, useState, useContext } from 'react';
import { Eye, Code } from 'lucide-react';
import { Button } from '@headlessui/react';
import { CopyButton } from './CopyButton';
import { ChatContext } from '../contexts/ChatContext';
import { Role } from '../types/chat';

interface CardRendererProps {
    cardJson: string;
}

interface CardsModule {
    AdaptiveCard: any;
    onProcessMarkdown?: (text: string, result: any) => void;
}

interface MarkdownItModule {
    default: any;
}

const NonMemoizedCardRenderer = ({ cardJson }: CardRendererProps) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [renderedCard, setRenderedCard] = useState<HTMLElement | null>(null);
    const [error, setError] = useState<string>('');
    const [isLoading, setIsLoading] = useState(true);
    const [librariesLoaded, setLibrariesLoaded] = useState(false);
    const [showPreview, setShowPreview] = useState(true);
    const cardsRef = useRef<CardsModule | null>(null);
    
    // Get ChatContext for sending messages
    const chatContext = useContext(ChatContext);

    // Dynamic import of adaptive cards and markdown-it
    useEffect(() => {
        const loadLibraries = async () => {
            try {
                const [cardsModule, markdownItModule] = await Promise.all([
                    import('adaptivecards') as Promise<CardsModule>,
                    import('markdown-it') as Promise<MarkdownItModule>
                ]);

                cardsRef.current = cardsModule;
                
                // Setup markdown processing
                if (cardsModule.AdaptiveCard) {
                    cardsModule.AdaptiveCard.onProcessMarkdown = function (text: string, result: any) {
                        result.outputHtml = markdownItModule.default().render(text);
                        result.didProcess = true;
                    };
                }

                setLibrariesLoaded(true);
            } catch (error) {
                console.error('Failed to load Adaptive Cards libraries:', error);
                setError('Failed to load card renderer');
                setIsLoading(false);
            }
        };

        loadLibraries();
    }, []);

    // Helper function to validate if JSON is complete and valid
    const isValidCompleteJson = (jsonString: string): boolean => {
        if (!jsonString.trim()) return false;
        
        try {
            const parsed = JSON.parse(jsonString);
            // Basic check for adaptive card structure
            return parsed && typeof parsed === 'object' && (parsed.type || parsed.$schema);
        } catch {
            return false;
        }
    };

    const hasValidJson = isValidCompleteJson(cardJson);

    // Helper function to check if JSON appears to be streaming (incomplete)
    const isStreamingJson = (jsonString: string): boolean => {
        const trimmed = jsonString.trim();
        if (!trimmed) return true;
        
        // Check for obvious incomplete JSON patterns
        if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return true;
        if (!trimmed.endsWith('}') && !trimmed.endsWith(']')) return true;
        
        // Count braces to detect incomplete nesting
        let braceCount = 0;
        let bracketCount = 0;
        let inString = false;
        let escape = false;
        
        for (let i = 0; i < trimmed.length; i++) {
            const char = trimmed[i];
            
            if (escape) {
                escape = false;
                continue;
            }
            
            if (char === '\\') {
                escape = true;
                continue;
            }
            
            if (char === '"') {
                inString = !inString;
                continue;
            }
            
            if (!inString) {
                if (char === '{') braceCount++;
                else if (char === '}') braceCount--;
                else if (char === '[') bracketCount++;
                else if (char === ']') bracketCount--;
            }
        }
        
        return braceCount !== 0 || bracketCount !== 0;
    };

    useEffect(() => {
        const renderCard = async () => {
            if (!cardsRef.current || !librariesLoaded) return;
            
            if (!cardJson.trim()) {
                setIsLoading(true);
                setError('');
                setRenderedCard(null);
                return;
            }

            // Check if JSON is still streaming
            if (isStreamingJson(cardJson)) {
                setIsLoading(true);
                setError('');
                setRenderedCard(null);
                return;
            }

            // Validate JSON
            if (!isValidCompleteJson(cardJson)) {
                setError('Invalid JSON format');
                setIsLoading(false);
                setRenderedCard(null);
                return;
            }

            try {
                setIsLoading(true);
                setError('');

                const card = new cardsRef.current.AdaptiveCard();
                const cardPayload = JSON.parse(cardJson);
                card.parse(cardPayload);

                // Handle Action.OpenUrl, Action.Execute, and Action.Submit events
                card.onExecuteAction = (action: any) => {
                    const actionType = action.getJsonTypeName();
                    
                    if (actionType === 'Action.OpenUrl') {
                        const url = action.url;
                        if (url) {
                            // Open URL in a new tab/window
                            window.open(url, '_blank', 'noopener,noreferrer');
                        }
                    } else if (actionType === 'Action.Execute' || actionType === 'Action.Submit') {
                        // Handle Execute and Submit actions by sending message via ChatContext
                        if (chatContext?.sendMessage) {
                            let messageContent = '';
                            
                            if (actionType === 'Action.Execute') {
                                // For Execute actions, use the verb as the message
                                const verb = action.verb || 'execute';
                                const data = action.data || {};
                                messageContent = `Execute action: ${verb}`;
                                if (Object.keys(data).length > 0) {
                                    messageContent += `\nData: ${JSON.stringify(data, null, 2)}`;
                                }
                            } else if (actionType === 'Action.Submit') {
                                // For Submit actions, format the submitted data
                                const data = action.data || {};
                                messageContent = 'Form submitted';
                                if (Object.keys(data).length > 0) {
                                    messageContent += `:\n${JSON.stringify(data, null, 2)}`;
                                }
                            }
                            
                            // Send the message
                            chatContext.sendMessage({
                                role: Role.User,
                                content: messageContent
                            }).catch(error => {
                                console.error('Failed to send action message:', error);
                            });
                        }
                    }
                };

                const renderedElement = card.render();
                
                if (renderedElement) {
                    // Apply custom styling to match the theme
                    renderedElement.style.backgroundColor = 'transparent';
                    renderedElement.style.border = 'none';
                    renderedElement.style.fontFamily = 'inherit';
                    
                    setRenderedCard(renderedElement);
                    setIsLoading(false);
                } else {
                    setError('Failed to render card');
                    setIsLoading(false);
                }
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
                setError(`Card rendering error: ${errorMessage}`);
                setIsLoading(false);
                setRenderedCard(null);
            }
        };

        // Debounce rendering to avoid excessive re-renders during streaming
        const timeoutId = setTimeout(renderCard, 300);
        
        return () => {
            clearTimeout(timeoutId);
        };
    }, [cardJson, librariesLoaded, chatContext]);

    // Mount the rendered card when it changes or when toggling views
    useEffect(() => {
        if (containerRef.current && renderedCard) {
            // Clear previous content
            containerRef.current.innerHTML = '';
            if (showPreview) {
                containerRef.current.appendChild(renderedCard);
            }
        }
    }, [renderedCard, showPreview]);

    // Show loading state while libraries are loading
    if (!librariesLoaded) {
        return (
            <div className="relative my-4">
                <div className="flex justify-between items-center bg-gray-100 dark:bg-neutral-700 pl-4 pr-2 py-1.5 rounded-t-md text-xs text-gray-700 dark:text-neutral-300">
                    <span>adaptivecard</span>
                </div>
                <div className="bg-white dark:bg-neutral-800 p-4 rounded-b-md border border-gray-200 dark:border-neutral-700">
                    <div className="flex items-center justify-center h-24 text-gray-500 dark:text-neutral-500">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                        <span className="ml-2">Loading card renderer...</span>
                    </div>
                </div>
            </div>
        );
    }

    // Show loading placeholder while streaming or processing
    if (isLoading && !cardJson.trim()) {
        return (
            <div className="relative my-4">
                <div className="flex justify-between items-center bg-gray-100 dark:bg-neutral-700 pl-4 pr-2 py-1.5 rounded-t-md text-xs text-gray-700 dark:text-neutral-300">
                    <span>adaptivecard</span>
                </div>
                <div className="bg-white dark:bg-neutral-800 p-4 rounded-b-md border border-gray-200 dark:border-neutral-700">
                    <div className="flex items-center justify-center h-24 text-gray-500 dark:text-neutral-500">
                        <div className="animate-pulse">Waiting for card data...</div>
                    </div>
                </div>
            </div>
        );
    }

    // Show error fallback with raw JSON
    if (error) {
        return (
            <div className="relative my-4">
                <div className="flex justify-between items-center bg-gray-100 dark:bg-neutral-700 pl-4 pr-2 py-1.5 rounded-t-md text-xs text-gray-700 dark:text-neutral-300">
                    <span>adaptivecard</span>
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-red-500 dark:text-red-400 opacity-70">{error}</span>
                        <CopyButton text={cardJson} />
                    </div>
                </div>
                <div className="bg-white dark:bg-neutral-800 p-4 rounded-b-md border border-gray-200 dark:border-neutral-700">
                    <pre className="text-gray-800 dark:text-neutral-300 text-sm whitespace-pre-wrap overflow-x-auto">
                        <code>{cardJson}</code>
                    </pre>
                </div>
            </div>
        );
    }

    // Show loading spinner while processing
    if (isLoading && cardJson.trim()) {
        return (
            <div className="relative my-4">
                <div className="flex justify-between items-center bg-gray-100 dark:bg-neutral-700 pl-4 pr-2 py-1.5 rounded-t-md text-xs text-gray-700 dark:text-neutral-300">
                    <span>adaptivecard</span>
                </div>
                <div className="bg-white dark:bg-neutral-800 p-4 rounded-b-md border border-gray-200 dark:border-neutral-700">
                    <div className="flex items-center justify-center h-24 text-gray-500 dark:text-neutral-500">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                        <span className="ml-2">Rendering card...</span>
                    </div>
                </div>
            </div>
        );
    }

    // Main render - always check if we have content to show
    return (
        <div className="relative my-4">
            <div className="flex justify-between items-center bg-gray-100 dark:bg-neutral-700 pl-4 pr-2 py-1.5 rounded-t-md text-xs text-gray-700 dark:text-neutral-300">
                <span>adaptivecard</span>
                <div className="flex items-center gap-2">
                    {hasValidJson && (
                        <Button
                            onClick={() => setShowPreview(!showPreview)}
                            className="text-neutral-300 hover:text-white transition-colors"
                            title={showPreview ? 'Show code' : 'Show preview'}
                        >
                            {showPreview ? (
                                <Code className="h-4" />
                            ) : (
                                <Eye className="h-4" />
                            )}
                        </Button>
                    )}
                    <CopyButton text={cardJson} />
                </div>
            </div>
            <div className="bg-white dark:bg-neutral-800 rounded-b-md p-4">
                <div 
                    ref={containerRef}
                    className={`adaptive-card-container [&_.ac-container]:!bg-transparent [&_.ac-container]:!border-none [&_*]:text-gray-900 [&_*]:dark:text-neutral-100 ${
                        hasValidJson && showPreview && renderedCard ? 'block' : 'hidden'
                    }`}
                />
                <pre className={`text-gray-800 dark:text-neutral-300 text-sm whitespace-pre-wrap overflow-x-auto ${
                    hasValidJson && showPreview && renderedCard ? 'hidden' : 'block'
                }`}>
                    <code>{cardJson}</code>
                </pre>
            </div>
        </div>
    );
};

export const CardRenderer = memo(
    NonMemoizedCardRenderer,
    (prevProps, nextProps) => prevProps.cardJson === nextProps.cardJson
);
