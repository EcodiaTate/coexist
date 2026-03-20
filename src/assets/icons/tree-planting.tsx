interface Props {
  size?: number
  className?: string
}

export const TreePlanting: React.FC<Props> = ({ size = 24, className }) => (
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
    {/* Trunk */}
    <line x1="12" y1="22" x2="12" y2="10" />
    {/* Canopy */}
    <path d="M12 3 L7 10 L10 10 L6 14 L18 14 L14 10 L17 10 Z" />
    {/* Roots */}
    <path d="M12 22 Q9 20 7 22" />
    <path d="M12 22 Q15 20 17 22" />
    {/* Soil line */}
    <line x1="5" y1="22" x2="19" y2="22" />
  </svg>
)
