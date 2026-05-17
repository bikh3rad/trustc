import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function S({ size = 18, children, ...rest }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  );
}

export const Icon = {
  dashboard: (p: IconProps = {}) => (
    <S {...p}>
      <rect x="3" y="3" width="7" height="9" />
      <rect x="14" y="3" width="7" height="5" />
      <rect x="14" y="12" width="7" height="9" />
      <rect x="3" y="16" width="7" height="5" />
    </S>
  ),
  package: (p: IconProps = {}) => (
    <S {...p}>
      <path d="M16.5 9.4 7.55 4.24" />
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
      <path d="m3.3 7 8.7 5 8.7-5" />
      <path d="M12 22V12" />
    </S>
  ),
  invoice: (p: IconProps = {}) => (
    <S {...p}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <line x1="10" y1="9" x2="8" y2="9" />
    </S>
  ),
  escrow: (p: IconProps = {}) => (
    <S {...p}>
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </S>
  ),
  ledger: (p: IconProps = {}) => (
    <S {...p}>
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </S>
  ),
  portfolio: (p: IconProps = {}) => (
    <S {...p}>
      <path d="M3 22h18" />
      <path d="M5 22V8l7-5 7 5v14" />
      <path d="M9 22V12h6v10" />
    </S>
  ),
  audit: (p: IconProps = {}) => (
    <S {...p}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <circle cx="11.5" cy="14.5" r="2.5" />
      <line x1="13.5" y1="16.5" x2="15" y2="18" />
    </S>
  ),
  reports: (p: IconProps = {}) => (
    <S {...p}>
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
      <line x1="3" y1="20" x2="21" y2="20" />
    </S>
  ),
  freeze: (p: IconProps = {}) => (
    <S {...p}>
      <path d="M12 2v20" />
      <path d="M2 12h20" />
      <path d="M5 5l14 14" />
      <path d="M19 5L5 19" />
    </S>
  ),
  recycle: (p: IconProps = {}) => (
    <S {...p}>
      <path d="M7 19H4a2 2 0 0 1-1.7-3l4-6" />
      <path d="M17 5h3a2 2 0 0 1 1.7 3l-4 6" />
      <path d="M14 17.5 12 21l-3-3.5" />
      <path d="M21 11 19 7l-4 1" />
      <path d="M3 13l2 4 4-1" />
    </S>
  ),
  arrow: (p: IconProps = {}) => (
    <S size={16} {...p}>
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </S>
  ),
  check: (p: IconProps = {}) => (
    <S size={16} {...p}>
      <polyline points="20 6 9 17 4 12" />
    </S>
  ),
  x: (p: IconProps = {}) => (
    <S size={16} {...p}>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </S>
  ),
  plus: (p: IconProps = {}) => (
    <S size={16} {...p}>
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </S>
  ),
  download: (p: IconProps = {}) => (
    <S size={16} {...p}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </S>
  ),
  stamp: (p: IconProps = {}) => (
    <S size={16} {...p}>
      <path d="M5 22h14" />
      <path d="M19 14H5a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-2a2 2 0 0 0-2-2Z" />
      <path d="M15 14V8a3 3 0 0 0-6 0v6" />
    </S>
  ),
  alert: (p: IconProps = {}) => (
    <S size={16} {...p}>
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <circle cx="12" cy="17" r="0.5" />
    </S>
  ),
  hash: (p: IconProps = {}) => (
    <S size={14} {...p}>
      <line x1="4" y1="9" x2="20" y2="9" />
      <line x1="4" y1="15" x2="20" y2="15" />
      <line x1="10" y1="3" x2="8" y2="21" />
      <line x1="16" y1="3" x2="14" y2="21" />
    </S>
  ),
};

export type IconName = keyof typeof Icon;
