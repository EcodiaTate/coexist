interface Props {
  size?: number
  className?: string
}

export const WaterwayCleanup: React.FC<Props> = ({ size = 24, className }) => (
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
    {/* Water waves */}
    <path d="M2 18 Q5 16 8 18 Q11 20 14 18 Q17 16 20 18" />
    <path d="M2 22 Q5 20 8 22 Q11 24 14 22 Q17 20 20 22" />
    {/* Net handle */}
    <line x1="18" y1="14" x2="22" y2="4" />
    {/* Net hoop */}
    <circle cx="16" cy="12" r="4" />
    {/* Net mesh */}
    <path d="M14 14 L16 16" />
    <path d="M16 14 L16 16" />
    <path d="M18 14 L16 16" />
    {/* Debris in water */}
    <line x1="4" y1="15" x2="6" y2="15" />
    <line x1="5" y1="14" x2="5" y2="16" />
  </svg>
)
