interface Props {
  size?: number
  className?: string
}

export const CommunityGarden: React.FC<Props> = ({ size = 24, className }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    {/* Garden bed / fence */}
    <rect x="2" y="18" width="20" height="4" rx="1" />
    {/* Plant 1 — flower */}
    <line x1="6" y1="18" x2="6" y2="12" />
    <circle cx="6" cy="10.5" r="1.5" />
    <path d="M6 9 L6 8" />
    {/* Plant 2 — tall leaf */}
    <line x1="12" y1="18" x2="12" y2="8" />
    <path d="M12 12 Q10 10 12 9" />
    <path d="M12 12 Q14 10 12 9" />
    <path d="M12 15 Q10 13 12 12" />
    <path d="M12 15 Q14 13 12 12" />
    {/* Plant 3 — round bush */}
    <line x1="18" y1="18" x2="18" y2="14" />
    <ellipse cx="18" cy="12" rx="2.5" ry="2" />
    {/* Sun rays */}
    <line x1="2" y1="4" x2="3" y2="5" />
    <line x1="5" y1="3" x2="5" y2="4.5" />
    <line x1="8" y1="4" x2="7" y2="5" />
  </svg>
)
