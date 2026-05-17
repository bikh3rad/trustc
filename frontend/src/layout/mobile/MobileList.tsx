// MobileList — generic <ul>-like container for a stream of MobileCards.
// Renders the empty state inline so screens don't have to branch.
import type { ReactNode } from "react";

type Props<T> = {
  items: T[];
  renderItem: (item: T, index: number) => ReactNode;
  emptyTitle?: string;
  emptyHint?: ReactNode;
};

export function MobileList<T>({
  items,
  renderItem,
  emptyTitle,
  emptyHint,
}: Props<T>) {
  if (!items || items.length === 0) {
    return (
      <div className="empty">
        <h3>{emptyTitle || "موردی یافت نشد"}</h3>
        {emptyHint && <div>{emptyHint}</div>}
      </div>
    );
  }
  return <div className="mobile-list">{items.map((it, i) => renderItem(it, i))}</div>;
}
