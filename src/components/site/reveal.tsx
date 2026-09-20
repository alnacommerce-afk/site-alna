import type { CSSProperties, ReactNode } from "react";

// Wraps one block so it fades in when it appears. `index` staggers siblings (capped, so a long list
// never makes the last item wait seconds); pass the item's position in the list.
export function Reveal({
  children,
  index = 0,
  step = 70,
  className = "",
}: {
  children: ReactNode;
  index?: number;
  step?: number;
  className?: string;
}) {
  const style = { "--reveal-delay": `${Math.min(index, 10) * step}ms` } as CSSProperties;
  return (
    <div className={`reveal ${className}`} style={style}>
      {children}
    </div>
  );
}
