import { cn } from '../../lib/utils';

const Skeleton = ({ className, height, width, radius, style, ...props }) => (
  <div
    className={cn('animate-pulse bg-[var(--skeleton-a)]', className)}
    style={{
      height: height != null ? height : undefined,
      width: width != null ? width : undefined,
      borderRadius: radius != null ? radius : undefined,
      ...style,
    }}
    {...props}
  />
);

export { Skeleton };
