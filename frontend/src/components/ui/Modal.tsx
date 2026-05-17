import type { ReactNode } from "react";
import { Icon } from "./Icon";

export type ModalProps = {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  manifest?: boolean;
};

export function Modal({ open, onClose, title, children, footer, manifest }: ModalProps) {
  if (!open) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className={"modal" + (manifest ? " manifest" : "")}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <h3>{title}</h3>
          <button className="btn btn--ghost btn--icon" onClick={onClose} aria-label="بستن">
            <Icon.x />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}
