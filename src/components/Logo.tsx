export function Logo({ size = 38 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 38 38" aria-hidden="true">
      <defs>
        <linearGradient id="glg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#5D7BFF" />
          <stop offset="1" stopColor="#2F4EFF" />
        </linearGradient>
      </defs>
      <rect width="38" height="38" rx="12" fill="url(#glg)" />
      <g fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M13 9h8l5 5v8" />
        <path d="M13 9a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h5" />
        <path d="M15 15h5M15 19h3" />
        <circle cx="24.5" cy="25.5" r="4" />
        <path d="M27.5 28.5l2.5 2.5" />
      </g>
    </svg>
  );
}
