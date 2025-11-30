import React, { useState, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeHighlight from 'rehype-highlight';
import rehypeKatex from 'rehype-katex';
import { Check, Copy } from 'lucide-react';

interface PreviewProps {
  content: string;
}

const PreBlock = ({ children, node, ...props }: any) => {
  const preRef = useRef<HTMLPreElement>(null);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (preRef.current) {
      const text = preRef.current.textContent;
      if (text) {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch (err) {
          console.error("Failed to copy:", err);
        }
      }
    }
  };

  return (
    <div className="relative group my-6">
      <pre 
        ref={preRef} 
        {...props} 
        className="!my-0"
      >
        {children}
      </pre>
      <button
        onClick={handleCopy}
        className="absolute top-3 right-3 p-1.5 rounded-md bg-paper-100 dark:bg-cyber-800 text-slate-500 hover:text-cyan-600 dark:hover:text-cyan-400 border border-paper-200 dark:border-cyber-600 opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-sm z-10"
        title="Copy code"
      >
        {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
      </button>
    </div>
  );
};

export const Preview: React.FC<PreviewProps> = ({ content }) => {
  return (
    <div className="h-full w-full overflow-y-auto p-8 bg-paper-50 dark:bg-cyber-900 custom-scrollbar transition-colors duration-300">
      {/* 
        The 'prose' class now triggers the Tailwind Typography plugin.
        'prose-lg' increases font size.
        Colors are handled via CSS variables configured in index.html, 
        so we don't need 'dark:prose-invert' anymore.
      */}
      <div className="prose prose-lg max-w-none">
        <ReactMarkdown 
          remarkPlugins={[remarkGfm, remarkMath]} 
          rehypePlugins={[rehypeHighlight, rehypeKatex]}
          components={{
            pre: PreBlock
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
    </div>
  );
};