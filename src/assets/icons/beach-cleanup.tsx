interface Props {
  size?: number
  className?: string
}

export const BeachCleanup: React.FC<Props> = ({ size = 24, className }) => (
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
    {/* Wave */}
    <path d="M2 16 Q5 13 8 16 Q11 19 14 16" />
    {/* Trash bag */}
    <path d="M17 8 L15 16 L21 16 L19 8 Z" />
    {/* Bag tie */}
    <path d="M16.5 8 Q18 6 19.5 8" />
    {/* Hand reaching */}
    <path d="M8 10 L13 8 L14 10" />
    <line x1="8" y1="10" x2="6" y2="12" />
    {/* Fingers */}
    <path d="M13 8 L12 6" />
    <path d="M14 10 L13.5 7.5" />
  </svg>
)
