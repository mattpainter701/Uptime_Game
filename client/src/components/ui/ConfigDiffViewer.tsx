import React, { useMemo } from 'react';
import { computeDiff, DiffLine } from '../../utils/diff';

interface ConfigDiffViewerProps {
  leftLabel: string;
  rightLabel: string;
  leftContent: string;
  rightContent: string;
}

const ConfigDiffViewer: React.FC<ConfigDiffViewerProps> = ({
  leftLabel,
  rightLabel,
  leftContent,
  rightContent,
}) => {
  const diff = useMemo<DiffLine[]>(() => computeDiff(leftContent, rightContent), [leftContent, rightContent]);

  return (
    <div className="flex flex-col gap-2 w-full">
      <div className="flex justify-between text-sm font-semibold text-gray-300 mb-1">
        <span>{leftLabel}</span>
        <span>{rightLabel}</span>
      </div>
      <div className="overflow-auto border border-gray-700 rounded-lg">
        <div className="min-w-full">
          {diff.map((entry, idx) => {
            let bgClass = '';
            let prefix = '';
            if (entry.type === 'added') {
              bgClass = 'bg-green-900/30 border-l-4 border-green-500';
              prefix = '+ ';
            } else if (entry.type === 'removed') {
              bgClass = 'bg-red-900/30 border-l-4 border-red-500';
              prefix = '- ';
            } else {
              bgClass = 'bg-transparent border-l-4 border-transparent';
              prefix = '  ';
            }
            return (
              <div
                key={idx}
                className={`flex font-mono text-xs px-3 py-0.5 whitespace-pre-wrap ${bgClass}`}
              >
                <span className={`w-5 shrink-0 select-none ${entry.type === 'added' ? 'text-green-300' : entry.type === 'removed' ? 'text-red-300' : 'text-gray-500'}`}>
                  {prefix}
                </span>
                <span className={`${entry.type === 'added' ? 'text-green-200' : entry.type === 'removed' ? 'text-red-200' : 'text-gray-300'}`}>
                  {entry.line}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ConfigDiffViewer;
