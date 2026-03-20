interface Props {
  size?: number
  className?: string
}

export const WildlifeSurvey: React.FC<Props> = ({ size = 24, className }) => (
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
    {/* Binocular left lens */}
    <circle cx="7" cy="14" r="4" />
    {/* Binocular right lens */}
    <circle cx="17" cy="14" r="4" />
    {/* Bridge */}
    <path d="M11 12 Q12 10 13 12" />
    {/* Eyepieces */}
    <line x1="7" y1="10" x2="7" y2="8" />
    <line x1="17" y1="10" x2="17" y2="8" />
    {/* Bird */}
    <path d="M3 4 Q5 2 7 4" />
    <path d="M5 4 L5 5.5" />
    <line x1="4" y1="4.5" x2="6" y2="4.5" />
  </svg>
)
