import * as ProgressPrimitive from '@radix-ui/react-progress';
import { cn } from '../../lib/utils';

interface ProgressProps extends React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> {
  max?: number;
}

const Progress = ({ className, value, max = 100, ...props }: ProgressProps) => {
  const pct = Math.min(100, Math.max(0, ((value ?? 0) / (max || 1)) * 100));
  return (
    <ProgressPrimitive.Root
      className={cn('relative h-2 w-full overflow-hidden rounded-full bg-[var(--border)]', className)}
      {...props}
    >
      <ProgressPrimitive.Indicator
        className="h-full w-full flex-1 bg-[var(--accent-600)] transition-all"
        style={{ transform: `translateX(-${100 - pct}%)` }}
      />
    </ProgressPrimitive.Root>
  );
};

export { Progress };
