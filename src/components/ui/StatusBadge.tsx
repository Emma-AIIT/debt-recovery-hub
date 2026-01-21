import { type FC } from 'react';

type Status = 'current' | 'warning' | 'critical' | 'suspended';

interface StatusBadgeProps {
  status: Status;
  size?: 'sm' | 'md';
}

const statusConfig = {
  current: {
    label: 'Current',
    dotColor: 'bg-emerald-400',
    className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  },
  warning: {
    label: 'Warning',
    dotColor: 'bg-amber-400',
    className: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  },
  critical: {
    label: 'Critical',
    dotColor: 'bg-rose-400',
    className: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  },
  suspended: {
    label: 'Suspended',
    dotColor: 'bg-gray-400',
    className: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
  },
};

export const StatusBadge: FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const config = statusConfig[status];

  const sizeClasses = size === 'sm'
    ? 'px-2 py-0.5 text-[10px]'
    : 'px-2.5 py-1 text-xs';

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-lg font-medium border ${sizeClasses} ${config.className}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dotColor}`} />
      {config.label}
    </span>
  );
};
