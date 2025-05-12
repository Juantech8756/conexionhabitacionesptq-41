
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        checkbox: "rounded border border-gray-300 text-hotel-600 focus:ring-hotel-500 transition-colors data-[state=checked]:bg-hotel-600 data-[state=checked]:border-hotel-600 hover:border-hotel-500",
        checkboxModern: "rounded-md border border-gray-200 bg-white shadow-md text-white focus:ring-hotel-400 transition-all hover:shadow-lg data-[state=checked]:bg-hotel-600 data-[state=checked]:border-hotel-600 data-[state=checked]:shadow-inner hover:border-hotel-400 hover:bg-hotel-50/50 hover:scale-105",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
        checkbox: "h-4 w-4 min-h-4 min-w-4 p-0",
        checkboxXs: "h-3.5 w-3.5 min-h-3.5 min-w-3.5 p-0", // Slightly increased size for better visibility
        checkboxTiny: "h-3 w-3 min-h-3 min-w-3 p-0", // Increased size from 2.5 to 3 for better visibility
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
