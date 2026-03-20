interface Props {
  size?: number
  className?: string
}

export const SeedCollecting: React.FC<Props> = ({ size = 24, className }) => (
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
    {/* Open palm */}
    <path d="M6 16 Q4 14 5 11 L7 8 Q8 7 9 8 L9 11" />
    <path d="M9 11 L10 7 Q11 6 12 7 L12 11" />
    <path d="M12 11 L12.5 7.5 Q13.5 6.5 14.5 7.5 L14 11" />
    <path d="M14 11 L14 9 Q15 8 16 9 L15.5 12" />
    {/* Palm curve */}
    <path d="M6 16 Q8 19 12 18 Q16 17 15.5 12" />
    {/* Seeds */}
    <ellipse cx="9" cy="14" rx="0.8" ry="1.2" />
    <ellipse cx="12" cy="13.5" rx="0.8" ry="1.2" />
    <ellipse cx="11" cy="15.5" rx="0.8" ry="1.2" />
    {/* Falling seed */}
    <ellipse cx="18" cy="4" rx="0.8" ry="1.2" />
    <path d="M18 5.2 Q19 6 18.5 7" />
  </svg>
)
