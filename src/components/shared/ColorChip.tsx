import { cn } from "@/lib/utils";

/**
 * A pill with a colour dot and its label. The label is always shown, so meaning never depends on colour alone.
 * The colour comes from config or the database (activity types, statuses, stages, themes).
 */
export function ColorChip({
  color,
  label,
  className,
  size = "sm",
}: {
  color: string;
  label: string;
  className?: string;
  size?: "sm" | "md";
}) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1.5 rounded-full border font-semibold text-foreground",
        size === "sm" ? "px-2.5 py-0.5 text-xs" : "px-3 py-1 text-sm",
        className,
      )}
      style={{
        backgroundColor: `color-mix(in srgb, ${color} 14%, transparent)`,
        borderColor: `color-mix(in srgb, ${color} 45%, transparent)`,
      }}
    >
      <span aria-hidden className="size-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
      <span className="truncate">{label}</span>
    </span>
  );
}
