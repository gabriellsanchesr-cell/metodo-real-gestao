import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

/**
 * Esqueletos de carregamento.
 *
 * Substituem o texto "Carregando..." centralizado. A diferença não é
 * estética: o esqueleto já ocupa o espaço que o conteúdo vai ocupar, então
 * a tela não salta quando os dados chegam.
 */

export function StatsSkeleton({ cards = 4 }: { cards?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: cards }).map((_, i) => (
        <Card key={i} className="border-border/60 shadow-sm">
          <CardContent className="flex items-start gap-4 p-5">
            <Skeleton className="h-10 w-10 shrink-0 rounded-xl" />
            <div className="w-full space-y-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-6 w-12" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 6, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <Card className="border-border/60 shadow-sm">
      <CardContent className="p-0">
        <div className="border-b border-border/60 px-4 py-3">
          <Skeleton className="h-4 w-32" />
        </div>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 border-b border-border/40 px-4 py-4 last:border-0">
            <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
            {Array.from({ length: cols - 1 }).map((__, j) => (
              <Skeleton key={j} className="h-4 flex-1" style={{ maxWidth: j === 0 ? 180 : 100 }} />
            ))}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function CardsSkeleton({ cards = 6 }: { cards?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: cards }).map((_, i) => (
        <Card key={i} className="border-border/60 shadow-sm">
          <CardContent className="space-y-3 p-5">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-3 w-24" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center justify-between rounded-lg px-3 py-2.5">
          <div className="space-y-2">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-3 w-20" />
          </div>
          <Skeleton className="h-6 w-16 rounded-md" />
        </div>
      ))}
    </div>
  );
}

/** Tela inteira, para as rotas que ainda estão autenticando. */
export function FullPageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-primary/25 border-t-primary" />
        <p className="text-sm text-muted-foreground">Carregando</p>
      </div>
    </div>
  );
}
