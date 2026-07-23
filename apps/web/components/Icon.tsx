// Minimal stroke-icon set matching the source doc's "21x21 iOS SVG stroke
// icons" convention (see DESIGN.md §5 Navigation). Kept as one component +
// a name union rather than 20 separate files — easier to keep visually
// consistent (same stroke width/cap/join across the whole set).
export type IconName =
  | "home"
  | "calendar"
  | "bookmark"
  | "list"
  | "user"
  | "camera"
  | "chevronLeft"
  | "x"
  | "check"
  | "thumbsUp"
  | "thumbsDown"
  | "clock"
  | "lock"
  | "plus"
  | "upload"
  | "sparkle"
  | "settings"
  | "mail"
  | "cart"
  | "logout";

const PATHS: Record<IconName, React.ReactNode> = {
  home: (
    <path d="M3 10.5 12 3l9 7.5M5.5 9v10a1 1 0 0 0 1 1H10v-6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v6h3.5a1 1 0 0 0 1-1V9" />
  ),
  calendar: (
    <>
      <rect x="3.5" y="5" width="17" height="16" rx="2.5" />
      <path d="M3.5 9.5h17M8 3v4M16 3v4" />
    </>
  ),
  bookmark: <path d="M6 3.5h12a1 1 0 0 1 1 1V21l-7-4.5L5 21V4.5a1 1 0 0 1 1-1Z" />,
  list: (
    <>
      <path d="M9 6h11M9 12h11M9 18h11" />
      <circle cx="4.5" cy="6" r="1.4" />
      <circle cx="4.5" cy="12" r="1.4" />
      <circle cx="4.5" cy="18" r="1.4" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" />
    </>
  ),
  camera: (
    <>
      <path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h2l1.2-2h6.6l1.2 2h2A1.5 1.5 0 0 1 20 8.5v10A1.5 1.5 0 0 1 18.5 20h-13A1.5 1.5 0 0 1 4 18.5Z" />
      <circle cx="12" cy="13" r="3.6" />
    </>
  ),
  chevronLeft: <path d="M14.5 6 8 12.5 14.5 19" />,
  x: <path d="M6 6l12 12M18 6 6 18" />,
  check: <path d="M4.5 12.5 9.5 17.5 19.5 6.5" />,
  thumbsUp: (
    <path d="M7 11v9H4.5A1.5 1.5 0 0 1 3 18.5v-6A1.5 1.5 0 0 1 4.5 11H7Zm0 0 3.6-6.9a1.5 1.5 0 0 1 2 .6 3 3 0 0 1 .2 2.3L11.9 10H18a2 2 0 0 1 2 2.3l-1.2 6A2 2 0 0 1 16.8 20H10a3 3 0 0 1-3-3v-6Z" />
  ),
  thumbsDown: (
    <path d="M17 13V4h2.5A1.5 1.5 0 0 1 21 5.5v6a1.5 1.5 0 0 1-1.5 1.5H17Zm0 0-3.6 6.9a1.5 1.5 0 0 1-2-.6 3 3 0 0 1-.2-2.3l1-3H6a2 2 0 0 1-2-2.3l1.2-6A2 2 0 0 1 7.2 4H14a3 3 0 0 1 3 3v6Z" />
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="10.5" width="14" height="9.5" rx="2" />
      <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  upload: (
    <>
      <path d="M12 15.5V4M7.5 8.5 12 4l4.5 4.5" />
      <path d="M4.5 15.5v3a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-3" />
    </>
  ),
  sparkle: (
    <path d="M12 3.5c.6 3 2 4.4 5 5-3 .6-4.4 2-5 5-.6-3-2-4.4-5-5 3-.6 4.4-2 5-5Z" />
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M12 3.5v2.2M12 18.3v2.2M20.5 12h-2.2M5.7 12H3.5M17.7 6.3l-1.5 1.5M7.8 16.2l-1.5 1.5M17.7 17.7l-1.5-1.5M7.8 7.8 6.3 6.3" />
    </>
  ),
  mail: (
    <>
      <rect x="3.5" y="5.5" width="17" height="13" rx="2" />
      <path d="M4.5 7l7.5 6 7.5-6" />
    </>
  ),
  cart: (
    <>
      <circle cx="10" cy="20" r="1.4" />
      <circle cx="18" cy="20" r="1.4" />
      <path d="M3 4h2l2.2 11.2a2 2 0 0 0 2 1.6h8.1a2 2 0 0 0 2-1.6L21 8H6" />
    </>
  ),
  logout: (
    <>
      <path d="M15 4.5H7a1.5 1.5 0 0 0-1.5 1.5v12A1.5 1.5 0 0 0 7 19.5h8" />
      <path d="M10.5 12H21m0 0-3-3m3 3-3 3" />
    </>
  ),
};

export function Icon({
  name,
  size = 21,
  strokeWidth = 1.7,
  className,
}: {
  name: IconName;
  size?: number;
  strokeWidth?: number;
  className?: string;
}) {
  const isFilled = name === "bookmark" || name === "sparkle";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={isFilled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {PATHS[name]}
    </svg>
  );
}
