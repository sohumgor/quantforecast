interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = "h-4 w-full" }: SkeletonProps) {
  return (
    <div className={`relative overflow-hidden rounded-md bg-zinc-200 dark:bg-zinc-800 ${className}`}>
      <div className="absolute inset-0 -translate-x-full bg-[linear-gradient(110deg,transparent_35%,rgba(255,255,255,0.7),transparent_65%)] motion-safe:animate-[shimmer-sweep_1.8s_ease-in-out_infinite] dark:bg-[linear-gradient(110deg,transparent_35%,rgba(255,255,255,0.08),transparent_65%)]" />
    </div>
  );
}
