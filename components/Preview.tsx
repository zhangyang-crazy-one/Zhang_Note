import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeHighlight from 'rehype-highlight';
import rehypeKatex from 'rehype-katex';

interface PreviewProps {
  content: string;
}

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
        >
          {content}
        </ReactMarkdown>
      </div>
    </div>
  );
};