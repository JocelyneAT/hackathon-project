import type { ButtonHTMLAttributes, ReactNode } from "react";
export function Icon({ name, size = 20 }: { name: string; size?: number }) {
  const paths: Record<string, ReactNode> = {
    profile: (
      <>
        <circle cx="12" cy="8" r="3.2" />
        <path d="M5 21v-2a7 7 0 0 1 14 0v2" />
      </>
    ),
    career: (
      <>
        <rect x="3" y="7" width="18" height="14" rx="2" />
        <path d="M8 7V3h8v4M3 12h18M10 12v3h4v-3" />
      </>
    ),
    roadmap: (
      <>
        <path d="M4 4h6v6H4zM14 14h6v6h-6zM7 10v7h7M14 4h6M17 1v6" />
      </>
    ),
    employer: (
      <>
        <path d="M4 21V5l8-3v19M12 9h8v12M2 21h20M7 7h2M7 11h2M7 15h2M16 12h1M16 16h1" />
      </>
    ),
    insights: (
      <>
        <path d="M4 3v18h18M8 16v-5M13 16V6M18 16v-8" />
      </>
    ),
    arrow: <path d="m9 5 7 7-7 7M4 12h12" />,
    check: <path d="m5 12 4 4L19 6" />,
    upload: (
      <>
        <path d="M12 16V3m-5 5 5-5 5 5M4 15v6h16v-6" />
      </>
    ),
    info: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 11v6M12 7v1" />
      </>
    ),
    link: (
      <>
        <path d="M10 4H4v16h16v-6M14 3h7v7M21 3 10 14" />
      </>
    ),
    book: (
      <>
        <path d="M12 5v16M3 3c4-1 7 0 9 2 2-2 5-3 9-2v16c-4-1-7 0-9 2-2-2-5-3-9-2z" />
      </>
    ),
    close: <path d="m6 6 12 12M6 18 18 6" />,
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name] || paths.info}
    </svg>
  );
}
export function Button({
  children,
  primary = false,
  small = false,
  className = "",
  onClick,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  primary?: boolean;
  small?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`button ${primary ? "primary" : ""} ${small ? "small" : ""} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
export function Panel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <section className={`panel ${className}`}>{children}</section>;
}
export function Tag({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: string;
}) {
  return <span className={`tag ${tone}`}>{children}</span>;
}
export function Field({
  label,
  htmlFor,
  children,
  hint,
}: {
  label: string;
  htmlFor: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <div className="field">
      <label htmlFor={htmlFor}>{label}</label>
      {children}
      {hint && <span className="hint">{hint}</span>}
    </div>
  );
}
export function Note({
  children,
  title,
}: {
  children: ReactNode;
  title?: string;
}) {
  return (
    <div className="note">
      <Icon name="info" />
      <div>
        {title && <strong>{title}</strong>}
        <div>{children}</div>
      </div>
    </div>
  );
}
export function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="empty">
      <Icon name="info" size={26} />
      <p>{children}</p>
    </div>
  );
}
export function List({
  items,
  empty = "Nothing added yet.",
}: {
  items: string[];
  empty?: string;
}) {
  return items.length ? (
    <ul className="simple-list">
      {items.map((item, i) => (
        <li key={`${item}-${i}`}>{item}</li>
      ))}
    </ul>
  ) : (
    <p className="hint">{empty}</p>
  );
}
