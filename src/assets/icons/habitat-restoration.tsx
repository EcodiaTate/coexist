interface Props {
  size?: number
  className?: string
}

export const HabitatRestoration: React.FC<Props> = ({ size = 24, className }) => (
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
    {/* Ground/hill */}
    <path d="M2 20 Q7 14 12 18 Q17 14 22 20" />
    {/* Small plant left */}
    <line x1="6" y1="16" x2="6" y2="12" />
    <path d="M6 14 Q4 12 6 12" />
    <path d="M6 14 Q8 12 6 12" />
    {/* Tall plant center */}
    <line x1="12" y1="18" x2="12" y2="8" />
    <path d="M12 12 Q9 10 12 9" />
    <path d="M12 12 Q15 10 12 9" />
    <path d="M12 15 Q9.5 13 12 12" />
    <path d="M12 15 Q14.5 13 12 12" />
    {/* Small plant right */}
    <line x1="18" y1="16" x2="18" y2="12" />
    <path d="M18 14 Q16 12 18 12" />
    <path d="M18 14 Q20 12 18 12" />
    {/* Sun hint */}
    <circle cx="20" cy="4" r="2" />
  </svg>
)
