const base = {
  width: 24,
  height: 24,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
  focusable: false,
};

export function CameraIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M4 8h3l1.5-2h7L17 8h3v11H4z" />
      <circle cx="12" cy="13" r="3.5" />
    </svg>
  );
}
export function SwapIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M4 8h14m0 0-3-3m3 3-3 3M20 16H6m0 0 3-3m-3 3 3 3" />
    </svg>
  );
}
export function GridIcon(props) {
  return (
    <svg {...base} {...props}>
      <rect x="4" y="4" width="7" height="7" rx="1.5" />
      <rect x="13" y="4" width="7" height="7" rx="1.5" />
      <rect x="4" y="13" width="7" height="7" rx="1.5" />
      <rect x="13" y="13" width="7" height="7" rx="1.5" />
    </svg>
  );
}
export function BagIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M5 8h14l-1 12H6z" />
      <path d="M9 8V6a3 3 0 0 1 6 0v2" />
    </svg>
  );
}
export function MenuIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}
export function CloseIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}
export function ArrowLeftIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M15 5l-7 7 7 7" />
    </svg>
  );
}
export function ArrowRightIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M9 5l7 7-7 7" />
    </svg>
  );
}

export function EyeIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M2 12s3.5-6.5 10-6.5S22 12 22 12s-3.5 6.5-10 6.5S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function EyeOffIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M3 3l18 18" />
      <path d="M10.6 5.6A10.7 10.7 0 0 1 12 5.5C18.5 5.5 22 12 22 12a17.7 17.7 0 0 1-3.3 4.1M6.5 6.8A17.2 17.2 0 0 0 2 12s3.5 6.5 10 6.5c1.5 0 2.8-.3 4-.8" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    </svg>
  );
}

export function PersonIcon(props) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="7" r="3" />
      <path d="M9 21v-6.5L7.5 11M15 21v-6.5l1.5-3.5M9 11h6M9 21h6" />
    </svg>
  );
}

export function AlertIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M12 4 2.5 20h19z" />
      <path d="M12 10v4.5M12 17.5v.01" />
    </svg>
  );
}
