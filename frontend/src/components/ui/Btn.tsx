import type { ReactNode, MouseEvent } from "react";

export type BtnVariant = "primary" | "secondary" | "ghost" | "danger" | "manifest";
export type BtnSize = "sm" | "icon";

export type BtnProps = {
  variant?: BtnVariant;
  size?: BtnSize;
  icon?: ReactNode;
  children?: ReactNode;
  onClick?: (e: MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
  title?: string;
};

export function Btn({
  variant = "ghost",
  size,
  icon,
  children,
  onClick,
  disabled,
  type = "button",
  title,
}: BtnProps) {
  const cls = ["btn", `btn--${variant}`, size ? `btn--${size}` : ""].filter(Boolean).join(" ");
  return (
    <button className={cls} onClick={onClick} disabled={disabled} type={type} title={title}>
      {icon}
      {children}
    </button>
  );
}
