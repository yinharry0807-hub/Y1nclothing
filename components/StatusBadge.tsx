import { cn } from "@/lib/utils";

export function StatusBadge({
  label,
  className,
}: {
  label: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
        className ?? "bg-slate-100 text-slate-600 ring-slate-500/20",
      )}
    >
      {label}
    </span>
  );
}
