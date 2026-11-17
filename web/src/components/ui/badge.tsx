import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium leading-5 transition-colors focus:outline-none [&_svg]:size-3.5 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-zinc-900 text-white',
        secondary: 'border-zinc-200/80 bg-zinc-100/90 text-zinc-700',
        outline: 'border-zinc-200/90 text-zinc-700 bg-white',
        success: 'border-emerald-200/90 bg-emerald-50/90 text-emerald-700',
        warning: 'border-amber-200/90 bg-amber-50/90 text-amber-700',
        destructive: 'border-red-200/90 bg-red-50/90 text-red-700',
        info: 'border-sky-200/90 bg-sky-50/90 text-[#0071E3]',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
