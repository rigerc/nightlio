import { cn } from '../../lib/utils';
import type React from 'react';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  height?: number | string;
  width?: number | string;
  radius?: number | string;
}

const Skeleton = ({ className, height = 16, width = '100%', radius = 8, style, ...props }: SkeletonProps) => (
  <div
    className={cn('animate-pulse bg-[var(--skeleton-a)]', className)}
    style={{
      height: typeof height === 'number' ? `${height}px` : height,
      width: typeof width === 'number' ? `${width}px` : width,
      borderRadius: typeof radius === 'number' ? `${radius}px` : radius,
      ...style,
    }}
    {...props}
  />
);

export default Skeleton;
