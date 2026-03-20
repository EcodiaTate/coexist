interface Props {
  size?: number
  className?: string
}

export const WeedRemoval: React.FC<Props> = ({ size = 24, className }) => (
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
    {/* Weed stem */}
    <path d="M12 22 L12 10 Q12 7 10 5" />
    {/* Weed leaves */}
    <path d="M12 14 Q9 12 8 14" />
    <path d="M12 14 Q15 12 16 14" />
    <path d="M12 10 Q9 8 8 10" />
    <path d="M12 10 Q15 8 16 10" />
    {/* Roots exposed */}
    <path d="M12 22 Q10 21 9 22" />
    <path d="M12 22 Q14 21 15 22" />
    <path d="M12 22 Q12 21 11 23" />
    {/* Upward arrow (being pulled) */}
    <line x1="12" y1="5" x2="12" y2="1" />
    <polyline points="9 3 12 1 15 3" />
    {/* Hand grip lines */}
    <line x1="9" y1="6" x2="15" y2="6" />
    <line x1="9.5" y1="8" x2="14.5" y2="8" />
  </svg>
)
