import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const alertVariants = cva(
  'relative grid w-full grid-cols-[0_1fr] items-start gap-y-1 rounded-2xl border px-4 py-3.5 text-sm shadow-apple-hover backdrop-blur-xl transition-all has-[>svg]:grid-cols-[16px_1fr] has-[>svg]:gap-x-3 [&>svg]:size-4 [&>svg]:translate-y-0.5 [&>svg]:shrink-0',
  {
    variants: {
      variant: {
        default:
          'border-zinc-200/90 bg-white/95 text-zinc-900 [&>svg]:text-zinc-900',
        destructive:
          'border-red-200/95 bg-white/95 text-red-600 [&>svg]:text-red-600 [&_[data-slot=alert-description]]:text-red-600/90',
        success:
          'border-emerald-200/90 bg-white/95 text-zinc-900 [&>svg]:text-emerald-600',
        warning:
          'border-amber-200/95 bg-white/95 text-zinc-900 [&>svg]:text-amber-600',
        info:
          'border-sky-200/90 bg-white/95 text-zinc-900 [&>svg]:text-[#0071E3]',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

const Alert = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<'div'> & VariantProps<typeof alertVariants>
>(({ className, variant, ...props }, ref) => (
  <div
    ref={ref}
    data-slot="alert"
    role="alert"
    className={cn(alertVariants({ variant }), className)}
    {...props}
  />
));
Alert.displayName = 'Alert';

const AlertTitle = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<'div'>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-slot="alert-title"
    className={cn(
      'col-start-2 line-clamp-2 min-h-4 pr-6 font-semibold leading-snug tracking-tight',
      className
    )}
    {...props}
  />
));
AlertTitle.displayName = 'AlertTitle';

const AlertDescription = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<'div'>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-slot="alert-description"
    className={cn(
      'col-start-2 grid justify-items-start gap-1 pr-4 text-[13px] leading-relaxed text-zinc-600 [&_p]:leading-relaxed',
      className
    )}
    {...props}
  />
));
AlertDescription.displayName = 'AlertDescription';

const AlertAction = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<'div'>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-slot="alert-action"
    className={cn('absolute right-2.5 top-2.5 flex items-center', className)}
    {...props}
  />
));
AlertAction.displayName = 'AlertAction';

export { Alert, AlertTitle, AlertDescription, AlertAction };
