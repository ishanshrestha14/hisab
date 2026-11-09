import { forwardRef } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// One primary action per view. Primary is amber with dark text (amber with
// white text fails contrast). Secondary is a raised surface with a hairline.
export const buttonVariants = cva(
  "inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium transition-[background-color,border-color,color,transform] active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-foreground hover:bg-brand-400",
        secondary:
          "border border-input bg-card text-foreground hover:bg-muted",
        ghost: "text-muted-foreground hover:bg-muted hover:text-foreground",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        "destructive-ghost":
          "text-muted-foreground hover:bg-destructive/10 hover:text-destructive",
      },
      size: {
        sm: "h-8 px-3 text-[13px]",
        md: "h-9 px-4 text-sm",
        lg: "h-10 px-5 text-sm",
        icon: "h-8 w-8",
      },
    },
    defaultVariants: { variant: "secondary", size: "md" },
  }
);

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent",
        className
      )}
    />
  );
}

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & { loading?: boolean };

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant, size, loading, disabled, children, type = "button", ...props },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    >
      {loading && <Spinner />}
      {children}
    </button>
  );
});
