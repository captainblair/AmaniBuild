type SpinnerProps = {
  label?: string;
};

export function Spinner({ label = "Loading" }: SpinnerProps) {
  return (
    <div className="flex items-center gap-3 text-sm text-[var(--gray-500)]" role="status">
      <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-[var(--orange)] border-t-transparent" />
      <span>{label}</span>
    </div>
  );
}
