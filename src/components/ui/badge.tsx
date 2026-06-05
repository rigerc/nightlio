import { cva } from 'class-variance-authority';
import type { VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-[var(--accent-chip-bg)] text-[var(--accent-700)] [html[data-theme=dark]_&]:text-white',
        secondary:
          'border-[var(--border)] bg-[var(--surface)] text-[var(--text)]',
        destructive:
          'border-transparent bg-[var(--danger)] text-white',
        outline:
          'border-[var(--border)] text-[var(--text)]',
      },
    },
    defaultVariants: { variant: 'default' },
  }
);

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

const Badge = ({ className, variant, ...props }: BadgeProps) => (
  <span className={cn(badgeVariants({ variant }), className)} {...props} />
);

export { Badge, badgeVariants };
