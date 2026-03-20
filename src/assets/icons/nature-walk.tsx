interface Props {
  size?: number
  className?: string
}

export const NatureWalk: React.FC<Props> = ({ size = 24, className }) => (
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
    {/* Path */}
    <path d="M4 22 Q8 18 10 14 Q12 10 16 8 Q18 6 20 2" />
    {/* Footprint 1 */}
    <ellipse cx="7" cy="18" rx="1.2" ry="2" />
    <circle cx="7" cy="15.2" r="0.6" />
    {/* Footprint 2 */}
    <ellipse cx="11" cy="12" rx="1.2" ry="2" />
    <circle cx="11" cy="9.2" r="0.6" />
    {/* Leaf */}
    <path d="M17 12 Q20 9 19 6 Q16 7 17 12" />
    <path d="M17.8 9.5 L18.5 7" />
  </svg>
)
