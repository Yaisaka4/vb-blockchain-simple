import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.985] [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 cursor-pointer',
  {
    variants: {
      variant: {
        default:
          'bg-zinc-900 text-white shadow-apple-sm hover:bg-zinc-800',
        appleBlue:
          'bg-zinc-900 text-white shadow-apple-sm hover:bg-zinc-800',
        destructive:
          'bg-red-600 text-white shadow-apple-sm hover:bg-red-700',
        outline:
          'border border-zinc-200/90 bg-white text-zinc-900 shadow-apple-sm hover:bg-zinc-50 hover:border-zinc-300',
        secondary:
          'bg-zinc-100 text-zinc-900 hover:bg-zinc-200/80',
        ghost:
          'text-zinc-700 hover:bg-zinc-100/90 hover:text-zinc-900',
        link:
          'text-[#0071E3] underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2 text-sm',
        sm: 'h-9 rounded-xl px-3.5 text-[13px]',
        lg: 'h-11 rounded-xl px-6 text-[15px]',
        icon: 'h-10 w-10 rounded-xl',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
