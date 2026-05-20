import React from 'react';

type Status = 'online' | 'offline' | 'warning' | 'error';
type Size = 'sm' | 'md' | 'lg';

interface NodeStatusIndicatorProps {
  status: Status;
  size?: Size;
}

const statusColorMap: Record<Status, string> = {
  online: 'bg-green-500',
  offline: 'bg-gray-400',
  warning: 'bg-yellow-500',
  error: 'bg-red-500',
};

const sizeMap: Record<Size, string> = {
  sm: 'w-2 h-2',
  md: 'w-3 h-3',
  lg: 'w-4 h-4',
};

const labelSizeMap: Record<Size, string> = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
};

export const NodeStatusIndicator: React.FC<NodeStatusIndicatorProps> = ({ status, size = 'md' }) => {
  return (
    <div className="inline-flex items-center gap-1.5">
      <div
        className={`rounded-full ${sizeMap[size]} ${statusColorMap[status]}`}
        title={status.charAt(0).toUpperCase() + status.slice(1)}
      />
      <span className={`${labelSizeMap[size]} capitalize`}>{status}</span>
    </div>
  );
};

export default NodeStatusIndicator;
