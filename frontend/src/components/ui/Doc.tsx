import type { ReactNode } from "react";

export function Doc({ children }: { children: ReactNode }) {
  return (
    <div className="doc">
      {children}
      <span className="tick-1" />
      <span className="tick-2" />
    </div>
  );
}
