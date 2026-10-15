import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
const variants = cva('button inline-flex items-center justify-center gap-2 shrink-0 transition-colors', { variants:{ variant:{default:'button-primary',secondary:'button-secondary',ghost:'button-ghost'},size:{default:'button-default',icon:'button-icon',small:'button-small'} },defaultVariants:{variant:'ghost',size:'default'} });
interface Props extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof variants> { asChild?: boolean }
export const Button = forwardRef<HTMLButtonElement,Props>(({className,variant,size,asChild,...props},ref) => {
  const Component=asChild?Slot:'button';
  return <Component ref={ref} className={twMerge(clsx(variants({variant,size}),className))} {...props}/>;
});
Button.displayName='Button';
