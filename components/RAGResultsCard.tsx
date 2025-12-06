import React from 'react';
import { FileText, Search } from 'lucide-react';

interface RAGResult {
  fileName: string;
  count: number;
  maxScore: number;
}

interface RAGResultsCardProps {
  totalChunks: number;
  queryTime: number;
  results: RAGResult[];
}

export const RAGResultsCard: React.FC<RAGResultsCardProps> = ({ totalChunks, queryTime, results }) => {
  return (
    <div className="rag-results-card glass-panel rounded-xl p-4 my-3 border border-slate-700/50 dark:border-cyan-500/30">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-500">
          <Search size={18} />
        </div>
        <div className="flex-1">
          <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            Knowledge Base Search
          </h4>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Found <span className="font-semibold text-cyan-500">{totalChunks}</span> relevant chunks in{' '}
            <span className="font-semibold">{queryTime}ms</span>
          </p>
        </div>
      </div>

      {/* Results List */}
      <div className="space-y-2">
        {results.map((result, index) => (
          <div
            key={index}
            className="rag-result-item flex items-center gap-3 p-2.5 rounded-lg bg-slate-100/50 dark:bg-slate-800/30 hover:bg-slate-200/70 dark:hover:bg-slate-700/40 transition-colors border border-transparent hover:border-slate-300 dark:hover:border-slate-600"
          >
            {/* File Icon */}
            <div className="flex-shrink-0 p-1.5 rounded bg-violet-500/10 text-violet-500">
              <FileText size={14} />
            </div>

            {/* File Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                  {result.fileName}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 flex-shrink-0">
                  ×{result.count}
                </span>
              </div>

              {/* Progress Bar */}
              <div className="relative h-1.5 bg-slate-200 dark:bg-slate-700/50 rounded-full overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-cyan-500 to-violet-500 transition-all duration-300"
                  style={{ width: `${result.maxScore * 100}%` }}
                />
              </div>
            </div>

            {/* Score Badge */}
            <div className="flex-shrink-0 px-2 py-1 rounded-md bg-cyan-500/10 border border-cyan-500/20">
              <span className="text-xs font-semibold text-cyan-600 dark:text-cyan-400">
                {(result.maxScore * 100).toFixed(0)}%
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Footer Note */}
      {results.length > 5 && (
        <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700/50">
          <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
            Showing top 5 sources
          </p>
        </div>
      )}
    </div>
  );
};
