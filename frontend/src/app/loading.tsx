import { Spinner } from "@/components/ui/Spinner";

export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--gray-100)]">
      <Spinner label="Loading AmaniBuild..." />
    </div>
  );
}
