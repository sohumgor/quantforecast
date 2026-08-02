interface SpinnerProps {
  className?: string;
}

export function Spinner({ className = "h-5 w-5" }: SpinnerProps) {
  return (
    <svg
      className={`animate-spin text-zinc-400 dark:text-zinc-600 ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v3a5 5 0 00-5 5H4z"
      />
    </svg>
  );
}

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-6 py-10 text-center motion-safe:animate-[fade-in-up_300ms_ease-out] dark:border-red-900/50 dark:bg-red-950/20">
      <p className="text-sm font-medium text-red-700 dark:text-red-400">{message}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="rounded-full bg-red-600 px-4 py-1.5 text-sm font-medium text-white transition-all duration-150 hover:scale-[1.03] hover:bg-red-700 active:scale-[0.97]"
        >
          Try again
        </button>
      ) : null}
    </div>
  );
}
