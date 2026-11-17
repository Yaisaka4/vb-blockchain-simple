import * as React from 'react';
import { cn } from '@/lib/utils';

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<'input'>>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-11 w-full rounded-xl border border-zinc-200/90 bg-white px-4 py-2.5 text-[15px] text-zinc-900 shadow-apple-sm transition-all duration-150 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-zinc-900 placeholder:text-zinc-400 focus-visible:outline-none focus-visible:border-zinc-900 focus-visible:ring-3 focus-visible:ring-zinc-900/10 disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';

export { Input };
