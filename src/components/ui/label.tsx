import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

function Label({ className, ...props }: ComponentProps<"label">) {
  return (
    // Callers pass htmlFor or wrap a control; this is the shared primitive.
    // oxlint-disable-next-line jsx-a11y/label-has-associated-control -- association comes from props
    <label
      className={cn(
        "flex items-center gap-2 text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
        className
      )}
      data-slot="label"
      {...props}
    />
  );
}

export { Label };
