import { Skeleton } from "@/components/ui/skeleton";

export const CardSkeleton = () => (
  <div className="rounded-lg border bg-card p-6 space-y-4">
    <Skeleton className="h-4 w-1/3" />
    <Skeleton className="h-8 w-1/2" />
    <Skeleton className="h-4 w-full" />
  </div>
);

export const TableSkeleton = ({ rows = 5 }: { rows?: number }) => (
  <div className="space-y-3">
    {Array.from({ length: rows }).map((_, i) => (
      <Skeleton key={i} className="h-12 w-full rounded-md" />
    ))}
  </div>
);
