import * as React from 'react';
import { cn } from '@/lib/utils';

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<'textarea'>
>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        'flex min-h-[96px] w-full rounded-xl border border-zinc-200/90 bg-white px-4 py-3 text-[15px] leading-relaxed text-zinc-900 shadow-apple-sm transition-all duration-150 placeholder:text-zinc-400 focus-visible:outline-none focus-visible:border-zinc-900 focus-visible:ring-3 focus-visible:ring-zinc-900/10 disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      ref={ref}
      {...props}
    />
  );
});
Textarea.displayName = 'Textarea';

export { Textarea };
