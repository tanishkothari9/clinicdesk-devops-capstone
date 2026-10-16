const svgProps = {
  width: 18,
  height: 18,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
  focusable: 'false',
};

const icon = (paths) => {
  const Icon = (props) => (
    <svg {...svgProps} {...props}>
      {paths}
    </svg>
  );
  return Icon;
};

export const IconOverview = icon(
  <>
    <rect x="3" y="3" width="7.5" height="9" rx="1.8" />
    <rect x="13.5" y="3" width="7.5" height="5.5" rx="1.8" />
    <rect x="13.5" y="11.5" width="7.5" height="9.5" rx="1.8" />
    <rect x="3" y="15" width="7.5" height="6" rx="1.8" />
  </>,
);
export const IconCalendar = icon(
  <>
    <rect x="3" y="4.5" width="18" height="16.5" rx="2.5" />
    <path d="M3 9.5h18M8 2.5v4M16 2.5v4" />
  </>,
);
export const IconStethoscope = icon(
  <>
    <path d="M5 3H4v5a5 5 0 0 0 10 0V3h-1" />
    <path d="M9 13v1.5a5.5 5.5 0 0 0 11 0V13" />
    <circle cx="20" cy="11" r="2" />
  </>,
);
export const IconPlus = icon(<path d="M12 5v14M5 12h14" />);
export const IconTrash = icon(
  <>
    <path d="M4 7h16M10 11v6M14 11v6" />
    <path d="M6 7l1 13h10l1-13M9 7V4h6v3" />
  </>,
);
export const IconMenu = icon(<path d="M4 7h16M4 12h16M4 17h16" />);
export const IconClose = icon(<path d="M6 6l12 12M18 6L6 18" />);
export const IconAlert = icon(
  <>
    <path d="M10.3 3.9L2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
    <path d="M12 9.5v4.5M12 17.5v.01" />
  </>,
);
export const IconRefresh = icon(
  <>
    <path d="M20 11a8 8 0 0 0-14.8-3.8M4 3.5v4h4" />
    <path d="M4 13a8 8 0 0 0 14.8 3.8M20 20.5v-4h-4" />
  </>,
);
export const IconClock = icon(
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </>,
);
export const IconTrend = icon(
  <>
    <path d="M3 17l6-6 4 4 8-8" />
    <path d="M15 7h6v6" />
  </>,
);
export const IconCheck = icon(<path d="M5 12.5l4.5 4.5L19 7.5" />);
export const IconCircleX = icon(
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M9 9l6 6M15 9l-6 6" />
  </>,
);
export const IconDoor = icon(
  <>
    <path d="M5 21V4.5A1.5 1.5 0 0 1 6.5 3h11A1.5 1.5 0 0 1 19 4.5V21" />
    <path d="M3 21h18M15 12v.01" />
  </>,
);
export const IconMail = icon(
  <>
    <rect x="3" y="5" width="18" height="14" rx="2.5" />
    <path d="M3.5 6.5l8.5 6.5 8.5-6.5" />
  </>,
);
export const IconSearch = icon(
  <>
    <circle cx="11" cy="11" r="7" />
    <path d="M20 20l-3.5-3.5" />
  </>,
);
export const IconUsers = icon(
  <>
    <circle cx="9" cy="8" r="3.5" />
    <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
    <path d="M16 4.5a3.5 3.5 0 0 1 0 7M18.5 14.5A6.5 6.5 0 0 1 21.5 20" />
  </>,
);

export const Logo = () => (
  <svg width="34" height="34" viewBox="0 0 32 32" aria-hidden="true" focusable="false">
    <defs>
      <linearGradient id="clinicdesk-logo" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor="#2bb5a5" />
        <stop offset="1" stopColor="#0b6b63" />
      </linearGradient>
    </defs>
    <rect width="32" height="32" rx="9" fill="url(#clinicdesk-logo)" />
    <path d="M13 7.5h6v5.5h5.5v6H19v5.5h-6V19H7.5v-6H13z" fill="#fff" />
  </svg>
);
