import { memo } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import { MermaidRenderer } from './MermaidRenderer';
import { CardRenderer } from './CardRenderer';
import { CodeRenderer } from './CodeRenderer';
import { HtmlRenderer } from './HtmlRenderer';
import { MediaPlayer } from './MediaPlayer';
import { isAudioUrl, isVideoUrl } from '../lib/utils';

const components: Partial<Components> = {
    pre: ({ children }) => {
        return <>
            {children}
        </>;
    },
    ol: ({ children, ...props }) => {
        return (
            <ol className="list-decimal list-inside ml-2" {...props}>
                {children}
            </ol>
        );
    },
    li: ({ children, ...props }) => {
        return (
            <li className="py-1" {...props}>
                {children}
            </li>
        );
    },
    ul: ({ children, ...props }) => {
        return (
            <ul className="list-disc list-inside ml-2" {...props}>
                {children}
            </ul>
        );
    },
    strong: ({ children, ...props }) => {
        return (
            <span className="font-semibold" {...props}>
                {children}
            </span>
        );
    },
    a: ({ children, href, ...props }) => {
        let url = href || '';

        if (url && !url.startsWith('http') && !url.startsWith('#')) {
            url = `https://${url}`;
        }

        // Check if this is an audio link
        if (isAudioUrl(url)) {
            return <MediaPlayer url={url} type="audio">{children}</MediaPlayer>;
        }

        // Check if this is a video link
        if (isVideoUrl(url)) {
            return <MediaPlayer url={url} type="video">{children}</MediaPlayer>;
        }
        
        return (
            <a
                className="text-blue-500 hover:underline"
                href={url}
                target="_blank"
                rel="noreferrer noopener"
                {...props}
            >
                {children}
            </a>
        );
    },
    h1: ({ children, ...props }) => {
        return (
            <h1 className="text-3xl font-semibold mt-6 mb-2" {...props}>
                {children}
            </h1>
        );
    },
    h2: ({ children, ...props }) => {
        return (
            <h2 className="text-2xl font-semibold mt-6 mb-2" {...props}>
                {children}
            </h2>
        );
    },
    h3: ({ children, ...props }) => {
        return (
            <h3 className="text-xl font-semibold mt-6 mb-2" {...props}>
                {children}
            </h3>
        );
    },
    h4: ({ children, ...props }) => {
        return (
            <h4 className="text-lg font-semibold mt-6 mb-2" {...props}>
                {children}
            </h4>
        );
    },
    h5: ({ children, ...props }) => {
        return (
            <h5 className="text-base font-semibold mt-6 mb-2" {...props}>
                {children}
            </h5>
        );
    },
    h6: ({ children, ...props }) => {
        return (
            <h6 className="text-sm font-semibold mt-6 mb-2" {...props}>
                {children}
            </h6>
        );
    },
    table: ({ children, ...props }) => {
        return (
            <div className="overflow-x-auto my-4">
                <table className="w-full border-collapse border border-neutral-300 dark:border-neutral-700" {...props}>
                    {children}
                </table>
            </div>
        );
    },
    thead: ({ children, ...props }) => {
        return (
            <thead className="bg-neutral-200 dark:bg-neutral-800" {...props}>
                {children}
            </thead>
        );
    },
    tbody: ({ children, ...props }) => {
        return <tbody {...props}>{children}</tbody>;
    },
    tr: ({ children, ...props }) => {
        return <tr className="border-b border-neutral-300 dark:border-neutral-700" {...props}>{children}</tr>;
    },
    th: ({ children, ...props }) => {
        return <th className="p-2 text-left font-semibold border-r last:border-r-0 border-neutral-300 dark:border-neutral-700" {...props}>{children}</th>;
    },
    td: ({ children, ...props }) => {
        return <td className="p-2 border-r last:border-r-0 border-neutral-300 dark:border-neutral-700" {...props}>{children}</td>;
    },
    blockquote: ({ children, ...props }) => {
        return (
            <blockquote className="border-l-4 border-neutral-400 dark:border-neutral-600 pl-4 py-1 my-2 italic" {...props}>
                {children}
            </blockquote>
        );
    },
    hr: ({ ...props }) => {
        return <hr className="my-4 border-neutral-300 dark:border-neutral-700" {...props} />;
    },
    img: ({ src, alt, ...props }) => {
        return (
            <img 
                src={src} 
                alt={alt || 'Image'} 
                className="max-h-60 my-2 rounded-md" 
                loading="lazy"
                {...props} 
            />
        );
    },
    code({ children, className, ...rest }) {
        const match = /language-(\w+)/.exec(className || "");
        
        if (!match) {
            return (
                <code
                    {...rest}
                    className={`${className || ''} bg-neutral-200 dark:bg-neutral-800 px-1.5 py-0.5 rounded text-sm font-mono`}
                    children={children}
                />
            );
        }

        const language = match[1].toLowerCase();
        
        const text = String(children).replace(/\n$/, "");

        if (language === "markdown" || language === "md") {
            return <Markdown>{text}</Markdown>;
        }

        if (language === "mermaid" || language === "mmd") {
            return <MermaidRenderer chart={text} language={language} />;
        }

        if (language === "html" || language === "htm") {
            return <HtmlRenderer html={text} language={language} />;
        }

        if (language === "adaptivecard" || language === "adaptive-card") {
            return <CardRenderer cardJson={text} />;
        }

        // Auto-detect Adaptive Cards in JSON blocks
        if (language === "json") {
            try {
                const parsed = JSON.parse(text);
                if (parsed.type === "AdaptiveCard" && parsed.version) {
                    return <CardRenderer cardJson={text} />;
                }
            } catch {
                // If parsing fails, fall through to regular JSON syntax highlighting
            }
        }

        // Use CodeRenderer for all other code blocks
        return <CodeRenderer code={text} language={language} />;
    },
};

const remarkPlugins = [remarkGfm];
const rehypePlugins = [rehypeRaw, rehypeSanitize];

const NonMemoizedMarkdown = ({ children }: { children: string }) => {
    if (!children) return null;
    
    try {
        return (
            <ReactMarkdown 
                remarkPlugins={remarkPlugins} 
                components={components}
                rehypePlugins={rehypePlugins}
                remarkRehypeOptions={{ allowDangerousHtml: true }}
            >
                {children}
            </ReactMarkdown>
        );
    } catch (error) {
        console.error("Markdown rendering error:", error);
        return <pre className="whitespace-pre-wrap">{children}</pre>;
    }
};

export const Markdown = memo(
    NonMemoizedMarkdown,
    (prevProps, nextProps) => prevProps.children === nextProps.children,
);