import { Slot } from '@radix-ui/react-slot';
import { cva } from 'class-variance-authority';
import type { VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-semibold transition-all disabled:pointer-events-none disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-600)] focus-visible:ring-offset-2',
  {
    variants: {
      variant: {
        default:
          'bg-[var(--accent-bg)] text-white shadow-sm hover:bg-[var(--accent-bg-2)] hover:-translate-y-px hover:scale-[1.02] active:scale-[0.99]',
        outline:
          'border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] shadow-sm hover:bg-[var(--accent-bg-soft)]',
        ghost:
          'text-[var(--text)] hover:bg-[var(--accent-bg-soft)]',
        destructive:
          'bg-[var(--danger)] text-white shadow-sm hover:opacity-90',
        secondary:
          'bg-[var(--surface)] text-[var(--text)] border border-[var(--border)] shadow-sm hover:bg-[var(--accent-bg-soft)]',
        link:
          'text-[var(--accent-600)] underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-8 rounded-md px-3 text-xs',
        lg: 'h-10 rounded-md px-8',
        icon: 'h-9 w-9 p-0',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = ({ className, variant, size, asChild = false, ...props }: ButtonProps) => {
  const Comp = asChild ? Slot : 'button';
  return (
    <Comp className={cn(buttonVariants({ variant, size, className }))} {...props} />
  );
};

export { Button, buttonVariants };
