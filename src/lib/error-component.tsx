import type { ErrorComponentProps } from "@tanstack/react-router";
import { TriangleAlert } from "lucide-react";

import { publicErrorMessage } from "@/lib/public-error";

export function AppErrorComponent({ error }: ErrorComponentProps) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 bg-bg px-6 text-center text-fg">
      <span aria-hidden="true" className="text-danger">
        <TriangleAlert className="size-10" strokeWidth={2} />
      </span>
      <h1 className="font-display text-xl font-medium">Algo ha fallado</h1>
      <p className="max-w-md text-sm wrap-break-word text-muted-foreground">
        {publicErrorMessage(error.message)}
      </p>
    </main>
  );
}
